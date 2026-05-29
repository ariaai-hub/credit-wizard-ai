import { Prisma } from "@prisma/client";
import { getCreditProviderRuntimeStatus, syncClientToCreditProvider } from "@/lib/credit-provider";
import { getCrcRuntimeStatus, syncClientToCrc } from "@/lib/crc";
import { prisma } from "@/lib/prisma";

const INTEGRATION_EVENT_TYPES = [
  "CRC_SYNC_STUBBED",
  "CRC_SYNC_READY",
  "CRC_SYNC_SKIPPED",
  "CRC_SYNC_FAILED",
  "CREDIT_PROVIDER_SYNC_STUBBED",
  "CREDIT_PROVIDER_SYNC_READY",
  "CREDIT_PROVIDER_SYNC_SKIPPED",
  "CREDIT_PROVIDER_SYNC_FAILED",
] as const;

type IntegrationSystemKey = "CRC" | "CREDIT_PROVIDER";
type SyncStatus = "stubbed" | "skipped" | "ready" | "failed";

export async function getTenantIntegrationSnapshot(tenantId: string) {
  const [tenant, recentEvents] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        crcConfigRef: true,
        creditProvider: true,
        creditProviderRef: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        eventType: {
          in: [...INTEGRATION_EVENT_TYPES],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        eventType: true,
        referenceId: true,
        outputSnapshotJson: true,
        createdAt: true,
      },
    }),
  ]);

  const latestCrcEvent = recentEvents.find((event) => event.eventType.startsWith("CRC_SYNC_")) ?? null;
  const latestCreditProviderEvent = recentEvents.find((event) => event.eventType.startsWith("CREDIT_PROVIDER_SYNC_")) ?? null;
  const crcRuntimeStatus = getCrcRuntimeStatus(tenant.crcConfigRef);
  const creditProviderRuntimeStatus = getCreditProviderRuntimeStatus({
    provider: tenant.creditProvider,
    creditProviderRef: tenant.creditProviderRef,
  });

  return {
    systems: [
      {
        key: "CRC" as const,
        label: "Credit Repair Cloud",
        status:
          crcRuntimeStatus.status === "ready"
            ? ("configured" as const)
            : crcRuntimeStatus.status === "ref_only"
              ? ("partial" as const)
              : ("missing_config" as const),
        reference: tenant.crcConfigRef,
        lastSyncedAt: latestCrcEvent?.createdAt ?? null,
        detail: crcRuntimeStatus.detail,
        mode: crcRuntimeStatus.liveMode ? "live" : "dry_run",
      },
      {
        key: "CREDIT_PROVIDER" as const,
        label: tenant.creditProvider,
        status:
          creditProviderRuntimeStatus.status === "ready"
            ? ("configured" as const)
            : creditProviderRuntimeStatus.status === "ref_only"
              ? ("partial" as const)
              : ("missing_config" as const),
        reference: tenant.creditProviderRef,
        lastSyncedAt: latestCreditProviderEvent?.createdAt ?? null,
        detail: creditProviderRuntimeStatus.detail,
        mode: creditProviderRuntimeStatus.liveMode ? "live" : "dry_run",
        affiliateLink: creditProviderRuntimeStatus.affiliateLink,
      },
    ],
    recentEvents,
  };
}

