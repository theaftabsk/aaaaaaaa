import prisma from '../lib/prisma';

// ─── Default pricing (tokens per 1 unit) ──────────────────────────────────────
export const DEFAULT_PRICING: Record<string, { tokenCost: number; label: string }> = {
  WHATSAPP_UTILITY:    { tokenCost: 20,  label: 'WhatsApp Utility Message' },
  WHATSAPP_MARKETING:  { tokenCost: 50,  label: 'WhatsApp Marketing Message' },
  SMS:                 { tokenCost: 10,  label: 'SMS Message' },
  OTP:                 { tokenCost: 15,  label: 'OTP Message' },
  AI_REPLY:            { tokenCost: 100, label: 'AI Auto-Reply' },
};

// ─── Ensure wallet exists for a user (upsert) ─────────────────────────────────
export async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    create: { userId, tokenBalance: 0, totalRecharged: 0, totalSpent: 0 },
    update: {},
  });
}

// ─── Get wallet balance ────────────────────────────────────────────────────────
export async function getWallet(userId: string) {
  return ensureWallet(userId);
}

// ─── Check if user has enough tokens ─────────────────────────────────────────
export async function hasEnoughTokens(userId: string, tokensNeeded: number): Promise<boolean> {
  const wallet = await ensureWallet(userId);
  return wallet.tokenBalance >= tokensNeeded;
}

// ─── Deduct tokens for a service ─────────────────────────────────────────────
export async function deductTokens(
  userId: string,
  service: string,
  units: number = 1,
  refId?: string
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  try {
    // Get token cost from DB (fall back to defaults)
    let tokenCost = DEFAULT_PRICING[service]?.tokenCost ?? 20;
    const dbRule = await prisma.pricingRule.findUnique({ where: { service } });
    if (dbRule?.isActive) tokenCost = dbRule.tokenCost;

    const totalCost = tokenCost * units;
    const wallet = await ensureWallet(userId);

    if (wallet.tokenBalance < totalCost) {
      return { success: false, message: `Insufficient tokens. Need ${totalCost}, have ${wallet.tokenBalance}.` };
    }

    const balanceBefore = wallet.tokenBalance;
    const balanceAfter = balanceBefore - totalCost;

    // Atomic update: deduct balance + log transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId },
        data: {
          tokenBalance: { decrement: totalCost },
          totalSpent:   { increment: totalCost },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          type: 'DEDUCT',
          tokens: -totalCost,
          description: `${DEFAULT_PRICING[service]?.label ?? service} × ${units}`,
          service,
          refId: refId ?? null,
          balanceBefore,
          balanceAfter,
        },
      }),
    ]);

    return { success: true, message: 'Tokens deducted successfully', newBalance: balanceAfter };
  } catch (err) {
    console.error('[WalletService] deductTokens error:', err);
    return { success: false, message: 'Wallet deduction failed due to server error.' };
  }
}

// ─── Add tokens (manual admin or payment verified) ───────────────────────────
export async function addTokens(
  userId: string,
  tokens: number,
  description: string,
  service: string = 'RECHARGE',
  refId?: string
): Promise<{ success: boolean; newBalance: number }> {
  const wallet = await ensureWallet(userId);
  const balanceBefore = wallet.tokenBalance;
  const balanceAfter = balanceBefore + tokens;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: {
        tokenBalance:   { increment: tokens },
        totalRecharged: { increment: tokens },
      },
    }),
    prisma.walletTransaction.create({
      data: {
        userId,
        type: 'RECHARGE',
        tokens,
        description,
        service,
        refId: refId ?? null,
        balanceBefore,
        balanceAfter,
      },
    }),
  ]);

  return { success: true, newBalance: balanceAfter };
}

// ─── Seed default pricing rules ───────────────────────────────────────────────
export async function seedPricingRules() {
  for (const [service, { tokenCost, label }] of Object.entries(DEFAULT_PRICING)) {
    await prisma.pricingRule.upsert({
      where: { service },
      create: { service, tokenCost, label },
      update: { tokenCost, label },
    });
  }
  console.log('[WalletService] Default pricing rules seeded.');
}
