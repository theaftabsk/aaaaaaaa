import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import inboxRoutes from './routes/inboxRoutes';
import crmRoutes from './routes/crmRoutes';
import broadcastRoutes from './routes/broadcastRoutes';
import flowRoutes from './routes/flowRoutes';
import userRoutes from './routes/userRoutes';
import webhookRoutes from './routes/webhookRoutes';
import marketingRoutes from './routes/marketingRoutes';
import phonebookRoutes from './routes/phonebookRoutes';
import walletRoutes from './routes/walletRoutes';
import mediaRoutes from './routes/mediaRoutes';
import telegramRoutes from './routes/telegramRoutes';
import { seedPricingRules } from './services/walletService';
import './services/queue'; // Initialize the BullMQ Worker
import prisma from './lib/prisma';
import { processIncomingMessage } from './services/flowEngine';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this for production
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded media files as static
app.use('/uploads', express.static('uploads'));

// Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/flow', flowRoutes);
app.use('/api/user', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/phonebook', phonebookRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/', marketingRoutes); // Mounts /r/:shortCode and /api/marketing/links

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vexo Backend is running' });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Allow client to join a private room based on their userId
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room: ${userId}`);
  });

  // Handle incoming messages from the Web Widget
  socket.on('widget:incoming_message', async (data: { widgetId: string, text: string, customerId: string }) => {
    try {
      const { widgetId, text, customerId } = data;
      
      const user = await prisma.user.findUnique({
        where: { widgetId }
      });

      if (user) {
        // 1. Create or update Contact in DB for the Web widget visitor
        await prisma.contact.upsert({
          where: { userId_phone: { userId: user.id, phone: customerId } },
          update: { updatedAt: new Date() },
          create: {
            userId: user.id,
            phone: customerId,
            name: `Web Visitor (${customerId.slice(-4)})`,
            channel: 'WEB',
          },
        });

        // 2. Save incoming message to DB
        const saved = await prisma.message.create({
          data: {
            userId: user.id,
            sessionId: 'web_session',
            from: customerId,
            to: 'Bot',
            body: text,
            direction: 'INCOMING',
            type: 'TEXT',
            channel: 'WEB',
          },
        });

        // 3. Emit socket event to the admin/agents room so dashboard updates live
        io.to(user.id).emit('widget:message', {
          customerId,
          from: customerId,
          body: text,
          direction: 'INCOMING',
          createdAt: saved.createdAt,
          id: saved.id,
        });

        // 4. Run Flow Engine
        await processIncomingMessage(text, customerId, user.id, 'WEB');
      }
    } catch (err) {
      console.error('Widget message error:', err);
    }
  });

  // Widget clients join a specific room so we can emit back to them
  socket.on('widget:join', (customerId: string) => {
    socket.join(`web_${customerId}`);
    console.log(`Widget client joined room: web_${customerId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);

  // Seed default pricing rules
  try { await seedPricingRules(); } catch (_) {}

  console.log('[Startup] Vexo is running in API-only mode (Meta Cloud API).');
});

// Triggering reload for new Prisma schema
export { io };
