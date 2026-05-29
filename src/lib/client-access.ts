import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

import { storeClientPortalDocument } from "@/lib/document-storage";
import { prisma } from "@/lib/prisma";

const CLIENT_PORTAL_TTL_SECONDS = 60 * 60 * 24 * 14;

const clientPortalEligibilitySchema = z
  .object({
    reportedIdentityTheft: z.boolean(),
    identityTheftNarrative: z.string().optional(),
    disputedWithCreditBureaus: z.boolean(),
    authorizedFtcIdentityTheftReport: z.boolean(),
    authorizedCfpbComplaint: z.boolean(),
    authorizedBbbComplaint: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.reportedIdentityTheft && !value.identityTheftNarrative?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["identityTheftNarrative"],
        message: "If identity theft is involved, give a short explanation so we can expand it into the formal reports.",
      });
    }
  });

type ClientPortalTokenPayload = {
  tenantId: string;
  clientId: string;
  kind: "client_portal_access";
};

function getClientPortalSecret() {
  const secret = process.env.CLIENT_PORTAL_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CLIENT_PORTAL_SECRET or SESSION_SECRET environment variable is required in production.");
    }
    console.warn("[CLIENT-ACCESS] CLIENT_PORTAL_SECRET/SESSION_SECRET not set. Using insecure dev fallback.");
    return new TextEncoder().encode("dev-insecure-client-portal-fallback");
  }
  return new TextEncoder().encode(secret);
}

function sanitizeFileName(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "document";
}

export async function createClientPortalAccessToken({
  tenantId,
  clientId,
}: {
  tenantId: string;
  clientId: string;
}) {
  return new SignJWT({ tenantId, clientId, kind: "client_portal_access" satisfies ClientPortalTokenPayload["kind"] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CLIENT_PORTAL_TTL_SECONDS}s`)
    .sign(getClientPortalSecret());
}

export async function verifyClientPortalAccessToken(token: string) {
  try {
    const verified = await jwtVerify<ClientPortalTokenPayload>(token, getClientPortalSecret());
    if (verified.payload.kind !== "client_portal_access") {
      return null;
    }
    return verified.payload;
  } catch {
    return null;
  }
}

// ─── Onboarding token ────────────────────────────────────────────────────────

const ONBOARDING_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type OnboardingTokenPayload = {
  tenantId: string;
  clientId: string;
  kind: "client_onboarding";
};

export async function createOnboardingToken({
  tenantId,
  clientId,
}: {
  tenantId: string;
  clientId: string;
}) {
  return new SignJWT({ tenantId, clientId, kind: "client_onboarding" satisfies OnboardingTokenPayload["kind"] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONBOARDING_TOKEN_TTL_SECONDS}s`)
    .sign(getClientPortalSecret());
}

export async function verifyOnboardingToken(token: string) {
  try {
    const verified = await jwtVerify<OnboardingTokenPayload>(token, getClientPortalSecret());
    if (verified.payload.kind !== "client_onboarding") {
      return null;
    }
    return verified.payload;
  } catch {
    return null;
  }
}

