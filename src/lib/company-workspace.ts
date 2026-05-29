import { Prisma } from "@prisma/client";

import { getPlanDefinition } from "@/lib/billing";
import { getTenantDisputeOverview } from "@/lib/dispute-runtime";
import { getIntakeOverview, getIntakeQueueSnapshot } from "@/lib/intake";
import { prisma } from "@/lib/prisma";
import { getSeatUsage } from "@/lib/tenant";

function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code);
}

export async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return fallback;
    }

    throw error;
  }
}

export function formatStageLabel(stage: string) {
  return stage.toLowerCase().replaceAll("_", " ");
}

export function formatRoleLabel(role: string) {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "SUPPORT":
      return "Support";
    case "ANALYST":
      return "Analyst";
    case "MAIL_TEAM":
      return "Operations";
    default:
      return role.toLowerCase();
  }
}

export async function getCompanyWorkspaceSnapshot(tenantId: string) {
  const [tenant, subscription, tokenAccount, seatUsage, intakeOverview, queue, disputeOverview, supportMessages] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        ownerName: true,
        ownerEmail: true,
        createdAt: true,
      },
    }),
    prisma.billingSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tokenAccount.findUnique({ where: { tenantId } }),
    getSeatUsage(tenantId),
    getIntakeOverview(tenantId),
    getIntakeQueueSnapshot(tenantId),
    getTenantDisputeOverview(tenantId),
    safeQuery(
      () =>
        prisma.auditLog.count({
          where: {
            tenantId,
            eventType: "CLIENT_PORTAL_SUPPORT_MESSAGE",
          },
        }),
      0,
    ),
  ]);

  const plan = subscription ? getPlanDefinition(subscription.planKey) : null;
  const tokenBalance = Math.max(
    (tokenAccount?.includedBalance ?? 0) + (tokenAccount?.purchasedBalance ?? 0) - (tokenAccount?.reservedBalance ?? 0),
    0,
  );
  const docsPending = queue.filter((client) => ["INTAKE_RECEIVED", "DOCS_PENDING"].includes(client.lifecycleStage)).length;
  const readyForStrategy = queue.filter((client) =>
    ["READY_FOR_STRATEGY", "STRATEGY_READY", "LETTER_GENERATED", "MAIL_QUEUED"].includes(client.lifecycleStage),
  ).length;
  const mailQueued = queue.filter((client) => client.lifecycleStage === "MAIL_QUEUED").length;
  const strategyInFlight = queue.filter((client) =>
    ["STRATEGY_READY", "LETTER_GENERATED", "MAIL_QUEUED"].includes(client.lifecycleStage),
  ).length;

  return {
    tenant,
    subscription,
    plan,
    seatUsage,
    intakeOverview,
    queue,
    disputeOverview,
    supportMessages,
    tokenBalance,
    docsPending,
    readyForStrategy,
    mailQueued,
    strategyInFlight,
  };
}
