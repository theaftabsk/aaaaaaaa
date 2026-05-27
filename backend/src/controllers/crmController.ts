import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

// Get all contacts for a user
export async function getContacts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
}

// Create a new contact
export async function createContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { phone, name, email, tags, notes } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // Format phone: remove spaces, dashes, etc.
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  try {
    // Check if contact already exists for this user
    const existing = await prisma.contact.findUnique({
      where: {
        userId_phone: {
          userId,
          phone: cleanPhone,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Contact with this phone number already exists.' });
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        phone: cleanPhone,
        name: name || null,
        email: email || null,
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || null,
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact.' });
  }
}

// Update an existing contact
export async function updateContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;
  const { name, email, tags, notes, phone } = req.body;

  try {
    // Verify ownership
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact || contact.userId !== userId) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (notes !== undefined) updateData.notes = notes;
    if (phone !== undefined) {
      updateData.phone = phone.replace(/[^\d+]/g, '');
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact.' });
  }
}

// Delete a contact
export async function deleteContact(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;

  try {
    // Verify ownership
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact || contact.userId !== userId) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    await prisma.contact.delete({
      where: { id },
    });

    res.json({ message: 'Contact deleted successfully.' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact.' });
  }
}
