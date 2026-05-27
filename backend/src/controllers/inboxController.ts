import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { io } from '../index';
import { sendReplyUnified } from '../services/messagingService';

// Fetch inbox contacts based on workspace and role permissions
export async function getInboxContacts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;
  const role = req.user?.role;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    // Determine contact filtering based on Agent or Admin role
    const whereFilter: any = { userId: workspaceId };
    if (role === 'AGENT') {
      whereFilter.assignedTo = userId;
    }

    // Fetch contacts ordered by latest update
    const contacts = await prisma.contact.findMany({
      where: whereFilter,
      orderBy: { updatedAt: 'desc' },
    });

    if (contacts.length === 0) return res.json([]);

    const phones = contacts.map((c) => c.phone);

    // Get last message per phone (INCOMING or OUTGOING)
    const lastMessages = await prisma.message.findMany({
      where: {
        userId: workspaceId,
        OR: [
          { from: { in: phones } },
          { to: { in: phones } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build a map: phone -> last message
    const lastMessageMap: Record<string, { body: string; createdAt: Date; direction: string }> = {};
    for (const msg of lastMessages) {
      const phone = phones.find((p) => p === msg.from || p === msg.to);
      if (phone && !lastMessageMap[phone]) {
        lastMessageMap[phone] = {
          body: msg.body,
          createdAt: msg.createdAt,
          direction: msg.direction,
        };
      }
    }

    const result = contacts.map((contact) => ({
      phone: contact.phone,
      name: contact.name || contact.phone,
      tags: contact.tags,
      assignedTo: contact.assignedTo,
      channel: contact.channel,
      isBotPaused: contact.isBotPaused,
      lastMessage: lastMessageMap[contact.phone]?.body || null,
      lastMessageTime: lastMessageMap[contact.phone]?.createdAt || contact.updatedAt,
      lastMessageDirection: lastMessageMap[contact.phone]?.direction || null,
    }));

    // Sort by last message time descending
    result.sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    res.json(result);
  } catch (error: any) {
    console.error('Inbox contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox contacts.' });
  }
}

// Fetch message history for a phone number
export async function getInboxMessages(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;
  const role = req.user?.role;
  const phone = req.params.phone as string;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  try {
    // Security check: Agents can only load messages of contacts assigned to them
    if (role === 'AGENT') {
      const contact = await prisma.contact.findFirst({
        where: { userId: workspaceId, phone, assignedTo: userId },
      });
      if (!contact) {
        return res.status(403).json({ error: 'Access denied: Conversation is not assigned to you.' });
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        userId: workspaceId,
        OR: [{ from: phone }, { to: phone }],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json(messages);
  } catch (error: any) {
    console.error('Inbox messages error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox messages.' });
  }
}

/**
 * POST /api/inbox/assign
 * Assign a WhatsApp/Web conversation to an agent (or set to null to unassign)
 * Body: { phone, agentId }
 */
export async function assignConversation(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });

  const { phone, agentId } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  try {
    // If agentId is provided, verify they belong to this workspace
    if (agentId) {
      const agentUser = await prisma.user.findFirst({
        where: {
          id: agentId,
          OR: [{ id: workspaceId }, { parentId: workspaceId }],
        },
      });
      if (!agentUser) {
        return res.status(400).json({ error: 'Invalid agent for this workspace.' });
      }
    }

    // Upsert the Contact record to ensure it exists, and update its assignedTo status
    const contact = await prisma.contact.upsert({
      where: { userId_phone: { userId: workspaceId, phone } },
      update: { assignedTo: agentId || null },
      create: {
        userId: workspaceId,
        phone,
        name: phone,
        assignedTo: agentId || null,
      },
    });

    // Notify all agents in this workspace via Socket.io
    io.to(workspaceId).emit('inbox:assigned', {
      phone,
      channel: contact.channel,
      assignedTo: agentId || null,
    });

    res.json({ success: true, contact });
  } catch (error: any) {
    console.error('Assign conversation error:', error);
    res.status(500).json({ error: 'Failed to assign conversation.' });
  }
}

/**
 * POST /api/inbox/takeover
 * Toggle the chatbot pause/takeover state for a contact
 * Body: { phone, pause: boolean }
 */
export async function toggleBotTakeover(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });

  const { phone, pause } = req.body;
  if (!phone || typeof pause !== 'boolean') {
    return res.status(400).json({ error: 'Phone and pause (boolean) are required.' });
  }

  try {
    const contact = await prisma.contact.upsert({
      where: { userId_phone: { userId: workspaceId, phone } },
      update: { isBotPaused: pause },
      create: {
        userId: workspaceId,
        phone,
        name: phone,
        isBotPaused: pause,
      },
    });

    // Notify all agents in this workspace via Socket.io
    io.to(workspaceId).emit('inbox:takeover', {
      phone,
      channel: contact.channel,
      isBotPaused: pause,
    });

    res.json({ success: true, isBotPaused: pause });
  } catch (error: any) {
    console.error('Bot takeover toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle bot takeover state.' });
  }
}

/**
 * POST /api/inbox/send
 * Unified message sender from the dashboard for all channels (WhatsApp, Web, Telegram)
 * Body: { to, channel, text, botId }
 */
export async function sendUnifiedInboxMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });

  const { to, channel, text, botId } = req.body;
  if (!to || !channel || !text) {
    return res.status(400).json({ error: 'to, channel and text are required.' });
  }

  try {
    if (channel === 'TELEGRAM') {
      if (!botId) return res.status(400).json({ error: 'botId is required for Telegram messages.' });
      const bot = await prisma.telegramBot.findFirst({
        where: { id: botId, userId: workspaceId, isActive: true },
      });
      if (!bot) return res.status(404).json({ error: 'Active bot not found.' });
      
      // Send reply
      await sendReplyUnified('TELEGRAM', to, text, workspaceId, bot.token);
      
      // Auto takeover: pause the bot
      await prisma.telegramContact.updateMany({
        where: { botId, chatId: to },
        data: { isBotPaused: true },
      });
      
      // Emit live takeover
      io.to(workspaceId).emit('telegram:takeover', { botId, chatId: to, isBotPaused: true });
    } else if (channel === 'WHATSAPP') {
      // Send reply
      await sendReplyUnified('WHATSAPP', to, text, workspaceId, 'API');
      
      // Auto takeover: pause the bot
      await prisma.contact.updateMany({
        where: { userId: workspaceId, phone: to },
        data: { isBotPaused: true },
      });
      
      // Emit live takeover
      io.to(workspaceId).emit('inbox:takeover', { phone: to, channel: 'WHATSAPP', isBotPaused: true });
    } else if (channel === 'WEB') {
      // Send reply
      await sendReplyUnified('WEB', to, text, workspaceId);
      
      // Auto takeover: pause the bot
      const contact = await prisma.contact.upsert({
        where: { userId_phone: { userId: workspaceId, phone: to } },
        update: { isBotPaused: true },
        create: {
          userId: workspaceId,
          phone: to,
          name: to,
          isBotPaused: true,
          channel: 'WEB',
        },
      });
      
      // Emit live takeover
      io.to(workspaceId).emit('inbox:takeover', { phone: to, channel: 'WEB', isBotPaused: true });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Send unified message error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
}
