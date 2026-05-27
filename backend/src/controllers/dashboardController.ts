import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    // 1. Total Messages
    const [totalMessages, totalContacts, totalCampaigns] = await Promise.all([
      prisma.message.count({ where: { userId } }),
      prisma.contact.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId } }),
    ]);

    // 2. Connected Devices (API-only mode — always 1 API connection)
    const connectedDevices = `1 / 1`;

    // 3. Active Leads (Contacts)
    const activeLeads = await prisma.contact.count({
      where: { userId },
    });

    // 4. Bot Auto-Replies (Proxy: All outgoing messages for now)
    const botAutoReplies = await prisma.message.count({
      where: { userId, direction: 'OUTGOING' },
    });

    // 5. Chart Data (Last 7 days Message Flow)
    // We will do a raw query or simple fetch and group in memory for simplicity with Prisma SQLite/Postgres.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messages = await prisma.message.findMany({
      where: { 
        userId,
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        direction: true
      }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap: Record<string, { name: string; sent: number; received: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = { name: dayName, sent: 0, received: 0 };
    }

    messages.forEach(msg => {
      const dayName = days[new Date(msg.createdAt).getDay()];
      if (chartDataMap[dayName]) {
        if (msg.direction === 'OUTGOING') {
          chartDataMap[dayName].sent += 1;
        } else {
          chartDataMap[dayName].received += 1;
        }
      }
    });

    const chartData = Object.values(chartDataMap);

    // 6. Active Campaigns
    const activeCampaigns = await prisma.campaign.findMany({
      where: { 
        userId, 
        status: { in: ['PROCESSING', 'PENDING'] } 
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      totalContacts,
      totalMessages,
      totalCampaigns,
      stats: {
        totalMessages,
        connectedDevices,
        activeLeads,
        botAutoReplies
      },
      chartData,
      activeCampaigns
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
}
