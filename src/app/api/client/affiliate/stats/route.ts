import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAffiliateStats } from "@/lib/affiliate";

/**
 * GET /api/client/affiliate/stats
 *
 * Returns affiliate stats for the authenticated tenant:
 * - referralCode, referralCount, totalEarnings, pendingBalance, paidOut, referrals[]
 *
 * Tenant isolation: always scoped to session.tenantId.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { tenantId } = session;

    const stats = await getAffiliateStats(tenantId);

    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    // Don't leak internal details
    console.error("[api/client/affiliate/stats]", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
