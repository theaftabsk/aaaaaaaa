import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

// ─── GET /api/user/ai-logs ────────────────────────────────────────────────────
export async function getAiLogs(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const logs = await prisma.aiLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100 // Cap logs at 100 entries for performance
    });
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch AI logs:', error);
    res.status(500).json({ error: 'Failed to retrieve AI logs' });
  }
}

// ─── DELETE /api/user/ai-logs ─────────────────────────────────────────────────
export async function clearAiLogs(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await prisma.aiLog.deleteMany({
      where: { userId }
    });
    res.json({ success: true, message: 'All AI logs cleared successfully.' });
  } catch (error) {
    console.error('Failed to clear AI logs:', error);
    res.status(500).json({ error: 'Failed to clear AI logs' });
  }
}
