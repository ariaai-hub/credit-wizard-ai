import { Prisma, SubscriptionStatus } from "@prisma/client";

import { PLAN_DEFINITIONS, TOKEN_PACKS } from "@/lib/billing";
import { getClientPortalStorageMode } from "@/lib/document-storage";
import { getStripeConfigStatus } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type PeriodTotals = {
  weekToDate: number;
  monthToDate: number;
  allTime: number;
};

type HealthStatus = {
  label: string;
  healthy: boolean;
  detail: string;
};

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek() {
  const now = getStartOfToday();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next;
}

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function normalizeJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Prisma.JsonObject;
}

function getNumber(value: Prisma.JsonValue | undefined) {
  return typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : 0;
}

function deriveRevenueFromAudit(input: {
  eventType: string;
  inputSnapshotJson: Prisma.JsonValue | null;
}) {
  const snapshot = normalizeJsonObject(input.inputSnapshotJson);

  if (!snapshot) {
    return 0;
  }

  const amountTotalCents = getNumber(snapshot.amountTotalCents);
  const amountPaidCents = getNumber(snapshot.amountPaidCents);

  if (amountPaidCents > 0) {
    return amountPaidCents / 100;
  }

  if (amountTotalCents > 0) {
    return amountTotalCents / 100;
  }

  const metadata = normalizeJsonObject(snapshot.metadata);
  const checkoutType = typeof metadata?.checkoutType === "string" ? metadata.checkoutType : undefined;

  if (checkoutType === "subscription") {
    const planKey = typeof metadata?.planKey === "string" ? metadata.planKey : undefined;
    return PLAN_DEFINITIONS.find((plan) => plan.key === planKey)?.monthlyPrice ?? 0;
  }

  if (checkoutType === "token_pack") {
    const tokenPack = getNumber(metadata?.tokenPack);
    return TOKEN_PACKS.find((pack) => pack.tokens === tokenPack)?.price ?? 0;
  }

  return 0;
}

function incrementPeriodTotals(totals: PeriodTotals, createdAt: Date, amount: number) {
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();

  totals.allTime += amount;
  if (createdAt >= weekStart) {
    totals.weekToDate += amount;
  }
  if (createdAt >= monthStart) {
    totals.monthToDate += amount;
  }
}

export async function getPlatformDashboardMetrics() {
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();
  const dayStart = getStartOfToday();
  const stripeConfig = getStripeConfigStatus();

  const [tenants, activeSubscriptions, revenueAudits, openDisputes, allDisputeTradelines, lifecycleAuditEvents, recentFailures] = await Promise.all([
    prisma.tenant.findMany({
      select: {
        id: true,
        createdAt: true,
      },
    }),
    prisma.billingSubscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE],
        },
      },
      select: {
        id: true,
        tenantId: true,
        planKey: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        eventType: {
          in: ["STRIPE_CHECKOUT_COMPLETED", "STRIPE_INVOICE_PAID"],
        },
      },
      select: {
        eventType: true,
        createdAt: true,
        inputSnapshotJson: true,
      },
    }),
    prisma.disputeCaseRecord.count({
      where: {
        status: {
          in: ["DRAFT", "IN_REVIEW", "ACTIVE", "MONITORING", "ESCALATED"],
        },
      },
    }),
    prisma.disputeTradelineRecord.findMany({
      select: {
        id: true,
        responseClass: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        eventType: "CLIENT_LIFECYCLE_STAGE_UPDATED",
      },
      select: {
        createdAt: true,
        outputSnapshotJson: true,
      },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: dayStart,
        },
        eventType: {
          contains: "FAILED",
        },
      },
    }),
  ]);

  const revenue = revenueAudits.reduce<PeriodTotals>(
    (totals, audit) => {
      const amount = deriveRevenueFromAudit(audit);
      incrementPeriodTotals(totals, audit.createdAt, amount);
      return totals;
    },
    { weekToDate: 0, monthToDate: 0, allTime: 0 },
  );

  const partnerGrowth = tenants.reduce<PeriodTotals>(
    (totals, tenant) => {
      incrementPeriodTotals(totals, tenant.createdAt, 1);
      return totals;
    },
    { weekToDate: 0, monthToDate: 0, allTime: 0 },
  );

  const lettersSentAudited = lifecycleAuditEvents.filter((event) => {
    const output = normalizeJsonObject(event.outputSnapshotJson);
    return output?.newStage === "MAIL_QUEUED";
  });
  const lettersSentCurrent = await prisma.client.count({
    where: {
      lifecycleStage: "MAIL_QUEUED",
    },
  });
  const lettersSentAllTime = Math.max(lettersSentAudited.length, lettersSentCurrent);

  const verifiedDeletionsAllTime = allDisputeTradelines.filter((item) => item.responseClass === "deleted").length;

  const activeSubscriptionRevenue = activeSubscriptions.reduce((sum, subscription) => {
    const plan = PLAN_DEFINITIONS.find((entry) => entry.key === subscription.planKey);
    return sum + (plan?.monthlyPrice ?? 0);
  }, 0);

  const health: HealthStatus[] = [
    {
      label: "Auth + secrets",
      healthy: Boolean(process.env.SESSION_SECRET || process.env.CLIENT_PORTAL_SECRET),
      detail: process.env.SESSION_SECRET || process.env.CLIENT_PORTAL_SECRET ? "Session and portal signing are configured." : "Missing session and portal signing secrets.",
    },
    {
      label: "Stripe billing",
      healthy: stripeConfig.hasSecretKey && stripeConfig.hasWebhookSecret && stripeConfig.missingPriceIds.length === 0,
      detail:
        stripeConfig.hasSecretKey && stripeConfig.hasWebhookSecret && stripeConfig.missingPriceIds.length === 0
          ? "Billing is wired with secret, webhook, and price IDs."
          : `Billing config issue: ${[
              !stripeConfig.hasSecretKey ? "missing secret key" : null,
              !stripeConfig.hasWebhookSecret ? "missing webhook secret" : null,
              stripeConfig.missingPriceIds.length > 0 ? `missing prices: ${stripeConfig.missingPriceIds.join(", ")}` : null,
            ]
              .filter(Boolean)
              .join("; ")}`,
    },
    {
      label: "Email delivery",
      healthy: Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM),
      detail: process.env.SMTP_HOST ? `SMTP is configured (${process.env.SMTP_HOST}).` : "SMTP is missing required configuration.",
    },
    {
      label: "SMS delivery",
      healthy: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      detail: process.env.TWILIO_FROM_NUMBER ? `Twilio is configured (${process.env.TWILIO_FROM_NUMBER}).` : "Twilio is missing required configuration.",
    },
    {
      label: "Storage + ingestion",
      healthy: getClientPortalStorageMode() === "r2" || getClientPortalStorageMode() === "local",
      detail: `Report and client uploads are available via ${getClientPortalStorageMode()}.`,
    },
    {
      label: "Automation health",
      healthy: Boolean(process.env.FOLLOWUP_AUTOMATION_SECRET) && recentFailures === 0,
      detail:
        Boolean(process.env.FOLLOWUP_AUTOMATION_SECRET) && recentFailures === 0
          ? "Automation auth is configured and there are no failure events today."
          : recentFailures > 0
            ? `${recentFailures} failure event(s) logged today.`
            : "Automation secret is missing.",
    },
  ];

  return {
    revenue,
    activeSubscriptionRevenue,
    partnerGrowth,
    openDisputes,
    lettersSentAllTime,
    verifiedDeletionsAllTime,
    health,
  };
}
