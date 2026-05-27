import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { io } from '../index';

export async function sendManualMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;
  const { to, text } = req.body;

  if (!userId || !workspaceId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!to || !text) {
    return res.status(400).json({ error: 'to and text are required.' });
  }

  try {
    // Save outgoing message to DB
    const message = await prisma.message.create({
      data: {
        userId: workspaceId,
        from: 'API',
        to,
        body: text,
        direction: 'OUTGOING',
        type: 'TEXT',
        sessionId: 'API',
        channel: 'WHATSAPP',
      },
    });

    // Auto takeover: pause the bot when an agent sends a manual reply
    const contact = await prisma.contact.upsert({
      where: { userId_phone: { userId: workspaceId, phone: to } },
      update: { isBotPaused: true },
      create: {
        userId: workspaceId,
        phone: to,
        name: to,
        isBotPaused: true,
        channel: 'WHATSAPP',
      },
    });

    // Emit live message socket event
    io.to(workspaceId).emit('whatsapp:message', {
      sessionId: 'API',
      from: 'Bot',
      to,
      body: text,
      direction: 'OUTGOING',
      channel: 'WHATSAPP',
      createdAt: message.createdAt,
      id: message.id,
    });

    // Emit live takeover socket event
    io.to(workspaceId).emit('inbox:takeover', {
      phone: to,
      channel: contact.channel,
      isBotPaused: true,
    });

    res.json({ message: 'Message sent via official Cloud API.', result: message });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message.' });
  }
}

export async function getSessions(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: workspaceId },
    });

    if (user && user.apiAccessToken && user.apiPhoneNumberId) {
      return res.json([
        {
          id: "api-session",
          sessionId: "API",
          name: `${user.whatsappBizName || 'WhatsApp Business'} (${user.apiPhoneNumberId})`,
          phone: user.apiPhoneNumberId,
          status: "CONNECTED"
        }
      ]);
    }

    res.json([]);
  } catch (error: any) {
    console.error('getSessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
}