export async function syncClientToIntegrations({
  tenantId,
  clientId,
  actorUserId,
}: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
}) {
  const [tenant, client] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        crcConfigRef: true,
        creditProvider: true,
        creditProviderRef: true,
      },
    }),
    prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
      },
      include: {
        intakeSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  if (!client) {
    throw new Error("Client not found for this tenant.");
  }

  const results = [] as Array<{
    system: IntegrationSystemKey;
    label: string;
    status: SyncStatus;
    reason?: string;
      reference?: string;
    mode?: "dry_run" | "live";
  }>;

  const latestSubmission = client.intakeSubmissions[0] ?? null;

  try {
    const crcResult = await syncClientToCrc({
      tenant,
      client,
      latestSubmission,
    });

    if (crcResult.clientUpdate?.crcClientId) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          crcClientId: crcResult.clientUpdate.crcClientId,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: crcResult.status === "ready" ? "CRC_SYNC_READY" : "CRC_SYNC_SKIPPED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          tenantSlug: tenant.slug,
          crcConfigRef: tenant.crcConfigRef,
          client: {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            lifecycleStage: client.lifecycleStage,
          },
          latestSubmissionId: latestSubmission?.id ?? null,
        },
        outputSnapshotJson:
          crcResult.status === "ready"
            ? {
                mode: crcResult.mode,
                requestPreview: crcResult.requestPreview,
                responsePreview: crcResult.responsePreview ?? null,
                parsedResponse: crcResult.parsedResponse ?? null,
                clientUpdate: crcResult.clientUpdate ?? null,
              }
            : {
                reason: crcResult.reason,
                parsedResponse: crcResult.parsedResponse ?? null,
                clientUpdate: crcResult.clientUpdate ?? null,
              },
      },
    });

    results.push({
      system: "CRC",
      label: "Credit Repair Cloud",
      status: crcResult.status,
      reason: crcResult.status === "skipped" ? crcResult.reason : undefined,
      reference: tenant.crcConfigRef ?? undefined,
      mode: crcResult.status === "ready" ? crcResult.mode : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CRC sync failure.";

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CRC_SYNC_FAILED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          tenantSlug: tenant.slug,
          crcConfigRef: tenant.crcConfigRef,
          clientId: client.id,
        },
        outputSnapshotJson: {
          error: message,
        },
      },
    });

    results.push({
      system: "CRC",
      label: "Credit Repair Cloud",
      status: "failed",
      reason: message,
      reference: tenant.crcConfigRef ?? undefined,
    });
  }

  try {
    const providerResult = await syncClientToCreditProvider({
      tenant,
      client,
    });

    if (providerResult.clientUpdate) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          creditProviderStatus: providerResult.clientUpdate.creditProviderStatus,
          creditProviderExternalId: providerResult.clientUpdate.creditProviderExternalId ?? null,
          creditProviderSignupUrl: providerResult.clientUpdate.creditProviderSignupUrl ?? null,
          creditProviderLastSyncedAt: providerResult.clientUpdate.creditProviderLastSyncedAt,
          creditProviderLastError: providerResult.clientUpdate.creditProviderLastError ?? null,
          creditProviderLastResponseJson: providerResult.clientUpdate.creditProviderLastResponseJson,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: providerResult.status === "ready" ? "CREDIT_PROVIDER_SYNC_READY" : "CREDIT_PROVIDER_SYNC_SKIPPED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          tenantSlug: tenant.slug,
          creditProvider: tenant.creditProvider,
          creditProviderRef: tenant.creditProviderRef,
          client: {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            lifecycleStage: client.lifecycleStage,
          },
        },
        outputSnapshotJson:
          providerResult.status === "ready"
            ? {
                mode: providerResult.mode,
                requestPreview: providerResult.requestPreview,
                responsePreview: providerResult.responsePreview ?? null,
                clientUpdate: providerResult.clientUpdate,
              } satisfies Prisma.InputJsonValue
            : {
                reason: providerResult.reason,
                clientUpdate: providerResult.clientUpdate ?? null,
              } satisfies Prisma.InputJsonValue,
      },
    });

    results.push({
      system: "CREDIT_PROVIDER",
      label: tenant.creditProvider,
      status: providerResult.status,
      reason: providerResult.status === "skipped" ? providerResult.reason : undefined,
      reference: tenant.creditProviderRef ?? undefined,
      mode: providerResult.status === "ready" ? providerResult.mode : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown credit provider sync failure.";

    await prisma.client.update({
      where: { id: client.id },
      data: {
        creditProviderStatus: "FAILED",
        creditProviderLastError: message,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CREDIT_PROVIDER_SYNC_FAILED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          tenantSlug: tenant.slug,
          creditProvider: tenant.creditProvider,
          creditProviderRef: tenant.creditProviderRef,
          clientId: client.id,
        },
        outputSnapshotJson: {
          error: message,
        },
      },
    });

    results.push({
      system: "CREDIT_PROVIDER",
      label: tenant.creditProvider,
      status: "failed",
      reason: message,
      reference: tenant.creditProviderRef ?? undefined,
    });
  }

  return {
    client: {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
    },
    results,
  };
}
