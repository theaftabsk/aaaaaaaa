import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

// List all flows
export async function getFlows(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const flows = await prisma.chatbotFlow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(flows);
  } catch (error) {
    console.error('Fetch flows error:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot flows.' });
  }
}

// Create a new flow
export async function createFlow(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const { name, triggerKeywords, flowJson, isActive } = req.body;

  if (!name || !triggerKeywords || !Array.isArray(triggerKeywords)) {
    return res.status(400).json({ error: 'Name and trigger keywords array are required.' });
  }

  try {
    const flow = await prisma.chatbotFlow.create({
      data: {
        userId,
        name,
        triggerKeywords: triggerKeywords.map((k) => k.trim().toLowerCase()),
        flowJson: flowJson || {},
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(flow);
  } catch (error) {
    console.error('Create flow error:', error);
    res.status(500).json({ error: 'Failed to create chatbot flow.' });
  }
}

// Update a flow
export async function updateFlow(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;
  const { name, triggerKeywords, flowJson, isActive } = req.body;

  console.log('BACKEND RECEIVED UPDATE PAYLOAD FOR FLOW:', id);
  console.log('flowJson payload:', JSON.stringify(flowJson, null, 2));

  try {
    const existing = await prisma.chatbotFlow.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Chatbot flow not found.' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (triggerKeywords !== undefined && Array.isArray(triggerKeywords)) {
      updateData.triggerKeywords = triggerKeywords.map((k) => k.trim().toLowerCase());
    }
    if (flowJson !== undefined) updateData.flowJson = flowJson;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.chatbotFlow.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update flow error:', error);
    res.status(500).json({ error: 'Failed to update chatbot flow.' });
  }
}

// Delete a flow
export async function deleteFlow(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;

  try {
    const existing = await prisma.chatbotFlow.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Chatbot flow not found.' });
    }

    await prisma.chatbotFlow.delete({
      where: { id },
    });

    res.json({ message: 'Chatbot flow deleted successfully.' });
  } catch (error) {
    console.error('Delete flow error:', error);
    res.status(500).json({ error: 'Failed to delete chatbot flow.' });
  }
}

// Fetch a single flow by id
export async function getFlowById(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  const id = req.params.id as string;

  try {
    const flow = await prisma.chatbotFlow.findUnique({
      where: { id },
    });

    if (!flow || flow.userId !== userId) {
      return res.status(404).json({ error: 'Chatbot flow not found.' });
    }

    res.json(flow);
  } catch (error) {
    console.error('Fetch flow by id error:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot flow.' });
  }
}
