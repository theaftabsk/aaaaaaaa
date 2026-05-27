import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { broadcastQueue } from '../services/queue';

// Fetch all broadcast campaigns for user
export async function getCampaigns(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns.' });
  }
}

// Create and trigger a new broadcast campaign
export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { name, messageBody, targetGroupIds, targetLabelIds, status, mediaUrl, mediaType, manualNumbers } = req.body;

  if (!name || !messageBody) {
    return res.status(400).json({ error: 'Name and message body are required.' });
  }

  try {
    // 1. Collect targets from Phonebook
    let targetContacts: any[] = [];
    if (targetGroupIds?.length > 0 || targetLabelIds?.length > 0) {
      targetContacts = await prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { groups: { some: { id: { in: targetGroupIds || [] } } } },
            { labels: { some: { id: { in: targetLabelIds || [] } } } }
          ]
        },
      });
    }

    // 2. Map target contacts to simplified array & add manual/CSV numbers
    let targets: { phone: string; name: string }[] = targetContacts.map(c => ({
      phone: c.phone,
      name: c.name || 'there'
    }));

    if (Array.isArray(manualNumbers) && manualNumbers.length > 0) {
      manualNumbers.forEach((num: string) => {
        const cleanedNum = num.trim().replace(/\D/g, '');
        if (cleanedNum && !targets.some(t => t.phone === cleanedNum)) {
          targets.push({
            phone: cleanedNum,
            name: 'Customer'
          });
        }
      });
    }

    // 3. Fallback: if no filters or manual numbers are applied, send to all contacts in database
    if (
      targets.length === 0 &&
      (!targetGroupIds || targetGroupIds.length === 0) &&
      (!targetLabelIds || targetLabelIds.length === 0) &&
      (!manualNumbers || manualNumbers.length === 0)
    ) {
      const allDbContacts = await prisma.contact.findMany({
        where: { userId },
      });
      targets = allDbContacts.map(c => ({
        phone: c.phone,
        name: c.name || 'there'
      }));
    }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'No target contacts found for this campaign.' });
    }

    // 4. Create the Campaign record
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        messageBody,
        status: status || 'PROCESSING',
        mediaUrl,
        mediaType,
        targetGroupIds: targetGroupIds || [],
        targetLabelIds: targetLabelIds || [],
        totalTarget: targets.length,
        totalSent: 0,
        totalFailed: 0,
      },
    });

    // 5. Enqueue jobs to BullMQ (Skip if DRAFT)
    const sessionId = 'API'; // Always use Cloud API
    if (campaign.status === 'PROCESSING') {
      for (const target of targets) {
        // Create initial log
        await prisma.campaignLog.create({
          data: {
            campaignId: campaign.id,
            phone: target.phone,
            status: 'PENDING'
          }
        });

        await broadcastQueue.add(`campaign-${campaign.id}-${target.phone}`, {
          broadcastId: campaign.id,
          sessionId,
          userId,
          recipient: target.phone,
          text: messageBody.replace(/\{\{name\}\}/g, target.name),
        });
      }
    }

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create and queue campaign.' });
  }
}

// Delete a broadcast campaign from history
export async function deleteCampaign(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const campaign = await prisma.campaign.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (campaign.count === 0) {
      return res.status(404).json({ error: 'Campaign not found or already deleted.' });
    }

    res.json({ message: 'Campaign deleted successfully.' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign.' });
  }
}

export async function getBroadcastStats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Sent Today
    const sentToday = await prisma.message.count({
      where: {
        userId,
        direction: 'OUTGOING',
        createdAt: { gte: todayStart }
      }
    });

    // 2. Delivered Rate
    const totalSentLogs = await prisma.message.count({
      where: {
        userId,
        direction: 'OUTGOING'
      }
    });

    const deliveredLogs = await prisma.message.count({
      where: {
        userId,
        direction: 'OUTGOING',
        status: { in: ['DELIVERED', 'READ'] }
      }
    });

    const deliveryRate = totalSentLogs > 0 ? (deliveredLogs / totalSentLogs) * 100 : 100;

    // 3. Total Contacts
    const totalContacts = await prisma.contact.count({
      where: { userId }
    });

    // 4. Countries Breakdown
    const contacts = await prisma.contact.findMany({
      where: { userId },
      select: { phone: true }
    });

    const countryCounts: Record<string, number> = {};
    contacts.forEach(contact => {
      const phone = contact.phone.replace(/\D/g, '');
      let country = 'Other';
      if (phone.startsWith('880')) country = 'Bangladesh';
      else if (phone.startsWith('91')) country = 'India';
      else if (phone.startsWith('92')) country = 'Pakistan';
      else if (phone.startsWith('1')) country = 'USA';
      else if (phone.startsWith('44')) country = 'UK';
      
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    const totalCalculated = contacts.length || 1;
    const countriesData = Object.entries(countryCounts).map(([name, count]) => {
      let code = 'Globe';
      let flag = '🌐';
      if (name === 'Bangladesh') { code = 'BD'; flag = '🇧🇩'; }
      else if (name === 'India') { code = 'IN'; flag = '🇮🇳'; }
      else if (name === 'Pakistan') { code = 'PK'; flag = '🇵🇰'; }
      else if (name === 'USA') { code = 'US'; flag = '🇺🇸'; }
      else if (name === 'UK') { code = 'GB'; flag = '🇬🇧'; }

      return {
        name,
        code,
        flag,
        count,
        percentage: parseFloat(((count / totalCalculated) * 100).toFixed(1))
      };
    }).sort((a, b) => b.count - a.count).slice(0, 3);

    res.json({
      sentToday,
      deliveryRate: parseFloat(deliveryRate.toFixed(1)),
      totalContacts,
      countriesData
    });

  } catch (error) {
    console.error('Fetch broadcast stats error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcast stats.' });
  }
}



