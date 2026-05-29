import { prisma } from "@/lib/prisma";
import { getProviderSignupFollowUpDecision } from "@/lib/provider-signup";
import { sendClientProviderSignupEmail, sendClientProviderSignupSms } from "@/lib/invite-delivery";
import { updateClientProviderSignupState } from "@/lib/intake";

type FollowUpRunResult = {
  clientId: string;
  clientName: string;
  action: "sms" | "email" | "manual";
  level: number;
  status: "dry_run" | "sent" | "skipped" | "failed";
  reason?: string;
};

function getClientDisplayName(client: { firstName: string; lastName: string }) {
  return `${client.firstName} ${client.lastName}`.trim();
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function buildStatusBreakdown(results: FollowUpRunResult[]) {
  return results.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
    return accumulator;
  }, {});
}

export async function getProviderSignupFollowUpQueue(tenantId: string) {
  const clients = await prisma.client.findMany({
    where: {
      tenantId,
      creditProviderStatus: {
        in: ["SIGNUP_LINK_READY", "SIGNUP_SENT"],
      },
    },
    include: {
      tenant: {
        select: {
          name: true,
          creditProvider: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return clients.map((client) => ({
    client,
    decision: getProviderSignupFollowUpDecision({
      status: client.creditProviderStatus,
      lastTouchedAt: client.creditProviderLastSyncedAt ?? client.updatedAt,
      hasEmail: Boolean(client.email),
      hasPhone: Boolean(client.phone),
    }),
  }));
}

async function runProviderSignupFollowUpsCore({
  tenantId,
  actorUserId,
  dryRun,
}: {
  tenantId: string;
  actorUserId: string;
  dryRun: boolean;
}) {
  const queue = await getProviderSignupFollowUpQueue(tenantId);
  const dueItems = queue.filter((item) => item.decision.due);
  const results: FollowUpRunResult[] = [];

  for (const item of dueItems) {
    const { client, decision } = item;
    const action = decision.recommendedChannel;

    if (dryRun) {
      results.push({
        clientId: client.id,
        clientName: getClientDisplayName(client),
        action,
        level: decision.level,
        status: "dry_run",
        reason: decision.label,
      });
      continue;
    }

    try {
      if (action === "sms") {
        const smsResult = await sendClientProviderSignupSms({
          tenantId,
          clientId: client.id,
          actorUserId,
          followUpLevel: decision.level,
        });

        if (smsResult.status === "sent") {
          await updateClientProviderSignupState({
            tenantId,
            clientId: client.id,
            actorUserId,
            action: "mark_sent",
          });
        }

        results.push({
          clientId: client.id,
          clientName: getClientDisplayName(client),
          action,
          level: decision.level,
          status: smsResult.status,
          reason: "reason" in smsResult ? smsResult.reason : undefined,
        });
        continue;
      }

      if (action === "email") {
        const emailResult = await sendClientProviderSignupEmail({
          tenantId,
          clientId: client.id,
          actorUserId,
        });

        if (emailResult.status === "sent") {
          await updateClientProviderSignupState({
            tenantId,
            clientId: client.id,
            actorUserId,
            action: "mark_sent",
          });
        }

        results.push({
          clientId: client.id,
          clientName: getClientDisplayName(client),
          action,
          level: decision.level,
          status: emailResult.status,
          reason: "reason" in emailResult ? emailResult.reason : undefined,
        });
        continue;
      }

      results.push({
        clientId: client.id,
        clientName: getClientDisplayName(client),
        action,
        level: decision.level,
        status: "skipped",
        reason: "No automated channel available",
      });
    } catch (error) {
      results.push({
        clientId: client.id,
        clientName: getClientDisplayName(client),
        action,
        level: decision.level,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown follow-up failure",
      });
    }
  }

  return {
    dueCount: dueItems.length,
    results,
  };
}

export async function runProviderSignupFollowUps({
  tenantId,
  actorUserId,
  dryRun = true,
  actorType = "SYSTEM",
  trigger = "automation_api",
}: {
  tenantId: string;
  actorUserId: string;
  dryRun?: boolean;
  actorType?: string;
  trigger?: string;
}) {
  const startedAt = new Date();
  const inputSnapshot = {
    dryRun,
    mode: dryRun ? "dry_run" : "live",
    trigger,
    startedAt,
  };

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorType,
      actorUserId,
      eventType: "PROVIDER_SIGNUP_FOLLOWUP_RUN_STARTED",
      referenceType: "TENANT",
      referenceId: tenantId,
      inputSnapshotJson: inputSnapshot,
    },
  });

  try {
    const result = await runProviderSignupFollowUpsCore({
      tenantId,
      actorUserId,
      dryRun,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType,
        actorUserId,
        eventType: "PROVIDER_SIGNUP_FOLLOWUP_RUN_COMPLETED",
        referenceType: "TENANT",
        referenceId: tenantId,
        inputSnapshotJson: inputSnapshot,
        outputSnapshotJson: {
          finishedAt: new Date(),
          dueCount: result.dueCount,
          resultCount: result.results.length,
          statusBreakdown: buildStatusBreakdown(result.results),
          results: result.results.slice(0, 25),
        },
      },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown follow-up automation error.";

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType,
        actorUserId,
        eventType: "PROVIDER_SIGNUP_FOLLOWUP_RUN_FAILED",
        referenceType: "TENANT",
        referenceId: tenantId,
        inputSnapshotJson: inputSnapshot,
        outputSnapshotJson: {
          finishedAt: new Date(),
          error: message,
        },
      },
    });

    throw error;
  }
}

export async function getProviderSignupFollowUpRunHistory(tenantId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      eventType: {
        in: [
          "PROVIDER_SIGNUP_FOLLOWUP_RUN_STARTED",
          "PROVIDER_SIGNUP_FOLLOWUP_RUN_COMPLETED",
          "PROVIDER_SIGNUP_FOLLOWUP_RUN_FAILED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return logs.map((log) => {
    const input = toRecord(log.inputSnapshotJson);
    const output = toRecord(log.outputSnapshotJson);
    const statusBreakdownRecord = toRecord(output?.statusBreakdown);

    return {
      id: log.id,
      eventType: log.eventType,
      actorType: log.actorType,
      actorUserName: log.actorUser?.name ?? log.actorUser?.email ?? null,
      createdAt: log.createdAt,
      dryRun: toBoolean(input?.dryRun),
      mode: toStringValue(input?.mode),
      trigger: toStringValue(input?.trigger),
      dueCount: toNumber(output?.dueCount),
      resultCount: toNumber(output?.resultCount),
      error: toStringValue(output?.error),
      statusBreakdown: statusBreakdownRecord
        ? Object.entries(statusBreakdownRecord)
            .map(([status, count]) => ({
              status,
              count: typeof count === "number" ? count : Number(count),
            }))
            .filter((entry) => Number.isFinite(entry.count))
        : [],
    };
  });
}
