import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    workspaceId: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vexo-super-secret-jwt-token-key-change-this-in-production') as {
      id: string;
      email: string;
      role: string;
    };

    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true, parentId: true },
    });

    if (!userRecord) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: userRecord.role,
      workspaceId: userRecord.parentId || decoded.id,
    };
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
}
