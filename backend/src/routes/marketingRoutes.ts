import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// --- 1. Redirection Engine (Public) ---
// Route: GET /r/:shortCode
router.get('/r/:shortCode', async (req: Request, res: Response) => {
  const shortCode = req.params.shortCode as string;

  try {
    const link = await prisma.shortLink.findUnique({
      where: { shortCode }
    });

    if (!link) {
      return res.status(404).send('Link not found');
    }

    // Capture Analytics
    const rawIp = req.ip || req.socket.remoteAddress;
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (rawIp || 'unknown');
    const rawUserAgent = req.headers['user-agent'];
    const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : (rawUserAgent || 'unknown');
    
    // Basic device detection
    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'tablet';

    // Increment clicks and save analytics asynchronously (fire and forget)
    prisma.shortLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } }
    }).catch(console.error);

    prisma.clickAnalytics.create({
      data: {
        shortLinkId: link.id,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : 'unknown',
        userAgent,
        deviceType,
        country: 'BD' // Normally resolved via GeoIP package
      }
    }).catch(console.error);

    // Redirect to original URL
    res.redirect(link.originalUrl);
  } catch (error) {
    console.error('Redirect Error:', error);
    res.status(500).send('Server Error');
  }
});

// --- 2. Link Management API (Protected) ---
// Method: POST /api/marketing/links
router.post('/api/marketing/links', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { originalUrl, campaignName, customCode } = req.body;

  try {
    // Generate a shortcode (random 6 chars if customCode not provided)
    const shortCode = customCode || Math.random().toString(36).substring(2, 8);

    const newLink = await prisma.shortLink.create({
      data: {
        userId,
        originalUrl,
        shortCode,
        campaignName
      }
    });

    res.status(201).json(newLink);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Short code already exists. Please choose another.' });
      return;
    }
    console.error('Failed to create link:', error);
    res.status(500).json({ error: 'Failed to create short link' });
  }
});

// Method: GET /api/marketing/links
router.get('/api/marketing/links', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const links = await prisma.shortLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { analytics: true }
        }
      }
    });
    res.json(links);
  } catch (error) {
    console.error('Failed to fetch links:', error);
    res.status(500).json({ error: 'Failed to fetch short links' });
  }
});

export default router;
