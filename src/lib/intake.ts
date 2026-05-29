import { ClientLifecycleStage, CreditProviderClientStatus, MailPreference, Prisma } from "@prisma/client";
import { z } from "zod";

import { getProviderAffiliateLink } from "@/lib/credit-provider";
import { prisma } from "@/lib/prisma";

const booleanLikeSchema = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      return ["true", "1", "yes", "y", "on", "checked"].includes(value.trim().toLowerCase());
    }

    return false;
  });

const optionalTrimmedString = z.string().optional().transform((value) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
});

export const intakeWebhookSchema = z.object({
  tenantSlug: z.string().min(2),
  submissionId: z.string().min(1),
  formId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email().optional(),
  phone: z.string().optional(),
  mailPreference: z.enum(["REGULAR", "CERTIFIED"]).default("REGULAR"),
  fundingInterestPersonal: booleanLikeSchema,
  fundingInterestBusiness: booleanLikeSchema,
  reportedIdentityTheft: booleanLikeSchema,
  identityTheftNarrative: optionalTrimmedString,
  disputedWithCreditBureaus: booleanLikeSchema,
  authorizedFtcIdentityTheftReport: booleanLikeSchema,
  authorizedCfpbComplaint: booleanLikeSchema,
  authorizedBbbComplaint: booleanLikeSchema,
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export type IntakeWebhookInput = z.infer<typeof intakeWebhookSchema>;

export async function processIntakeWebhook(payload: IntakeWebhookInput) {
  const parsed = intakeWebhookSchema.parse(payload);

  const existingSubmission = await prisma.intakeSubmission.findFirst({
    where: {
      source: "JOTFORM",
      externalSubmissionId: parsed.submissionId,
      tenant: {
        slug: parsed.tenantSlug.toLowerCase(),
      },
    },
    include: {
      client: true,
      tenant: true,
    },
  });

  if (existingSubmission?.client && existingSubmission.tenant) {
    return {
      tenant: existingSubmission.tenant,
      client: existingSubmission.client,
      intakeSubmission: existingSubmission,
      duplicate: true,
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: parsed.tenantSlug.toLowerCase() },
  });

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        tenantId: tenant.id,
        externalIntakeId: parsed.submissionId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone || null,
        reportedIdentityTheft: parsed.reportedIdentityTheft,
        identityTheftNarrative: parsed.identityTheftNarrative || null,
        disputedWithCreditBureaus: parsed.disputedWithCreditBureaus,
        authorizedFtcIdentityTheftReport: parsed.authorizedFtcIdentityTheftReport,
        authorizedCfpbComplaint: parsed.authorizedCfpbComplaint,
        authorizedBbbComplaint: parsed.authorizedBbbComplaint,
        mailPreference: parsed.mailPreference === "CERTIFIED" ? MailPreference.CERTIFIED : MailPreference.REGULAR,
        fundingInterestPersonal: parsed.fundingInterestPersonal,
        fundingInterestBusiness: parsed.fundingInterestBusiness,
        lifecycleStage: ClientLifecycleStage.INTAKE_RECEIVED,
      },
    });

    const intakeSubmission = await tx.intakeSubmission.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        source: "JOTFORM",
        externalFormId: parsed.formId,
        externalSubmissionId: parsed.submissionId,
        rawPayloadJson: (parsed.rawPayload ?? payload) as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "system",
        eventType: "CLIENT_INTAKE_RECEIVED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: payload as Prisma.InputJsonValue,
        outputSnapshotJson: {
          clientId: client.id,
          intakeSubmissionId: intakeSubmission.id,
          lifecycleStage: client.lifecycleStage,
          reportedIdentityTheft: client.reportedIdentityTheft,
          disputedWithCreditBureaus: client.disputedWithCreditBureaus,
          authorizedCfpbComplaint: client.authorizedCfpbComplaint,
          authorizedBbbComplaint: client.authorizedBbbComplaint,
        },
      },
    });

    return { tenant, client, intakeSubmission, duplicate: false };
  });
}

function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code);
}

export async function getIntakeOverview(tenantId: string) {
  const stages = Object.values(ClientLifecycleStage);

  try {
    const [totalClients, totalSubmissions, stageCounts] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.intakeSubmission.count({ where: { tenantId } }),
      Promise.all(
        stages.map(async (stage) => ({
          stage,
          count: await prisma.client.count({
            where: {
              tenantId,
              lifecycleStage: stage,
            },
          }),
        })),
      ),
    ]);

    return {
      totalClients,
      totalSubmissions,
      stageCounts,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        totalClients: 0,
        totalSubmissions: 0,
        stageCounts: stages.map((stage) => ({ stage, count: 0 })),
      };
    }

    throw error;
  }
}

export async function getIntakeQueueSnapshot(tenantId: string) {
  try {
    return await prisma.client.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        intakeSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export async function updateClientLifecycleStage({
  tenantId,
  clientId,
  lifecycleStage,
  actorUserId,
}: {
  tenantId: string;
  clientId: string;
  lifecycleStage: ClientLifecycleStage;
  actorUserId?: string;
}) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
    },
  });

  if (!client) {
    throw new Error("Client not found for this tenant.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedClient = await tx.client.update({
      where: { id: clientId },
      data: {
        lifecycleStage,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: actorUserId ? "user" : "system",
        actorUserId: actorUserId ?? null,
        eventType: "CLIENT_LIFECYCLE_STAGE_UPDATED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          previousStage: client.lifecycleStage,
        },
        outputSnapshotJson: {
          newStage: lifecycleStage,
        },
      },
    });

    return updatedClient;
  });
}

export async function updateClientProviderSignupState({
  tenantId,
  clientId,
  actorUserId,
  action,
}: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
  action: "mark_sent" | "mark_completed" | "reset";
}) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
    },
    include: {
      tenant: {
        select: {
          creditProvider: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error("Client not found for this tenant.");
  }

  const fallbackSignupUrl = client.creditProviderSignupUrl ?? getProviderAffiliateLink(client.tenant.creditProvider) ?? null;

  const nextState =
    action === "mark_sent"
      ? {
          creditProviderStatus: CreditProviderClientStatus.SIGNUP_SENT,
          creditProviderSignupUrl: fallbackSignupUrl,
          creditProviderLastError: null,
        }
      : action === "mark_completed"
        ? {
            creditProviderStatus: CreditProviderClientStatus.SIGNUP_COMPLETED,
            creditProviderSignupUrl: fallbackSignupUrl,
            creditProviderLastError: null,
            creditProviderLastSyncedAt: new Date(),
          }
        : {
            creditProviderStatus: fallbackSignupUrl
              ? CreditProviderClientStatus.SIGNUP_LINK_READY
              : CreditProviderClientStatus.NOT_STARTED,
            creditProviderLastError: null,
          };

  return prisma.$transaction(async (tx) => {
    const updatedClient = await tx.client.update({
      where: { id: client.id },
      data: nextState,
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType:
          action === "mark_sent"
            ? "CLIENT_PROVIDER_SIGNUP_SENT"
            : action === "mark_completed"
              ? "CLIENT_PROVIDER_SIGNUP_COMPLETED"
              : "CLIENT_PROVIDER_SIGNUP_RESET",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          action,
          previousStatus: client.creditProviderStatus,
          previousSignupUrl: client.creditProviderSignupUrl,
        },
        outputSnapshotJson: {
          status: updatedClient.creditProviderStatus,
          signupUrl: updatedClient.creditProviderSignupUrl,
          lastSyncedAt: updatedClient.creditProviderLastSyncedAt,
        },
      },
    });

    return updatedClient;
  });
}
