import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

// Helper function to scrape URL text
async function scrapeUrlText(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : url;
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Extract body content
    let body = html;
    const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      body = bodyMatch[1];
    }

    // Clean up HTML tags and script/style content
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    body = body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    body = body.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
    body = body.replace(/<[^>]*>/g, ' ');

    let text = body
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Cap size at 50,000 characters
    if (text.length > 50000) {
      text = text.substring(0, 50000) + '... [Truncated]';
    }

    return { title, content: text };
  } catch (error: any) {
    throw new Error(`Scraping failed: ${error.message}`);
  }
}

// ─── GET /api/user/knowledge ──────────────────────────────────────────────────
export async function getKnowledge(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const items = await prisma.knowledgeBase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Failed to get knowledge:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge items' });
  }
}

// ─── POST /api/user/knowledge ─────────────────────────────────────────────────
export async function addKnowledge(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { type, title, content, metadata } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: 'Type and Title are required' });
  }

  try {
    let finalTitle = title;
    let finalContent = content || '';

    // Handle scraping if type is URL
    if (type === 'URL') {
      const url = title.trim();
      const scraped = await scrapeUrlText(url);
      finalTitle = scraped.title || url;
      finalContent = scraped.content;
    }

    const item = await prisma.knowledgeBase.create({
      data: {
        userId,
        type,
        title: finalTitle,
        content: finalContent,
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to add knowledge:', error);
    res.status(500).json({ error: error.message || 'Failed to create knowledge item' });
  }
}

// ─── PUT /api/user/knowledge/:id ──────────────────────────────────────────────
export async function updateKnowledge(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const existing = await prisma.knowledgeBase.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Knowledge item not found' });
    }

    const updated = await prisma.knowledgeBase.update({
      where: { id: id as string },
      data: {
        title: title !== undefined ? title : existing.title,
        content: content !== undefined ? content : existing.content
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update knowledge:', error);
    res.status(500).json({ error: 'Failed to update knowledge item' });
  }
}

// ─── DELETE /api/user/knowledge/:id ───────────────────────────────────────────
export async function deleteKnowledge(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  try {
    const existing = await prisma.knowledgeBase.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Knowledge item not found' });
    }

    await prisma.knowledgeBase.delete({ where: { id: id as string } });
    res.json({ success: true, message: 'Knowledge item deleted' });
  } catch (error) {
    console.error('Failed to delete knowledge:', error);
    res.status(500).json({ error: 'Failed to delete knowledge item' });
  }
}

// ─── POST /api/user/knowledge/upload ──────────────────────────────────────────
export async function uploadKnowledgeFile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = file.path;
    const originalName = file.originalname;

    // Read the file as text
    const textContent = fs.readFileSync(filePath, 'utf8');

    // Create the knowledge item
    const item = await prisma.knowledgeBase.create({
      data: {
        userId,
        type: 'FILE',
        title: originalName,
        content: textContent,
        metadata: JSON.stringify({
          size: file.size,
          mimetype: file.mimetype
        })
      }
    });

    // Cleanup the uploaded temp file
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to upload and parse knowledge file:', error);
    res.status(500).json({ error: 'Failed to process and save file contents' });
  }
}
