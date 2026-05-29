import { Prisma, type CreditReportSourceType } from "@prisma/client";

import { storeCreditReportImportDocument } from "@/lib/document-storage";
import type { TradelineScores } from "@/lib/dispute-engine";
import { createDisputeTradeline, ensureDisputeCaseForClient } from "@/lib/dispute-runtime";
import { prisma } from "@/lib/prisma";

function sanitizeFileName(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "document";
}

function buildDefaultScores(input: {
  targetType: string;
  accountType: string;
  balance?: number;
  hasPriorDispute?: boolean;
}): TradelineScores {
  const derogatoryBoost = /collection|charge|late|repossession|public/i.test(`${input.targetType} ${input.accountType}`) ? 2 : 0;
  const balanceBoost = input.balance && input.balance > 0 ? 1 : 0;

  return {
    evidenceScore: input.hasPriorDispute ? 2 : 1,
    removabilityScore: 2 + derogatoryBoost,
    deltaScore: input.hasPriorDispute ? 2 : 1,
    resistanceScore: input.hasPriorDispute ? 2 : 1,
    damagesScore: balanceBoost,
    arbitrationScore: 0,
    fundingPriorityScore: 2 + derogatoryBoost + balanceBoost,
  };
}

export async function createCreditReportImport(input: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
  file: File;
  sourceType?: CreditReportSourceType;
  providerLabel?: string;
  notes?: string;
  reportPulledAt?: string;
}) {
  if (!(input.file instanceof File) || input.file.size === 0) {
    throw new Error("Attach a report file before submitting.");
  }

  const client = await prisma.client.findFirst({
    where: {
      id: input.clientId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      disputedWithCreditBureaus: true,
    },
  });

  if (!client) {
    throw new Error("Client not found for this tenant.");
  }

  const disputeCase = await ensureDisputeCaseForClient({
    tenantId: input.tenantId,
    clientId: input.clientId,
  });

  const timestamp = Date.now();
  const safeName = sanitizeFileName(input.file.name);
  const storedName = `${timestamp}-${safeName}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const storageResult = await storeCreditReportImportDocument({
    tenantId: client.tenantId,
    clientId: client.id,
    fileName: storedName,
    contentType: input.file.type || null,
    buffer,
  });

  return prisma.$transaction(async (tx) => {
    const reportImport = await tx.creditReportImport.create({
      data: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        disputeCaseId: disputeCase.id,
        sourceType: input.sourceType ?? "STAFF_UPLOAD",
        status: "REVIEW_PENDING",
        providerLabel: input.providerLabel?.trim() || null,
        fileName: storedName,
        originalFileName: input.file.name,
        contentType: input.file.type || null,
        storageProvider: storageResult.storageProvider,
        storagePath: storageResult.storedPath,
        bucketName: storageResult.bucketName,
        reportPulledAt: input.reportPulledAt ? new Date(input.reportPulledAt) : null,
        notes: input.notes?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: "USER",
        actorUserId: input.actorUserId,
        eventType: "CREDIT_REPORT_IMPORT_CREATED",
        referenceType: "CREDIT_REPORT_IMPORT",
        referenceId: reportImport.id,
        inputSnapshotJson: {
          sourceType: input.sourceType ?? "STAFF_UPLOAD",
          providerLabel: input.providerLabel?.trim() || null,
          notes: input.notes?.trim() || null,
          originalFileName: input.file.name,
          reportPulledAt: input.reportPulledAt || null,
        },
        outputSnapshotJson: {
          storagePath: reportImport.storagePath,
          disputeCaseId: disputeCase.id,
          status: reportImport.status,
        },
      },
    });

    return reportImport;
  });
}

export async function addManualTradelineImport(input: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
  bureau: string;
  targetType: string;
  accountNumberMasked: string;
  accountType: string;
  theoryPrimary: string;
  remedyPrimary: string;
  furnisherName?: string;
  balance?: number;
  pastDue?: number;
  monthlyPayment?: number;
  sourceLabel?: string;
  notes?: string;
}) {
  const client = await prisma.client.findFirst({
    where: {
      id: input.clientId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      disputedWithCreditBureaus: true,
    },
  });

  if (!client) {
    throw new Error("Client not found for this tenant.");
  }

  const disputeCase = await ensureDisputeCaseForClient({
    tenantId: input.tenantId,
    clientId: input.clientId,
  });

  const reportImport = await prisma.creditReportImport.create({
    data: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      disputeCaseId: disputeCase.id,
      sourceType: "MANUAL_ENTRY",
      status: "NORMALIZED",
      providerLabel: input.sourceLabel?.trim() || "manual_operator_entry",
      notes: input.notes?.trim() || null,
      importedAt: new Date(),
    },
  });

  const scores = buildDefaultScores({
    targetType: input.targetType,
    accountType: input.accountType,
    balance: input.balance,
    hasPriorDispute: client.disputedWithCreditBureaus,
  });

  const disputeTradeline = await createDisputeTradeline({
    disputeCaseId: disputeCase.id,
    bureau: input.bureau,
    targetType: input.targetType,
    accountNumberMasked: input.accountNumberMasked,
    accountType: input.accountType,
    theoryPrimary: input.theoryPrimary,
    remedyPrimary: input.remedyPrimary,
    furnisherName: input.furnisherName,
    balance: input.balance,
    pastDue: input.pastDue,
    monthlyPayment: input.monthlyPayment,
    precisePriorCraDispute: client.disputedWithCreditBureaus,
    scores,
    deltaTypes: client.disputedWithCreditBureaus ? ["new_primary_source_document"] : [],
  });

  const tradelineImport = await prisma.creditReportTradelineImport.create({
    data: {
      creditReportImportId: reportImport.id,
      disputeTradelineId: disputeTradeline.id,
      bureau: input.bureau,
      targetType: input.targetType,
      accountNumberMasked: input.accountNumberMasked,
      accountType: input.accountType,
      theoryPrimary: input.theoryPrimary,
      remedyPrimary: input.remedyPrimary,
      furnisherName: input.furnisherName,
      balance: input.balance,
      pastDue: input.pastDue,
      monthlyPayment: input.monthlyPayment,
      scoresJson: scores as unknown as Prisma.InputJsonValue,
      deltaTypesJson: client.disputedWithCreditBureaus ? (["new_primary_source_document"] as const) : [],
      notes: input.notes?.trim() || null,
      importedToDisputeCaseAt: new Date(),
      readyForEngine: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorType: "USER",
      actorUserId: input.actorUserId,
      eventType: "CREDIT_REPORT_TRADELINE_IMPORTED",
      referenceType: "DISPUTE_TRADELINE",
      referenceId: disputeTradeline.id,
      inputSnapshotJson: {
        clientId: input.clientId,
        creditReportImportId: reportImport.id,
        bureau: input.bureau,
        targetType: input.targetType,
        accountNumberMasked: input.accountNumberMasked,
      },
      outputSnapshotJson: {
        disputeCaseId: disputeCase.id,
        tradelineImportId: tradelineImport.id,
        readyForEngine: true,
      },
    },
  });

  return {
    disputeCase,
    disputeTradeline,
    reportImport,
    tradelineImport,
  };
}

export async function getClientCreditReportImportSnapshot(tenantId: string, clientIds: string[]) {
  if (clientIds.length === 0) {
    return [];
  }

  return prisma.creditReportImport.findMany({
    where: {
      tenantId,
      clientId: {
        in: clientIds,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      clientId: true,
      sourceType: true,
      status: true,
      providerLabel: true,
      originalFileName: true,
      reportPulledAt: true,
      importedAt: true,
      createdAt: true,
      _count: {
        select: {
          tradelines: true,
        },
      },
    },
  });
}
