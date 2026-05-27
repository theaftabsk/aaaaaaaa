import prisma from '../lib/prisma';
import { io } from '../index';
import { decrypt } from '../lib/encryption';

export async function sendReplyUnified(
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB',
  to: string, // phone number, telegram chat_id, or web session ID
  text: string,
  userId: string,
  sessionId?: string // 'API' for WhatsApp Cloud API, bot token ID for Telegram
) {
  // ─── WEB WIDGET ─────────────────────────────────────────────────────────────
  if (channel === 'WEB') {
    io.to(`web_${to}`).emit('widget:message', {
      from: 'Bot',
      text,
      createdAt: new Date(),
    });

    const saved = await prisma.message.create({
      data: {
        userId,
        sessionId: 'web_session',
        from: 'Bot',
        to,
        body: text,
        direction: 'OUTGOING',
        type: 'TEXT',
        channel: 'WEB',
      },
    });

    // Notify the admin/agent dashboard in real-time
    io.to(userId).emit('widget:message', {
      customerId: to,
      from: 'Bot',
      body: text,
      direction: 'OUTGOING',
      createdAt: saved.createdAt,
      id: saved.id,
    });

    return;
  }

  // ─── WHATSAPP (Meta Cloud API) ───────────────────────────────────────────────
  if (channel === 'WHATSAPP') {
    if (!sessionId) throw new Error('sessionId is required for WHATSAPP channel');

    if (sessionId === 'API') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.apiAccessToken || !user.apiPhoneNumberId) {
        console.warn(`[sendReplyUnified] Meta Cloud API credentials not configured for user ${userId}`);
        return;
      }

      const decryptedToken = decrypt(user.apiAccessToken);
      const url = `https://graph.facebook.com/v21.0/${user.apiPhoneNumberId}/messages`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${decryptedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'text',
            text: { body: text },
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error(`[sendReplyUnified] Meta Cloud API error:`, errBody);
          return;
        }

        const data = (await res.json()) as any;
        const whatsappId = data.messages?.[0]?.id || null;

        await prisma.message.create({
          data: {
            userId,
            sessionId: 'API',
            from: 'Bot',
            to,
            body: text,
            direction: 'OUTGOING',
            type: 'TEXT',
            channel: 'WHATSAPP',
            whatsappId,
          },
        });

        io.to(userId).emit('whatsapp:message', {
          sessionId: 'API',
          from: 'Bot',
          to,
          body: text,
          direction: 'OUTGOING',
          channel: 'WHATSAPP',
          createdAt: new Date(),
        });
      } catch (err) {
        console.error(`[sendReplyUnified] Meta Cloud API request failed:`, err);
      }
      return;
    }

    console.warn(`[sendReplyUnified] Baileys QR Engine is disabled. Session ${sessionId} requested by user ${userId} ignored.`);
    return;
  }

  // ─── TELEGRAM ────────────────────────────────────────────────────────────────
  if (channel === 'TELEGRAM') {
    // sessionId = telegram bot token for this message
    if (!sessionId) {
      console.warn(`[sendReplyUnified] No Telegram bot token provided for user ${userId}`);
      return;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${sessionId}/sendMessage`;
    try {
      const res = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to,
          text,
          parse_mode: 'Markdown',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error(`[sendReplyUnified] Telegram API error:`, errBody);
        return;
      }

      const data = (await res.json()) as any;
      const msgId = data.result?.message_id?.toString() || null;

      await prisma.message.create({
        data: {
          userId,
          sessionId: `TELEGRAM:${sessionId.slice(0, 10)}`,
          from: 'Bot',
          to,
          body: text,
          direction: 'OUTGOING',
          type: 'TEXT',
          channel: 'WHATSAPP', // reuse WHATSAPP field — DB channel enum only has WHATSAPP/WEB
          whatsappId: msgId,
        },
      });

      io.to(userId).emit('telegram:message', {
        chatId: to,
        from: 'Bot',
        body: text,
        direction: 'OUTGOING',
        createdAt: new Date(),
      });
    } catch (err) {
      console.error(`[sendReplyUnified] Telegram API request failed:`, err);
    }
    return;
  }
}
