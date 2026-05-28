import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import prisma from '../lib/prisma';
import { decrypt } from '../lib/encryption';
import { io } from '../index';

interface CampaignJobData {
  broadcastId: string;
  sessionId: string;
  userId: string;
  recipient: string;
  recipientName?: string;
  text: string;
  templateName?: string;
  templateLanguage?: string;
}

function getTemplateParameters(templateName: string, recipientName: string): any[] {
  const name = recipientName || 'Customer';
  switch (templateName) {
    case '3p_direct_integration_test_template':
      return [];
    case 'eid_mubarak_marketing':
      return [
        { type: 'text', text: name },
        { type: 'text', text: 'vexo.link/deal' }
      ];
    case 'order_confirmation_utility':
      return [
        { type: 'text', text: name }
      ];
    case 'otp_verification_auth':
      return [
        { type: 'text', text: '5849' }
      ];
    case 'black_friday_promo':
      return [
        { type: 'text', text: name },
        { type: 'text', text: 'vexo.link/deal' }
      ];
    default:
      if (templateName.toLowerCase().includes('test')) {
        return [];
      }
      return [
        { type: 'text', text: name }
      ];
  }
}

// 1. Initialize the Broadcast Queue
export const broadcastQueue = new Queue<CampaignJobData>('broadcast-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 10000, // Wait 10s, then 20s, then 40s
    },
  },
});

// 2. Initialize the Worker to process queue items
export const broadcastWorker = new Worker<CampaignJobData>(
  'broadcast-queue',
  async (job: Job<CampaignJobData>) => {
    const { broadcastId, sessionId, userId, recipient, recipientName, text, templateName, templateLanguage } = job.data;

    console.log(`[Queue Worker] Processing job ${job.id} for broadcast ${broadcastId} to ${recipient}`);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || !user.apiAccessToken || !user.apiPhoneNumberId) {
        throw new Error(`Meta Cloud API credentials not configured for user ${userId}`);
      }

      const decryptedToken = decrypt(user.apiAccessToken);
      const url = `https://graph.facebook.com/v21.0/${user.apiPhoneNumberId}/messages`;

      let requestBody: any;
      if (templateName) {
        const params = getTemplateParameters(templateName, recipientName || '');
        requestBody = {
          messaging_product: 'whatsapp',
          to: recipient.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage || 'en_US' }
          }
        };
        if (params.length > 0) {
          requestBody.template.components = [
            {
              type: 'body',
              parameters: params
            }
          ];
        }
      } else {
        requestBody = {
          messaging_product: 'whatsapp',
          to: recipient.replace(/\D/g, ''),
          type: 'text',
          text: { body: text },
        };
      }
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as any;
        throw new Error(errBody.error?.message || 'Meta Cloud API request failed');
      }

      const data = (await res.json()) as any;
      const whatsappId = data.messages?.[0]?.id || null;

      // Ensure contact is saved and isBotPaused is explicitly set to false
      await prisma.contact.upsert({
        where: { userId_phone: { userId, phone: recipient } },
        update: { isBotPaused: false },
        create: {
          userId,
          phone: recipient,
          name: recipientName || `WhatsApp Lead (${recipient.slice(-4)})`,
          channel: 'WHATSAPP',
          isBotPaused: false
        }
      });

      // Log success in DB
      await prisma.message.create({
        data: {
          userId,
          sessionId: 'API',
          from: 'Broadcast',
          to: recipient,
          body: text,
          direction: 'OUTGOING',
          type: 'TEXT',
          whatsappId,
        },
      });

      io.to(userId).emit('whatsapp:message', {
        sessionId: 'API',
        from: 'Broadcast',
        to: recipient,
        body: text,
        direction: 'OUTGOING',
        channel: 'WHATSAPP',
        createdAt: new Date(),
      });

      // Update Campaign metrics
      await prisma.campaign.update({
        where: { id: broadcastId },
        data: {
          totalSent: { increment: 1 },
        },
      });

      // Update CampaignLog
      await prisma.campaignLog.updateMany({
        where: { campaignId: broadcastId, phone: recipient },
        data: { status: 'SENT', sentAt: new Date() }
      });

      // Introduce a 5-10 second random delay to prevent WhatsApp SPAM detection
      const delayMs = Math.floor(Math.random() * 5000) + 5000;
      console.log(`[Queue Worker] Message sent to ${recipient}. Waiting ${delayMs / 1000}s before next...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

    } catch (error: any) {
      console.error(`[Queue Worker] Failed to send message to ${recipient}:`, error);

      // Update Campaign failure metrics
      await prisma.campaign.update({
        where: { id: broadcastId },
        data: {
          totalFailed: { increment: 1 },
        },
      });

      // Update CampaignLog
      await prisma.campaignLog.updateMany({
        where: { campaignId: broadcastId, phone: recipient },
        data: { status: 'FAILED', errorMessage: error.message || 'Unknown error' }
      });

      throw error; // Re-throw so BullMQ handles retry backoff
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one message at a time to ensure safety
  }
);

// Worker error handlers
broadcastWorker.on('failed', (job, err) => {
  console.error(`[Queue Worker] Job ${job?.id} failed:`, err.message);
});

broadcastWorker.on('completed', (job) => {
  console.log(`[Queue Worker] Job ${job.id} completed successfully.`);
});
