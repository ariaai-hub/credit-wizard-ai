/**
 * Stripe plan upgrade / downgrade — Credit Wizard AI B2C (consumer) platform.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY          — Stripe secret key
 *   STRIPE_PRICE_STARTER       — Price ID for Starter ($9.99/mo)
 *   STRIPE_PRICE_PRO           — Price ID for Pro ($59.99/mo)
 *   STRIPE_PRICE_ELITE         — Price ID for Elite ($129.99/mo)
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

// Sort tiers for upgrade/downgrade detection
const PLAN_TIER: Record<PlanKey, number> = {
  STARTER: 1,
  PRO: 2,
  ELITE: 3,
};

async function getStripeSubscriptionDetails(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { plan: PlanKey };
    if (!body.plan || !["STARTER", "PRO", "ELITE"].includes(body.plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be STARTER, PRO, or ELITE." }, { status: 400 });
    }

    const targetPlan = body.plan as PlanKey;
    const newPriceId = PLAN_PRICE_MAP[targetPlan];

    if (!newPriceId) {
      return NextResponse.json({ error: `Missing Stripe price ID for ${targetPlan}.` }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: {
        id: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!tenant.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found. Please subscribe first." }, { status: 400 });
    }

    if (!tenant.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    // Retrieve current subscription to get the current item id
    const subscription = await getStripeSubscriptionDetails(tenant.stripeSubscriptionId);
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: "Could not find subscription line item." }, { status: 500 });
    }

    const currentItemId = currentItem.id;
    const currentPriceId = currentItem.price.id;

    // No-op if already on the target plan
    const currentPlan = tenant.plan as PlanKey | null;
    if (currentPlan === targetPlan) {
      return NextResponse.json({ ok: true, newPlan: targetPlan, message: "Already on this plan." });
    }

    const stripe = getStripe();
    const isUpgrade = PLAN_TIER[targetPlan] > (PLAN_TIER[currentPlan ?? "STARTER"] ?? 0);

    // Downgrade: takes effect at end of current billing cycle (no immediate charge)
    // Upgrade: immediate charge, new cycle starts now, no prorate
    if (!isUpgrade) {
      // Downgrade
      await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [{ id: currentItemId, price: newPriceId }],
        billing_cycle_anchor: "unchanged",
        proration_behavior: "none",
      });
    } else {
      // Upgrade — immediate charge, no proration
      const updatedSub = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [{ id: currentItemId, price: newPriceId }],
        expand: ["latest_invoice"],
        proration_behavior: "none",
      });

      // Ensure the subscription is set to bill immediately (advance billing)
      // Stripe defaults to immediately charging for upgrades when proration is none
      // and the subscription's billing_cycle_anchor is unchanged but in upgrade mode.
      // We also force the billing cycle anchor to "now" for immediate activation.
      if (updatedSub.status !== "active") {
        await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
          billing_cycle_anchor: "now",
          proration_behavior: "none",
        });
      }
    }

    // Sync the plan in the DB immediately
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
          previousPriceId: currentPriceId,
          newPriceId,
          changeType: isUpgrade ? "upgrade" : "downgrade",
        },
      },
    });

    return NextResponse.json({ ok: true, newPlan: targetPlan });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown plan change error." },
      { status: 500 },
    );
  }
}
