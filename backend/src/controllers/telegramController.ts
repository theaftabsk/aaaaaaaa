import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { io } from '../index';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function verifyTelegramToken(token: string): Promise<{ id: number; username: string; first_name: string } | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data: any = await res.json();
    if (data.ok && data.result) return data.result;
    return null;
  } catch { return null; }
}

async function registerTelegramWebhook(token: string, botId: string): Promise<{ ok: boolean; description?: string }> {
  const appUrl = process.env.APP_URL || 'http://localhost:5000';
  const webhookUrl = `${appUrl}/api/telegram/webhook/${botId}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data: any = await res.json();
    console.log(`[Telegram] Webhook set for bot ${botId}:`, data);
    return { ok: data.ok, description: data.description };
  } catch (err) {
    console.error(`[Telegram] Failed to set webhook for bot ${botId}:`, err);
    return { ok: false, description: 'Network error' };
  }
}

async function deleteTelegramWebhook(token: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' });
  } catch {}
}

// ─── BOTS ─────────────────────────────────────────────────────────────────────

export async function getBots(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const bots = await prisma.telegramBot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bots);
  } catch (err) {
    console.error('getBots error:', err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
}

export async function getBot(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id as string;
  try {
    const bot = await prisma.telegramBot.findFirst({
      where: { id, userId },
      include: {
        chatbotFlow: true
      }
    });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(bot);
  } catch (err) {
    console.error('getBot error:', err);
    res.status(500).json({ error: 'Failed to fetch bot details' });
  }
}

export async function createBot(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, token, description } = req.body;
  if (!name || !token) return res.status(400).json({ error: 'Name and token are required.' });

  const botInfo = await verifyTelegramToken(token);
  if (!botInfo) {
    return res.status(400).json({ error: 'Invalid Telegram bot token. Please check it in @BotFather.' });
  }

  try {
    const bot = await prisma.telegramBot.create({
      data: {
        userId,
        name,
        token,
        username: botInfo.username || '',
        description: description || botInfo.first_name || '',
        isActive: true,
      },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const webhookUrl = `${appUrl}/api/telegram/webhook/${bot.id}`;
    const webhookResult = await registerTelegramWebhook(token, bot.id);

    const updatedBot = await prisma.telegramBot.update({
      where: { id: bot.id },
      data: { webhookUrl },
    });

    return res.status(201).json({
      ...updatedBot,
      webhookRegistered: webhookResult.ok,
      webhookMessage: webhookResult.ok
        ? `✅ Webhook registered! Your bot @${botInfo.username} is now live.`
        : `⚠️ Bot saved but webhook could not be set: ${webhookResult.description}. Make sure APP_URL points to a public URL.`,
    });
  } catch (err) {
    console.error('createBot error:', err);
    res.status(500).json({ error: 'Failed to create bot' });
  }
}

export async function updateBot(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const id = req.params.id as string;
  const { name, token, username, webhookUrl, description, isActive, chatbotFlowId, aiActive, aiResponseLimit, aiResponseCount } = req.body;

  try {
    const existing = await prisma.telegramBot.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Bot not found' });

    let resolvedUsername = username;
    let webhookRegistered = false;
    let webhookMessage = '';
    let newWebhookUrl = webhookUrl;

    if (token && token !== existing.token) {
      const botInfo = await verifyTelegramToken(token);
      if (!botInfo) return res.status(400).json({ error: 'Invalid Telegram bot token.' });
      resolvedUsername = botInfo.username;
      await deleteTelegramWebhook(existing.token);
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      newWebhookUrl = `${appUrl}/api/telegram/webhook/${id}`;
      const webhookResult = await registerTelegramWebhook(token, id);
      webhookRegistered = webhookResult.ok;
      webhookMessage = webhookResult.ok
        ? `✅ Webhook re-registered for @${resolvedUsername}`
        : `⚠️ Webhook update failed: ${webhookResult.description}`;
    }

    if (isActive === false && existing.isActive === true) {
      await deleteTelegramWebhook(existing.token);
      newWebhookUrl = '';
      webhookMessage = 'Bot deactivated. Webhook removed.';
    } else if (isActive === true && existing.isActive === false) {
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      newWebhookUrl = `${appUrl}/api/telegram/webhook/${id}`;
      const webhookResult = await registerTelegramWebhook(existing.token, id);
      webhookRegistered = webhookResult.ok;
      webhookMessage = webhookResult.ok ? '✅ Bot reactivated and webhook restored.' : `⚠️ Webhook restore failed: ${webhookResult.description}`;
    }

    const bot = await prisma.telegramBot.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        token: token ?? existing.token,
        username: resolvedUsername ?? existing.username,
        webhookUrl: newWebhookUrl ?? existing.webhookUrl,
        description: description ?? existing.description,
        isActive: isActive ?? existing.isActive,
        chatbotFlowId: chatbotFlowId !== undefined ? (chatbotFlowId === '' ? null : chatbotFlowId) : existing.chatbotFlowId,
        aiActive: aiActive !== undefined ? aiActive : existing.aiActive,
        aiResponseLimit: aiResponseLimit !== undefined ? Number(aiResponseLimit) : existing.aiResponseLimit,
        aiResponseCount: aiResponseCount !== undefined ? Number(aiResponseCount) : existing.aiResponseCount,
      },
    });

    res.json({ ...bot, webhookRegistered, webhookMessage });
  } catch (err) {
    console.error('updateBot error:', err);
    res.status(500).json({ error: 'Failed to update bot' });
  }
}

export async function deleteBot(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id as string;
  try {
    const existing = await prisma.telegramBot.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Bot not found' });
    if (existing.token) await deleteTelegramWebhook(existing.token);
    await prisma.telegramBot.delete({ where: { id } });
    res.json({ message: 'Bot deleted and webhook removed.' });
  } catch (err) {
    console.error('deleteBot error:', err);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

export async function getNotes(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const notes = await prisma.telegramNote.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });
    res.json(notes);
  } catch (err) {
    console.error('getNotes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}

export async function createNote(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { title, content, color, pinned } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
  try {
    const note = await prisma.telegramNote.create({
      data: { userId, title, content, color: color || '#3B82F6', pinned: pinned || false },
    });
    res.status(201).json(note);
  } catch (err) {
    console.error('createNote error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
}

export async function updateNote(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id as string;
  const { title, content, color, pinned } = req.body;
  try {
    const existing = await prisma.telegramNote.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    const note = await prisma.telegramNote.update({
      where: { id },
      data: { title, content, color, pinned },
    });
    res.json(note);
  } catch (err) {
    console.error('updateNote error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
}

export async function deleteNote(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const id = req.params.id as string;
  try {
    const existing = await prisma.telegramNote.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    await prisma.telegramNote.delete({ where: { id } });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('deleteNote error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}

// ─── TELEGRAM INBOX ───────────────────────────────────────────────────────────

/**
 * GET /api/telegram/inbox/conversations?botId=xxx
 * Returns list of unique chat_ids with their last message and unread count.
 */
export async function getTelegramConversations(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;
  const role = req.user?.role;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized' });

  const { botId } = req.query as { botId?: string };

  try {
    // Build session prefix filter
    const sessionFilter = botId
      ? { startsWith: `TELEGRAM:${botId}` }
      : { startsWith: 'TELEGRAM:' };

    // Get all Telegram messages for this workspace
    const messages = await prisma.message.findMany({
      where: {
        userId: workspaceId,
        sessionId: sessionFilter,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by chatId
    const convMap = new Map<string, {
      chatId: string;
      botSessionId: string;
      lastMessage: string;
      lastMessageTime: Date;
      lastMessageDirection: string;
      unreadCount: number;
      displayName: string;
    }>();

    for (const msg of messages) {
      const chatId = msg.direction === 'INCOMING' ? msg.from : msg.to;
      if (!convMap.has(chatId)) {
        convMap.set(chatId, {
          chatId,
          botSessionId: msg.sessionId || "",
          lastMessage: msg.body,
          lastMessageTime: msg.createdAt,
          lastMessageDirection: msg.direction,
          unreadCount: msg.direction === 'INCOMING' ? 1 : 0,
          displayName: msg.direction === 'INCOMING' ? (msg.from || chatId) : chatId,
        });
      } else if (msg.direction === 'INCOMING') {
        convMap.get(chatId)!.unreadCount += 1;
      }
    }

    // Load TelegramContact details
    const chatIds = Array.from(convMap.keys());
    
    // Filter contacts by agent role if applicable
    const contactWhere: any = {
      userId: workspaceId,
      chatId: { in: chatIds },
      ...(botId ? { botId } : {}),
    };
    if (role === 'AGENT') {
      contactWhere.assignedTo = userId;
    }

    const contacts = await prisma.telegramContact.findMany({
      where: contactWhere,
    });

    const contactMap = new Map(contacts.map(c => [c.chatId, c]));

    const conversations = [];
    for (const [chatId, conv] of convMap.entries()) {
      const contact = contactMap.get(chatId);
      
      // If user is an AGENT, filter out conversations not assigned to them
      if (role === 'AGENT' && !contact) {
        continue;
      }

      conversations.push({
        ...conv,
        displayName: contact?.firstName
          ? `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}`
          : conv.chatId,
        username: contact?.username || null,
        label: contact?.label || null,
        assignedTo: contact?.assignedTo || null,
        isBotPaused: contact?.isBotPaused || false,
      });
    }

    // Sort by lastMessageTime desc
    conversations.sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    res.json(conversations);
  } catch (err) {
    console.error('getTelegramConversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

/**
 * GET /api/telegram/inbox/messages/:chatId?botId=xxx
 * Returns full message history for a specific Telegram chat.
 */
export async function getTelegramMessages(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;
  const role = req.user?.role;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized' });

  const chatId = req.params.chatId as string;
  const { botId } = req.query as { botId?: string };

  try {
    // Security check: Agents can only load messages of contacts assigned to them
    if (role === 'AGENT') {
      const contact = await prisma.telegramContact.findFirst({
        where: { userId: workspaceId, chatId, assignedTo: userId, ...(botId ? { botId } : {}) },
      });
      if (!contact) {
        return res.status(403).json({ error: 'Access denied: Conversation is not assigned to you.' });
      }
    }

    const sessionFilter = botId
      ? { startsWith: `TELEGRAM:${botId}` }
      : { startsWith: 'TELEGRAM:' };

    const messages = await prisma.message.findMany({
      where: {
        userId: workspaceId,
        sessionId: sessionFilter,
        OR: [
          { from: chatId },
          { to: chatId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (err) {
    console.error('getTelegramMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * POST /api/telegram/inbox/send
 * Send a message from the agent dashboard to a Telegram chat.
 * Body: { botId, chatId, text }
 */
export async function sendTelegramInboxMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized' });

  const { botId, chatId, text } = req.body;
  if (!botId || !chatId || !text) {
    return res.status(400).json({ error: 'botId, chatId and text are required.' });
  }

  try {
    const bot = await prisma.telegramBot.findFirst({
      where: { id: botId, userId: workspaceId, isActive: true },
    });
    if (!bot) return res.status(404).json({ error: 'Active bot not found.' });

    // Send via Telegram API
    const tgRes = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });

    if (!tgRes.ok) {
      const err = await tgRes.json().catch(() => ({}));
      console.error('[Telegram Inbox Send] API error:', err);
      return res.status(502).json({ error: 'Telegram API rejected the message.' });
    }

    const tgData: any = await tgRes.json();
    const msgId = tgData.result?.message_id?.toString() || null;

    // Save to DB
    const saved = await prisma.message.create({
      data: {
        userId: workspaceId,
        sessionId: `TELEGRAM:${botId}`,
        from: 'Bot',
        to: chatId,
        body: text,
        direction: 'OUTGOING',
        type: 'TEXT',
        channel: 'TELEGRAM', // Use TELEGRAM channel as scalable architecture
        whatsappId: msgId,
      },
    });

    // Auto takeover: Pause bot automatically on manual agent reply
    await prisma.telegramContact.updateMany({
      where: { botId, chatId },
      data: { isBotPaused: true },
    });

    // Emit via socket so all agents see the sent message live
    io.to(workspaceId).emit('telegram:message', {
      botId,
      chatId,
      from: 'Bot',
      body: text,
      direction: 'OUTGOING',
      createdAt: saved.createdAt,
      id: saved.id,
    });

    // Emit takeover event to frontend
    io.to(workspaceId).emit('telegram:takeover', {
      botId,
      chatId,
      isBotPaused: true,
    });

    res.json({ success: true, message: saved });
  } catch (err) {
    console.error('sendTelegramInboxMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * POST /api/telegram/inbox/assign
 * Assign a Telegram conversation to an agent (or set to null to unassign)
 * Body: { botId, chatId, agentId }
 */
export async function assignTelegramConversation(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized' });

  const { botId, chatId, agentId } = req.body;
  if (!botId || !chatId) {
    return res.status(400).json({ error: 'botId and chatId are required.' });
  }

  try {
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

    // Upsert the TelegramContact record to ensure it exists, and update its assignedTo status
    const contact = await prisma.telegramContact.upsert({
      where: { botId_chatId: { botId, chatId } },
      update: { assignedTo: agentId || null },
      create: {
        userId: workspaceId,
        botId,
        chatId,
        assignedTo: agentId || null,
      },
    });

    // Notify all agents in this workspace via Socket.io
    io.to(workspaceId).emit('telegram:assigned', {
      botId,
      chatId,
      assignedTo: agentId || null,
    });

    res.json({ success: true, contact });
  } catch (error: any) {
    console.error('Assign Telegram conversation error:', error);
    res.status(500).json({ error: 'Failed to assign conversation.' });
  }
}

/**
 * POST /api/telegram/inbox/takeover
 * Toggle the chatbot pause/takeover state for a Telegram contact
 * Body: { botId, chatId, pause: boolean }
 */
export async function toggleTelegramBotTakeover(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.user?.workspaceId;

  if (!userId || !workspaceId) return res.status(401).json({ error: 'Unauthorized.' });

  const { botId, chatId, pause } = req.body;
  if (!botId || !chatId || typeof pause !== 'boolean') {
    return res.status(400).json({ error: 'botId, chatId and pause (boolean) are required.' });
  }

  try {
    const contact = await prisma.telegramContact.upsert({
      where: { botId_chatId: { botId, chatId } },
      update: { isBotPaused: pause },
      create: {
        userId: workspaceId,
        botId,
        chatId,
        isBotPaused: pause,
      },
    });

    // Notify all agents in this workspace via Socket.io
    io.to(workspaceId).emit('telegram:takeover', {
      botId,
      chatId,
      isBotPaused: pause,
    });

    res.json({ success: true, isBotPaused: pause });
  } catch (error: any) {
    console.error('Telegram bot takeover toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle bot takeover state.' });
  }
}
