import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ─── Multer storage config ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userId = req.user?.id ?? 'unknown';
    const dir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ─── Helper: ensure StorageUsage row exists ───────────────────────────────────
async function ensureStorageUsage(userId: string) {
  return prisma.storageUsage.upsert({
    where:  { userId },
    create: { userId, usedBytes: 0, quotaBytes: 1073741824 }, // 1 GB
    update: {},
  });
}

// ─── POST /api/media/upload ───────────────────────────────────────────────────
export async function uploadFiles(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const folder = (req.body.folder as string) || 'general';

  try {
    const storageUsage = await ensureStorageUsage(userId);
    const totalNewBytes = files.reduce((sum, f) => sum + f.size, 0);

    // Quota check
    if (storageUsage.usedBytes + totalNewBytes > storageUsage.quotaBytes) {
      // Delete uploaded files since we're rejecting
      files.forEach(f => fs.unlinkSync(f.path));
      res.status(413).json({
        error: 'Storage quota exceeded',
        used: storageUsage.usedBytes,
        quota: storageUsage.quotaBytes,
      });
      return;
    }

    // Save MediaFile records
    const created = await Promise.all(
      files.map(file =>
        prisma.mediaFile.create({
          data: {
            userId,
            fileName:   file.originalname,
            storedName: file.filename,
            mimeType:   file.mimetype,
            size:       file.size,
            url:        `/uploads/${userId}/${file.filename}`,
            folder,
          },
        })
      )
    );

    // Update storage usage
    await prisma.storageUsage.update({
      where: { userId },
      data:  { usedBytes: { increment: totalNewBytes } },
    });

    res.status(201).json({ files: created, totalUploaded: files.length });
  } catch (err) {
    console.error('[MediaController] uploadFiles:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

// ─── GET /api/media ───────────────────────────────────────────────────────────
export async function listFiles(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const folder = req.query.folder as string | undefined;

  try {
    const [files, storageUsage] = await Promise.all([
      prisma.mediaFile.findMany({
        where:   { userId, ...(folder && folder !== 'all' ? { folder } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
      ensureStorageUsage(userId),
    ]);

    res.json({ files, storageUsage });
  } catch (err) {
    console.error('[MediaController] listFiles:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
}

// ─── DELETE /api/media/:id ────────────────────────────────────────────────────
export async function deleteFile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const file = await prisma.mediaFile.findUnique({ where: { id: id as string } });
    if (!file || file.userId !== userId) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Delete from disk
    const filePath = path.join(process.cwd(), 'uploads', userId, file.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Delete from DB and update storage
    await Promise.all([
      prisma.mediaFile.delete({ where: { id: id as string } }),
      prisma.storageUsage.update({
        where: { userId },
        data:  { usedBytes: { decrement: file.size } },
      }),
    ]);

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('[MediaController] deleteFile:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}

// ─── GET /api/media/usage ─────────────────────────────────────────────────────
export async function getStorageUsage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const usage = await ensureStorageUsage(userId);
    const usedMB  = (usage.usedBytes / 1024 / 1024).toFixed(2);
    const quotaMB = (usage.quotaBytes / 1024 / 1024).toFixed(2);
    const percentUsed = ((usage.usedBytes / usage.quotaBytes) * 100).toFixed(1);
    res.json({ ...usage, usedMB, quotaMB, percentUsed });
  } catch (err) {
    console.error('[MediaController] getStorageUsage:', err);
    res.status(500).json({ error: 'Failed to fetch storage usage' });
  }
}
