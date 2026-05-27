import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

/**
 * GET /api/user/team
 * Retrieve all team members (including the admin/owner themselves)
 */
export async function getTeamMembers(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    // We want to fetch the admin themselves plus any agents whose parentId is this admin
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, parentId: true },
    });

    if (!admin) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Determine the actual workspace owner (admin) ID
    const ownerId = admin.parentId || admin.id;

    // Fetch workspace owner
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, role: true },
    });

    // Fetch all sub-members (agents) of this owner
    const agents = await prisma.user.findMany({
      where: { parentId: ownerId },
      select: { id: true, name: true, email: true, role: true },
    });

    // Combine them (Owner/Admin + Agents)
    const team = [];
    if (owner) {
      team.push({ ...owner, name: owner.name || 'Owner' });
    }
    for (const agent of agents) {
      team.push({ ...agent, name: agent.name || 'Agent' });
    }

    res.json(team);
  } catch (error: any) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members.' });
  }
}

/**
 * POST /api/user/team/invite
 * Create/Add a new team member under the current user (only admins can add)
 */
export async function addTeamMember(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  if (userRole === 'AGENT') {
    return res.status(403).json({ error: 'Only admins or account owners can add team members.' });
  }

  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const agent = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'AGENT',
        parentId: userId, // Link to the admin user
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ message: 'Team member added successfully.', agent });
  } catch (error: any) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Failed to add team member.' });
  }
}

/**
 * DELETE /api/user/team/:memberId
 * Remove a team member (only admin can delete)
 */
export async function deleteTeamMember(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  if (userRole === 'AGENT') {
    return res.status(403).json({ error: 'Only admins or account owners can remove team members.' });
  }

  const memberId = req.params.memberId as string;
  if (!memberId) return res.status(400).json({ error: 'Member ID is required.' });

  try {
    const member = await prisma.user.findFirst({
      where: { id: memberId, parentId: userId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Team member not found under your account.' });
    }

    // Delete the user (this cascades to clear references if schema defines it)
    await prisma.user.delete({ where: { id: memberId } });

    res.json({ message: 'Team member removed successfully.' });
  } catch (error: any) {
    console.error('Delete team member error:', error);
    res.status(500).json({ error: 'Failed to remove team member.' });
  }
}
