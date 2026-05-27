import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getBots, getBot, createBot, updateBot, deleteBot,
  getNotes, createNote, updateNote, deleteNote,
  getTelegramConversations, getTelegramMessages, sendTelegramInboxMessage,
  assignTelegramConversation, toggleTelegramBotTakeover
} from '../controllers/telegramController';
import prisma from '../lib/prisma';
import { processIncomingMessage } from '../services/flowEngine';
import { io } from '../index';

const router = Router();

// ─── PUBLIC: Telegram Webhook (called by Telegram servers, no auth) ───────────
router.post('/webhook/:botId', async (req, res) => {
  res.sendStatus(200); // Always acknowledge immediately

  try {
    const { botId } = req.params;
    const update = req.body;

    const message = update?.message;
    if (!message || !message.text) return;

    const chatId   = String(message.chat.id);
    const text     = message.text;
    const fromUser = message.from;

    // Look up the bot and its owner
    const bot = await prisma.telegramBot.findFirst({
      where: { id: botId, isActive: true },
    });
    if (!bot) return;

    // ── Upsert TelegramContact (save/update Telegram user info) ──────────────
    await prisma.telegramContact.upsert({
      where: { botId_chatId: { botId, chatId } },
      update: {
        username:  fromUser?.username  || undefined,
        firstName: fromUser?.first_name || undefined,
        lastName:  fromUser?.last_name  || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId:    bot.userId,
        botId,
        chatId,
        username:  fromUser?.username   || null,
        firstName: fromUser?.first_name || null,
        lastName:  fromUser?.last_name  || null,
      },
    });

    // ── Save incoming message to DB ───────────────────────────────────────────
    const saved = await prisma.message.create({
      data: {
        userId:    bot.userId,
        sessionId: `TELEGRAM:${botId}`,
        from:      chatId,
        to:        'Bot',
        body:      text,
        direction: 'INCOMING',
        type:      'TEXT',
        channel:   'WHATSAPP', // reusing field; sessionId prefix identifies Telegram
      },
    });

    // ── Emit real-time socket event to bot owner ──────────────────────────────
    const displayName = fromUser?.first_name
      ? `${fromUser.first_name}${fromUser.last_name ? ' ' + fromUser.last_name : ''}`
      : fromUser?.username
        ? `@${fromUser.username}`
        : `User ${chatId}`;

    io.to(bot.userId).emit('telegram:message', {
      id:        saved.id,
      botId,
      chatId,
      from:      chatId,
      displayName,
      username:  fromUser?.username || null,
      body:      text,
      direction: 'INCOMING',
      createdAt: saved.createdAt,
    });

    // ── Run Flow Engine ───────────────────────────────────────────────────────
    await processIncomingMessage(text, chatId, bot.userId, 'TELEGRAM', bot.token);

  } catch (err) {
    console.error('[Telegram Webhook] Error:', err);
  }
});

// ─── AUTHENTICATED routes ─────────────────────────────────────────────────────
router.use(authMiddleware);

// Bots CRUD
router.get('/bots',       getBots);
router.get('/bots/:id',   getBot);
router.post('/bots',      createBot);
router.put('/bots/:id',   updateBot);
router.delete('/bots/:id', deleteBot);

// Notes CRUD
router.get('/notes',        getNotes);
router.post('/notes',       createNote);
router.put('/notes/:id',    updateNote);
router.delete('/notes/:id', deleteNote);

// Inbox API
router.get('/inbox/conversations',          getTelegramConversations);
router.get('/inbox/messages/:chatId',       getTelegramMessages);
router.post('/inbox/send',                  sendTelegramInboxMessage);
router.post('/inbox/assign',                assignTelegramConversation);
router.post('/inbox/takeover',              toggleTelegramBotTakeover);

export default router;
