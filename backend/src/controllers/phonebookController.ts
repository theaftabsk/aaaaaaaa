import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

// ----------------- GROUPS -----------------
export async function getGroups(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const groups = await prisma.contactGroup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    });
    res.json(groups);
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    const group = await prisma.contactGroup.create({
      data: { userId, name, color },
    });
    res.status(201).json(group);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Group name already exists.' });
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group.' });
  }
}

export async function updateGroup(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const { name, color } = req.body;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const group = await prisma.contactGroup.updateMany({
      where: { id, userId },
      data: { name, color },
    });
    if (group.count === 0) return res.status(404).json({ error: 'Group not found.' });
    res.json({ message: 'Group updated successfully.' });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group.' });
  }
}

export async function deleteGroup(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const group = await prisma.contactGroup.deleteMany({
      where: { id, userId },
    });
    if (group.count === 0) return res.status(404).json({ error: 'Group not found.' });
    res.json({ message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group.' });
  }
}

// ----------------- LABELS -----------------
export async function getLabels(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const labels = await prisma.contactLabel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    });
    res.json(labels);
  } catch (error) {
    console.error('Fetch labels error:', error);
    res.status(500).json({ error: 'Failed to fetch labels.' });
  }
}

export async function createLabel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    const label = await prisma.contactLabel.create({
      data: { userId, name, color },
    });
    res.status(201).json(label);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Label name already exists.' });
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label.' });
  }
}

export async function updateLabel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  const { name, color } = req.body;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const label = await prisma.contactLabel.updateMany({
      where: { id, userId },
      data: { name, color },
    });
    if (label.count === 0) return res.status(404).json({ error: 'Label not found.' });
    res.json({ message: 'Label updated successfully.' });
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label.' });
  }
}

export async function deleteLabel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const label = await prisma.contactLabel.deleteMany({
      where: { id, userId },
    });
    if (label.count === 0) return res.status(404).json({ error: 'Label not found.' });
    res.json({ message: 'Label deleted successfully.' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label.' });
  }
}

// ----------------- CONTACTS -----------------
export async function getContacts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        groups: true,
        labels: true
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
}

export async function createContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { phone, name, email, groupIds, labelIds } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  try {
    const contact = await prisma.contact.create({
      data: {
        userId,
        phone,
        name,
        email,
        groups: {
          connect: groupIds ? groupIds.map((id: string) => ({ id })) : []
        },
        labels: {
          connect: labelIds ? labelIds.map((id: string) => ({ id })) : []
        }
      },
      include: {
        groups: true,
        labels: true
      }
    });
    res.status(201).json(contact);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Contact with this phone number already exists.' });
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact.' });
  }
}

export async function importContacts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { contacts, groupIds, labelIds } = req.body;
  if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Contacts must be an array.' });

  try {
    let imported = 0;
    let failed = 0;

    for (const contact of contacts) {
      if (!contact.phone) {
        failed++;
        continue;
      }
      try {
        await prisma.contact.upsert({
          where: {
            userId_phone: { userId, phone: contact.phone }
          },
          update: {
            name: contact.name || undefined,
            email: contact.email || undefined,
            groups: {
              connect: groupIds ? groupIds.map((id: string) => ({ id })) : []
            },
            labels: {
              connect: labelIds ? labelIds.map((id: string) => ({ id })) : []
            }
          },
          create: {
            userId,
            phone: contact.phone,
            name: contact.name,
            email: contact.email,
            groups: {
              connect: groupIds ? groupIds.map((id: string) => ({ id })) : []
            },
            labels: {
              connect: labelIds ? labelIds.map((id: string) => ({ id })) : []
            }
          }
        });
        imported++;
      } catch (err) {
        failed++;
      }
    }

    res.json({ message: 'Import completed', imported, failed });
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({ error: 'Failed to import contacts.' });
  }
}

export async function updateContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;
  const { phone, name, email, groupIds, labelIds } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  try {
    // Check ownership
    const existing = await prisma.contact.findUnique({
      where: { id },
      include: { groups: true, labels: true }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    // Update
    const updated = await prisma.contact.update({
      where: { id },
      data: {
        phone,
        name: name || null,
        email: email || null,
        groups: {
          disconnect: existing.groups.map(g => ({ id: g.id })),
          connect: groupIds ? groupIds.map((gid: string) => ({ id: gid })) : []
        },
        labels: {
          disconnect: existing.labels.map(l => ({ id: l.id })),
          connect: labelIds ? labelIds.map((lid: string) => ({ id: lid })) : []
        }
      },
      include: {
        groups: true,
        labels: true
      }
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Contact with this phone number already exists.' });
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact.' });
  }
}

export async function deleteContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id as string;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const contact = await prisma.contact.deleteMany({
      where: { id, userId },
    });
    if (contact.count === 0) return res.status(404).json({ error: 'Contact not found.' });
    res.json({ message: 'Contact deleted successfully.' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact.' });
  }
}