export async function getClientPortalDocumentActivity({
  tenantId,
  clientId,
}: {
  tenantId: string;
  clientId: string;
}) {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      referenceType: "client",
      referenceId: clientId,
      eventType: {
        in: ["CLIENT_PORTAL_DOCUMENT_SUBMITTED"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

function buildClientPortalSupportReply(message: string, firstName: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("document") || normalized.includes("upload") || normalized.includes("id") || normalized.includes("proof")) {
    return `${firstName}, I can help with that. If we asked for a document, upload it in the portal and we will attach it to your file automatically. If you are missing something specific, say which document and we will tell you exactly what to send.`;
  }

  if (normalized.includes("funding") || normalized.includes("loan") || normalized.includes("capital")) {
    return `${firstName}, funding interest is noted. As your file improves, we re-check you for funding candidacy automatically. If you want personal funding, business funding, or both, mark it in the funding section below.`;
  }

  if (normalized.includes("dispute") || normalized.includes("negative item") || normalized.includes("deletion") || normalized.includes("status")) {
    return `${firstName}, your portal already tracks negative items, submitted disputes, and deletions. If something looks off, send the detail here and our support flow will flag it for review.`;
  }

  return `${firstName}, your message is in. Support has it now, and the team will keep your file moving. If you need anything specific, send it in one short sentence so we can route it fast.`;
}

export async function getClientPortalSupportThread({
  tenantId,
  clientId,
}: {
  tenantId: string;
  clientId: string;
}) {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      referenceType: "client",
      referenceId: clientId,
      eventType: {
        in: ["CLIENT_PORTAL_SUPPORT_MESSAGE", "CLIENT_PORTAL_SUPPORT_REPLY"],
      },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
}

export async function submitClientPortalDocument({
  token,
  documentType,
  notes,
  file,
}: {
  token: string;
  documentType: string;
  notes?: string;
  file: File;
}) {
  const payload = await verifyClientPortalAccessToken(token);

  if (!payload) {
    throw new Error("Invalid or expired client access link.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please attach a file before submitting.");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: payload.clientId,
      tenantId: payload.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!client) {
    throw new Error("Client record not found.");
  }

  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const storedName = `${timestamp}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageResult = await storeClientPortalDocument({
    tenantId: client.tenantId,
    clientId: client.id,
    fileName: storedName,
    contentType: file.type || null,
    buffer,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: client.tenantId,
      actorType: "client_portal",
      eventType: "CLIENT_PORTAL_DOCUMENT_SUBMITTED",
      referenceType: "client",
      referenceId: client.id,
      inputSnapshotJson: {
        documentType,
        notes: notes?.trim() || null,
        originalFileName: file.name,
        contentType: file.type || null,
        sizeBytes: file.size,
      },
      outputSnapshotJson: {
        storedPath: storageResult.storedPath,
        storedFileName: storedName,
        storageProvider: storageResult.storageProvider,
        bucketName: storageResult.bucketName,
        submittedAt: new Date(),
      },
    },
  });

  return {
    relativePath: storageResult.storedPath,
    storedName,
  };
}

export async function saveClientPortalReportEligibility({
  token,
  reportedIdentityTheft,
  identityTheftNarrative,
  disputedWithCreditBureaus,
  authorizedFtcIdentityTheftReport,
  authorizedCfpbComplaint,
  authorizedBbbComplaint,
}: {
  token: string;
  reportedIdentityTheft: boolean;
  identityTheftNarrative?: string;
  disputedWithCreditBureaus: boolean;
  authorizedFtcIdentityTheftReport: boolean;
  authorizedCfpbComplaint: boolean;
  authorizedBbbComplaint: boolean;
}) {
  const payload = await verifyClientPortalAccessToken(token);

  if (!payload) {
    throw new Error("Invalid or expired client access link.");
  }

  const parsed = clientPortalEligibilitySchema.parse({
    reportedIdentityTheft,
    identityTheftNarrative,
    disputedWithCreditBureaus,
    authorizedFtcIdentityTheftReport,
    authorizedCfpbComplaint,
    authorizedBbbComplaint,
  });

  const client = await prisma.client.findFirst({
    where: {
      id: payload.clientId,
      tenantId: payload.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      reportedIdentityTheft: true,
      identityTheftNarrative: true,
      disputedWithCreditBureaus: true,
      authorizedFtcIdentityTheftReport: true,
      authorizedCfpbComplaint: true,
      authorizedBbbComplaint: true,
    },
  });

  if (!client) {
    throw new Error("Client record not found.");
  }

  const nextState = {
    reportedIdentityTheft: parsed.reportedIdentityTheft,
    identityTheftNarrative: parsed.identityTheftNarrative?.trim() || null,
    disputedWithCreditBureaus: parsed.disputedWithCreditBureaus,
    authorizedFtcIdentityTheftReport: parsed.authorizedFtcIdentityTheftReport,
    authorizedCfpbComplaint: parsed.authorizedCfpbComplaint,
    authorizedBbbComplaint: parsed.authorizedBbbComplaint,
  };

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: client.id },
      data: nextState,
    });

    await tx.auditLog.create({
      data: {
        tenantId: client.tenantId,
        actorType: "client_portal",
        eventType: "CLIENT_PORTAL_REPORT_ELIGIBILITY_UPDATED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          previous: client,
        },
        outputSnapshotJson: nextState,
      },
    });
  });

  return nextState;
}

export async function saveClientPortalFundingPreferences({
  token,
  fundingInterestPersonal,
  fundingInterestBusiness,
}: {
  token: string;
  fundingInterestPersonal: boolean;
  fundingInterestBusiness: boolean;
}) {
  const payload = await verifyClientPortalAccessToken(token);

  if (!payload) {
    throw new Error("Invalid or expired client access link.");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: payload.clientId,
      tenantId: payload.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      fundingInterestPersonal: true,
      fundingInterestBusiness: true,
    },
  });

  if (!client) {
    throw new Error("Client record not found.");
  }

  const nextState = {
    fundingInterestPersonal,
    fundingInterestBusiness,
  };

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: client.id },
      data: nextState,
    });

    await tx.auditLog.create({
      data: {
        tenantId: client.tenantId,
        actorType: "client_portal",
        eventType: "CLIENT_PORTAL_FUNDING_PREFERENCES_UPDATED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          previous: client,
        },
        outputSnapshotJson: nextState,
      },
    });
  });

  return nextState;
}

export async function submitClientPortalSupportMessage({
  token,
  message,
}: {
  token: string;
  message: string;
}) {
  const payload = await verifyClientPortalAccessToken(token);

  if (!payload) {
    throw new Error("Invalid or expired client access link.");
  }

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Please enter a message before sending.");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: payload.clientId,
      tenantId: payload.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
    },
  });

  if (!client) {
    throw new Error("Client record not found.");
  }

  const reply = buildClientPortalSupportReply(trimmedMessage, client.firstName || "there");

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        tenantId: client.tenantId,
        actorType: "client_portal",
        eventType: "CLIENT_PORTAL_SUPPORT_MESSAGE",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          message: trimmedMessage,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: client.tenantId,
        actorType: "support_bot",
        eventType: "CLIENT_PORTAL_SUPPORT_REPLY",
        referenceType: "client",
        referenceId: client.id,
        outputSnapshotJson: {
          message: reply,
        },
      },
    });
  });

  return { reply };
}
