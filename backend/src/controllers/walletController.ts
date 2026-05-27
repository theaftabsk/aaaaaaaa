import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { getWallet, addTokens, seedPricingRules } from '../services/walletService';
import { v4 as uuidv4 } from 'uuid';

// ─── GET /api/wallet ──────────────────────────────────────────────────────────
export async function getMyWallet(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const wallet = await getWallet(userId);
    const transactionCount = await prisma.walletTransaction.count({ where: { userId } });
    res.json({ wallet, transactionCount });
  } catch (err) {
    console.error('[WalletController] getMyWallet:', err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}

// ─── GET /api/wallet/transactions ─────────────────────────────────────────────
export async function getTransactions(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const page  = parseInt(req.query.page  as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip  = (page - 1) * limit;

  try {
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where: { userId } }),
    ]);
    res.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[WalletController] getTransactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

// ─── GET /api/wallet/pricing ──────────────────────────────────────────────────
export async function getPricing(req: AuthenticatedRequest, res: Response) {
  try {
    // Seed defaults if empty
    const count = await prisma.pricingRule.count();
    if (count === 0) await seedPricingRules();

    const rules = await prisma.pricingRule.findMany({ where: { isActive: true }, orderBy: { label: 'asc' } });
    res.json({ rules, tokenRate: '₹1 = 100 tokens' });
  } catch (err) {
    console.error('[WalletController] getPricing:', err);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
}

// ─── POST /api/wallet/recharge/initiate ───────────────────────────────────────
// Creates a manual recharge order (auto-approved for now, pending payment gateway)
export async function initiateRecharge(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { amount } = req.body; // Amount in ₹
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }

  // ₹1 = 100 tokens
  const tokensToAdd = Math.floor(Number(amount) * 100);
  const orderId = `MANUAL-${uuidv4().substring(0, 8).toUpperCase()}`;

  try {
    const order = await prisma.rechargeOrder.create({
      data: {
        userId,
        orderId,
        amount: Number(amount),
        tokensToAdd,
        status: 'PENDING',
        gateway: 'MANUAL',
      },
    });

    res.status(201).json({
      order,
      message: `Order created. Admin will verify and add ${tokensToAdd} tokens.`,
      orderId,
      tokensToAdd,
    });
  } catch (err) {
    console.error('[WalletController] initiateRecharge:', err);
    res.status(500).json({ error: 'Failed to create recharge order' });
  }
}

// ─── POST /api/wallet/recharge/verify ─────────────────────────────────────────
// Admin-only: approve a pending recharge order and credit tokens
export async function verifyRecharge(req: AuthenticatedRequest, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { orderId } = req.body;
  if (!orderId) { res.status(400).json({ error: 'orderId required' }); return; }

  try {
    const order = await prisma.rechargeOrder.findUnique({ where: { orderId } });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.status === 'SUCCESS') { res.status(400).json({ error: 'Already processed' }); return; }

    // Add tokens to wallet
    const result = await addTokens(
      order.userId,
      order.tokensToAdd,
      `Recharge ₹${order.amount} — Order ${orderId}`,
      'RECHARGE',
      orderId
    );

    // Update User model fields to sync
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        aiTokensRemaining: { increment: order.tokensToAdd },
        aiTokensPurchased: { increment: order.tokensToAdd },
        aiCreditsBalance: { increment: Number(order.amount) }
      }
    });

    // Update order status
    await prisma.rechargeOrder.update({ where: { orderId }, data: { status: 'SUCCESS' } });

    res.json({ success: true, newBalance: result.newBalance, tokensAdded: order.tokensToAdd });
  } catch (err) {
    console.error('[WalletController] verifyRecharge:', err);
    res.status(500).json({ error: 'Failed to verify recharge' });
  }
}
