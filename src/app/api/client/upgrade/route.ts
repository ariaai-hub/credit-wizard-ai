/**
 * Client-facing plan upgrade API — Credit Wizard AI B2B platform.
 *
 * POST /api/client/upgrade
 * Body: { plan: "STARTER" | "PRO" | "ELITE" }
 * Returns: { success: true, newPlan } or { error: "..." }
 *
 * Tenant-isolated: only the authenticated tenant's own subscription can be upgraded.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

type PlanKey = "STARTER" | "PRO" | "ELITE";

const PLAN_PRICE_MAP: Record<PlanKey, string | undefined> = {
  STARTER: STRIPE_PRICE_IDS.starter,
  PRO: STRIPE_PRICE_IDS.pro,
  ELITE: STRIPE_PRICE_IDS.elite,
};

const PLAN_TIER: Record<PlanKey, number> = {
  STARTER: 1,
  PRO: 2,
  ELITE: 3,
};

const VALID_PLANS: PlanKey[] = ["STARTER", "PRO", "ELITE"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { plan: unknown };
    if (!body?.plan || !VALID_PLANS.includes(body.plan as PlanKey)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be STARTER, PRO, or ELITE." },
        { status: 400 },
      );
    }

    const targetPlan = body.plan as PlanKey;
    const newPriceId = PLAN_PRICE_MAP[targetPlan];

    if (!newPriceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for ${targetPlan}.` },
        { status: 500 },
      );
    }

    // Tenant isolation: fetch tenant using session tenantId only
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (!tenant.stripeCustomerId || !tenant.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active billing account found. Please subscribe first." },
        { status: 400 },
      );
    }

    const currentPlan = tenant.plan as PlanKey | null;

    // No-op if already on the target plan
    if (currentPlan === targetPlan) {
      return NextResponse.json({ success: true, newPlan: targetPlan, message: "Already on this plan." });
    }

    const stripe = getStripe();

    // Retrieve current subscription to get the current item id
    const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId, {
      expand: ["items.data.price"],
    });
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      return NextResponse.json({ error: "Could not find subscription line item." }, { status: 500 });
    }

    const isUpgrade = PLAN_TIER[targetPlan] > (PLAN_TIER[currentPlan ?? "STARTER"] ?? 0);

    // Downgrade: effective at end of billing cycle
    // Upgrade: immediate charge
    if (!isUpgrade) {
      await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [{ id: currentItem.id, price: newPriceId }],
        billing_cycle_anchor: "unchanged",
        proration_behavior: "none",
      });
    } else {
      await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [{ id: currentItem.id, price: newPriceId }],
        expand: ["latest_invoice"],
        proration_behavior: "none",
      });

      if (subscription.status !== "active") {
        await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
          billing_cycle_anchor: "now",
          proration_behavior: "none",
        });
      }
    }

    // Sync plan in DB
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan: targetPlan },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "user",
        actorUserId: session.userId,
        eventType: isUpgrade ? "B2C_PLAN_UPGRADED" : "B2C_PLAN_DOWNGRADED",
        referenceType: "stripe_subscription",
        referenceId: tenant.stripeSubscriptionId,
        inputSnapshotJson: {
          previousPlan: currentPlan,
          newPlan: targetPlan,
          previousPriceId: currentItem.price.id,
          newPriceId,
          changeType: isUpgrade ? "upgrade" : "downgrade",
        },
      },
    });

    return NextResponse.json({ success: true, newPlan: targetPlan });
  } catch (error) {
    // Log but don't expose internal error details
    console.error("[/api/client/upgrade]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
