import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAffiliateStats } from "@/lib/affiliate";
import { AffiliateDashboardClient } from "./affiliate-client";
import { formatCurrency } from "@/lib/utils";

const AFFILIATE_BASE_URL = process.env.APP_BASE_URL ?? "https://creditwizard.ai";
const PAYOUT_THRESHOLD_CENTS = 5000; // $50 minimum payout

export default async function AffiliatePage() {
  const session = await requireSession();

  // Fetch tenant plan — Starter users cannot access affiliate program
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { plan: true, referralCode: true },
  });

  const plan = tenant?.plan ?? "STARTER";

  if (plan === "STARTER") {
    redirect("/dashboard/upgrade");
  }

  const stats = await getAffiliateStats(session.tenantId);

  const referralLink = stats.referralCode
    ? `${AFFILIATE_BASE_URL}/get-started?ref=${stats.referralCode}`
    : null;

  const canRequestPayout = stats.pendingBalance >= PAYOUT_THRESHOLD_CENTS;

  return (
    <AffiliateDashboardClient
      stats={stats}
      referralLink={referralLink}
      payoutThresholdCents={PAYOUT_THRESHOLD_CENTS}
      canRequestPayout={canRequestPayout}
    />
  );
}
