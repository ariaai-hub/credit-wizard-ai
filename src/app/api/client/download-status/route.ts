/**
 * GET /api/client/download-status?token=xxx
 *
 * Returns the current user's download allowance without consuming a download.
 * Used by the client portal to show "X downloads remaining" and badge state.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClientPortalAccessToken } from "@/lib/client-access";
import type { Plan } from "@prisma/client";

const STARTER_MONTHLY_LIMIT = 3;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token query param required." }, { status: 400 });
  }

  const payload = await verifyClientPortalAccessToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired access link." }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: payload.tenantId },
    select: { id: true, plan: true, letterDownloadsThisMonth: true, lastDownloadMonth: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const plan = tenant.plan as Plan | null;
  const currentMonth = getCurrentMonth();

  // No plan — show upgrade required
  if (!plan) {
    return NextResponse.json({
      plan: null,
      allowed: false,
      reason: "upgrade_required",
      upgradePlan: "PRO",
      downloadsUsed: 0,
      downloadsLimit: 0,
      downloadsRemaining: 0,
      month: currentMonth,
    });
  }

  // PRO or ELITE — unlimited
  if (plan === "PRO" || plan === "ELITE") {
    return NextResponse.json({
      plan,
      allowed: true,
      reason: "unlimited",
      downloadsUsed: null,
      downloadsLimit: null,
      downloadsRemaining: null,
      month: currentMonth,
    });
  }

  // STARTER
  const isNewMonth = tenant.lastDownloadMonth !== currentMonth;
  const currentCount = isNewMonth ? 0 : (tenant.letterDownloadsThisMonth ?? 0);
  const remaining = Math.max(STARTER_MONTHLY_LIMIT - currentCount, 0);

  return NextResponse.json({
    plan,
    allowed: currentCount < STARTER_MONTHLY_LIMIT,
    reason: currentCount >= STARTER_MONTHLY_LIMIT ? "limit_reached" : "available",
    downloadsUsed: currentCount,
    downloadsLimit: STARTER_MONTHLY_LIMIT,
    downloadsRemaining: remaining,
    month: currentMonth,
  });
}
