import { prisma } from "@/lib/prisma";

/** Plan pricing in cents for commission calculation */
const PLAN_PRICES_CENTS: Record<string, number> = {
  STARTER: 999,   // $9.99
  PRO: 5999,       // $59.99
  ELITE: 12999,    // $129.99
};

/** Commission rates by plan */
const COMMISSION_RATES: Record<string, number> = {
  PRO: 0.2,   // 20%
  ELITE: 0.3, // 30%
};

/**
 * Credit an affiliate commission to a referrer when a new tenant activates a subscription.
 *
 * - Pro referrer: 20% of Pro ($59.99) = 1199 cents = $11.99
 * - Elite referrer: 30% of Elite ($129.99) = 3899 cents = $38.99
 * - Starter: no commission (affiliate program is Pro/Elite only)
 *
 * Creates a ReferralCommission record and increments the referrer's affiliateBalance.
 */
export async function creditAffiliateCommission(
  referrerTenantId: string,
  referredTenantId: string,
  plan: string,
): Promise<{ success: boolean; commissionId?: string; amountCents?: number; error?: string }> {
  // Only credit for PRO or ELITE plans
  const rate = COMMISSION_RATES[plan];
  if (!rate) {
    return { success: false, error: `No commission rate defined for plan: ${plan}` };
  }

  const planPriceCents = PLAN_PRICES_CENTS[plan];
  if (!planPriceCents) {
    return { success: false, error: `No price defined for plan: ${plan}` };
  }

  const commissionCents = Math.round(planPriceCents * rate);

  try {
    // Use a transaction to ensure atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Verify both tenants exist
      const [referrer, referred] = await Promise.all([
        tx.tenant.findUnique({ where: { id: referrerTenantId }, select: { id: true, plan: true } }),
        tx.tenant.findUnique({ where: { id: referredTenantId }, select: { id: true } }),
      ]);

      if (!referrer) {
        throw new Error(`Referrer tenant not found: ${referrerTenantId}`);
      }
      if (!referred) {
        throw new Error(`Referred tenant not found: ${referredTenantId}`);
      }

      // Guard against duplicate commissions for the same referral
      const existing = await tx.referralCommission.findFirst({
        where: { referredTenantId, referrerTenantId },
        select: { id: true },
      });

      if (existing) {
        throw new Error(`Commission already credited for this referral pair`);
      }

      // Create the commission record
      const commission = await tx.referralCommission.create({
        data: {
          referrerTenantId,
          referredTenantId,
          amount: commissionCents,
          status: "PENDING",
        },
      });

      // Add to referrer's affiliate balance
      await tx.tenant.update({
        where: { id: referrerTenantId },
        data: { affiliateBalance: { increment: commissionCents } },
      });

      return commission;
    });

    return { success: true, commissionId: result.id, amountCents: commissionCents };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Don't surface internal errors to caller — just log
    console.error("[affiliate] Failed to credit commission:", message);
    return { success: false, error: message };
  }
}

/**
 * Get affiliate stats for a tenant.
 * Used by the GET /api/client/affiliate/stats endpoint.
 */
export async function getAffiliateStats(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      referralCode: true,
      affiliateBalance: true,
      plan: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const commissions = await prisma.referralCommission.findMany({
    where: { referrerTenantId: tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      referredTenant: {
        select: {
          name: true,
          ownerEmail: true,
          createdAt: true,
          plan: true,
        },
      },
    },
  });

  const pendingBalance = commissions
    .filter((c) => c.status === "PENDING")
    .reduce((sum, c) => sum + c.amount, 0);

  const paidOut = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);

  const referrals = commissions.map((c) => ({
    referredName: c.referredTenant.name,
    referredEmail: c.referredTenant.ownerEmail ?? null,
    joinedAt: c.referredTenant.createdAt,
    status: c.status,
    commission: c.amount,
    plan: c.referredTenant.plan,
  }));

  return {
    referralCode: tenant.referralCode,
    referralCount: commissions.length,
    totalEarnings: tenant.affiliateBalance,
    pendingBalance,
    paidOut,
    referrals,
    plan: tenant.plan,
  };
}

/**
 * Mark a pending commission as paid (admin only).
 * Deducts from the referrer's affiliateBalance.
 */
export async function markCommissionPaid(
  commissionId: string,
  adminTenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const commission = await tx.referralCommission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new Error("Commission not found");
      }

      if (commission.status !== "PENDING") {
        throw new Error(`Commission is not pending: ${commission.status}`);
      }

      if (commission.referrerTenantId !== adminTenantId) {
        throw new Error("Not authorized to payout this commission");
      }

      await tx.referralCommission.update({
        where: { id: commissionId },
        data: { status: "PAID", paidAt: new Date() },
      });

      // Deduct from affiliateBalance
      await tx.tenant.update({
        where: { id: adminTenantId },
        data: { affiliateBalance: { decrement: commission.amount } },
      });
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[affiliate] Failed to mark commission paid:", message);
    return { success: false, error: message };
  }
}
