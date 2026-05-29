import { Prisma, DisputeCaseStatus, type DisputeRoundKind, type DisputeTradelineStatus } from "@prisma/client";

import {
  applyDeterministicProductionRules,
  buildClaimReadinessMatrix,
  evaluateDisputeCase,
  type ConsumerGoal,
  type DisputeCase,
  type DisputeDeltaType,
  type DisputeResponseDefect,
  type DisputeResponseClass,
  type DisputeSpecialLane,
  type EvidenceItem,
  type TradelineCase,
  type TradelineScores,
} from "@/lib/dispute-engine";
import { prisma } from "@/lib/prisma";

type JsonObject = Prisma.JsonObject;
type JsonArray = Prisma.JsonArray;

function asArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: Prisma.JsonValue | null | undefined): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : undefined;
}

function toTradelineScores(value: Prisma.JsonValue): TradelineScores {
  const source = asObject(value) ?? {};

  return {
    evidenceScore: Number(source.evidenceScore ?? 0),
    removabilityScore: Number(source.removabilityScore ?? 0),
    deltaScore: Number(source.deltaScore ?? 0),
    resistanceScore: Number(source.resistanceScore ?? 0),
    damagesScore: Number(source.damagesScore ?? 0),
    arbitrationScore: Number(source.arbitrationScore ?? 0),
    fundingPriorityScore: Number(source.fundingPriorityScore ?? 0),
  };
}

function mapRoundKind(stage?: string | null): DisputeRoundKind {
  switch (stage) {
    case "bureau_round_1":
      return "BUREAU";
    case "furnisher_round_1":
      return "FURNISHER";
    case "contradiction_round":
      return "CONTRADICTION";
    case "complaint_escalation":
      return "COMPLAINT";
    case "pre_claim":
      return "PRE_CLAIM";
    case "arbitration_ready":
      return "ARBITRATION";
    case "litigation_referral":
      return "LITIGATION";
    case "monitoring":
      return "MONITORING";
    default:
      return "INTAKE";
  }
}

function mapCaseStatus(stage?: string | null): DisputeCaseStatus {
  switch (stage) {
    case "monitoring":
      return "MONITORING";
    case "complaint_escalation":
    case "pre_claim":
    case "arbitration_ready":
    case "litigation_referral":
      return "ESCALATED";
    case "bureau_round_1":
    case "furnisher_round_1":
    case "contradiction_round":
      return "ACTIVE";
    case "stage_0_intake":
      return "IN_REVIEW";
    default:
      return "DRAFT";
  }
}

function mapTradelineStatus(stage?: string | null): DisputeTradelineStatus {
  switch (stage) {
    case "monitoring":
      return "MONITORING";
    case "complaint_escalation":
    case "pre_claim":
    case "arbitration_ready":
    case "litigation_referral":
      return "ESCALATED";
    case "bureau_round_1":
    case "furnisher_round_1":
    case "contradiction_round":
      return "DISPUTED";
    default:
      return "ROUTED";
  }
}

function hydrateTradeline(record: {
  bureau: string;
  targetType: string;
  accountNumberMasked: string;
  accountType: string;
  theoryPrimary: string;
  remedyPrimary: string;
  furnisherName: string | null;
  collectorName: string | null;
  originalCreditor: string | null;
  responseClass: string | null;
  specialLane: string;
  precisePriorCraDispute: boolean;
  directFurnisherSufficiencyPassed: boolean;
  knownAccurate: boolean;
  balance: number | null;
  pastDue: number | null;
  monthlyPayment: number | null;
  dateOfFirstDelinquency: string | null;
  lastPaymentDate: string | null;
  remarksComments: string | null;
  scoresJson: Prisma.JsonValue;
  priorEventsJson: Prisma.JsonValue | null;
  responseDefectsJson: Prisma.JsonValue | null;
  evidenceItemsJson: Prisma.JsonValue | null;
  contradictionMetricsJson: Prisma.JsonValue | null;
  identityTheftPackageJson: Prisma.JsonValue | null;
  deltaTypesJson: Prisma.JsonValue | null;
  harmEventsJson: Prisma.JsonValue | null;
  readinessSignalsJson: Prisma.JsonValue | null;
}): TradelineCase {
  return {
    bureau: record.bureau,
    targetType: record.targetType,
    accountNumberMasked: record.accountNumberMasked,
    accountType: record.accountType,
    theoryPrimary: record.theoryPrimary,
    remedyPrimary: record.remedyPrimary,
    evidenceItems: asArray<EvidenceItem>(record.evidenceItemsJson),
    priorEvents: asArray<string>(record.priorEventsJson),
    responseDefects: asArray<DisputeResponseDefect>(record.responseDefectsJson),
    specialLane: record.specialLane as DisputeSpecialLane,
    scores: toTradelineScores(record.scoresJson),
    furnisherName: record.furnisherName ?? undefined,
    collectorName: record.collectorName ?? undefined,
    originalCreditor: record.originalCreditor ?? undefined,
    balance: record.balance ?? undefined,
    pastDue: record.pastDue ?? undefined,
    monthlyPayment: record.monthlyPayment ?? undefined,
    dateOfFirstDelinquency: record.dateOfFirstDelinquency ?? undefined,
    lastPaymentDate: record.lastPaymentDate ?? undefined,
    remarksComments: record.remarksComments ?? undefined,
    harmEvents: asArray<string>(record.harmEventsJson),
    responseClass: (record.responseClass ?? undefined) as DisputeResponseClass | undefined,
    precisePriorCraDispute: record.precisePriorCraDispute,
    directFurnisherSufficiencyPassed: record.directFurnisherSufficiencyPassed,
    knownAccurate: record.knownAccurate,
    contradictionMetrics: asObject(record.contradictionMetricsJson) as TradelineCase["contradictionMetrics"],
    identityTheftPackage: asObject(record.identityTheftPackageJson) as TradelineCase["identityTheftPackage"],
    deltaTypes: asArray<DisputeDeltaType>(record.deltaTypesJson),
    readinessSignals: asObject(record.readinessSignalsJson) as TradelineCase["readinessSignals"],
  };
}

export async function ensureDisputeCaseForClient(input: {
  tenantId: string;
  clientId: string;
  goal?: ConsumerGoal;
}) {
  return prisma.disputeCaseRecord.upsert({
    where: {
      tenantId_clientId: {
        tenantId: input.tenantId,
        clientId: input.clientId,
      },
    },
    update: input.goal
      ? {
          primaryGoal: input.goal,
        }
      : {},
    create: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      primaryGoal: input.goal ?? "delete_or_correct",
      status: "DRAFT",
    },
  });
}

export async function createDisputeTradeline(input: {
  disputeCaseId: string;
  bureau: string;
  targetType: string;
  accountNumberMasked: string;
  accountType: string;
  theoryPrimary: string;
  remedyPrimary: string;
  specialLane?: DisputeSpecialLane;
  responseClass?: DisputeResponseClass;
  furnisherName?: string;
  collectorName?: string;
  originalCreditor?: string;
  precisePriorCraDispute?: boolean;
  directFurnisherSufficiencyPassed?: boolean;
  knownAccurate?: boolean;
  balance?: number;
  pastDue?: number;
  monthlyPayment?: number;
  dateOfFirstDelinquency?: string;
  lastPaymentDate?: string;
  remarksComments?: string;
  scores: TradelineScores;
  priorEvents?: string[];
  responseDefects?: DisputeResponseDefect[];
  evidenceItems?: EvidenceItem[];
  contradictionMetrics?: TradelineCase["contradictionMetrics"];
  identityTheftPackage?: TradelineCase["identityTheftPackage"];
  deltaTypes?: DisputeDeltaType[];
  harmEvents?: string[];
  readinessSignals?: TradelineCase["readinessSignals"];
}) {
  return prisma.disputeTradelineRecord.create({
    data: {
      disputeCaseId: input.disputeCaseId,
      bureau: input.bureau,
      targetType: input.targetType,
      accountNumberMasked: input.accountNumberMasked,
      accountType: input.accountType,
      theoryPrimary: input.theoryPrimary,
      remedyPrimary: input.remedyPrimary,
      specialLane: input.specialLane ?? "standard",
      responseClass: input.responseClass,
      furnisherName: input.furnisherName,
      collectorName: input.collectorName,
      originalCreditor: input.originalCreditor,
      precisePriorCraDispute: input.precisePriorCraDispute ?? false,
      directFurnisherSufficiencyPassed: input.directFurnisherSufficiencyPassed ?? false,
      knownAccurate: input.knownAccurate ?? false,
      balance: input.balance,
      pastDue: input.pastDue,
      monthlyPayment: input.monthlyPayment,
      dateOfFirstDelinquency: input.dateOfFirstDelinquency,
      lastPaymentDate: input.lastPaymentDate,
      remarksComments: input.remarksComments,
      scoresJson: input.scores,
      priorEventsJson: input.priorEvents ?? [],
      responseDefectsJson: input.responseDefects ?? [],
      evidenceItemsJson: input.evidenceItems ?? [],
      contradictionMetricsJson: input.contradictionMetrics ?? Prisma.JsonNull,
      identityTheftPackageJson: input.identityTheftPackage ?? Prisma.JsonNull,
      deltaTypesJson: input.deltaTypes ?? [],
      harmEventsJson: input.harmEvents ?? [],
      readinessSignalsJson: input.readinessSignals ?? Prisma.JsonNull,
    },
  });
}

export async function runDisputeCaseEngine(input: {
  tenantId: string;
  disputeCaseId: string;
  triggeredBy?: string;
}) {
  const record = await prisma.disputeCaseRecord.findFirstOrThrow({
    where: {
      id: input.disputeCaseId,
      tenantId: input.tenantId,
    },
    include: {
      client: true,
      tradelines: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (record.tradelines.length === 0) {
    throw new Error("This dispute case has no tradelines yet.");
  }

  const caseFile: DisputeCase = {
    consumer: {
      fullName: `${record.client.firstName} ${record.client.lastName}`,
      currentAddress: "Address pending structured intake",
      dob: "DOB pending structured intake",
      ssnLast4: "0000",
      currentState: "Unknown",
    },
    fileContext: {
      reportSource: "manual_or_intake_seed",
      reportPullDates: [],
      bureauReportsPresent: Array.from(new Set(record.tradelines.map((item) => item.bureau))),
      identityTheftFlag: record.client.reportedIdentityTheft,
      fraudAlertFlag: false,
      securityFreezeFlag: false,
    },
    businessContext: {
      primaryGoal: record.primaryGoal as ConsumerGoal,
    },
    caseHistory: {
      priorDisputeHistoryPresent: record.client.disputedWithCreditBureaus,
      priorComplaintsPresent: record.client.authorizedCfpbComplaint || record.client.authorizedBbbComplaint,
      priorArbitrationOrLitigationPresent: false,
    },
    tradelines: record.tradelines.map(hydrateTradeline),
  };

  const caseEvaluation = evaluateDisputeCase(caseFile);
  const decisionSummaries = record.tradelines.map((tradelineRecord) => {
    const tradeline = hydrateTradeline(tradelineRecord);
    const readiness = buildClaimReadinessMatrix(caseFile, tradeline);
    const decision = applyDeterministicProductionRules(caseFile, tradeline);

    return {
      tradelineId: tradelineRecord.id,
      readiness,
      decision,
    };
  });

  const primaryStage = decisionSummaries[0]?.decision.finalStage ?? null;

  await prisma.$transaction(async (tx) => {
    for (const summary of decisionSummaries) {
      await tx.disputeTradelineRecord.update({
        where: { id: summary.tradelineId },
        data: {
          status: mapTradelineStatus(summary.decision.finalStage),
          latestDecisionStage: summary.decision.finalStage,
          latestEscalationOption: summary.decision.escalationOption,
          latestReadinessLevel: summary.readiness.readinessLevel,
          latestSuppressionFlagsJson: summary.decision.suppressionFlags,
          latestOverrideFlagsJson: summary.decision.humanOverrideFlags,
          latestDecisionJson: summary.decision as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.disputeRoundRecord.create({
        data: {
          disputeCaseId: record.id,
          disputeTradelineId: summary.tradelineId,
          roundKind: mapRoundKind(summary.decision.finalStage),
          stage: summary.decision.finalStage,
          escalationOption: summary.decision.escalationOption,
          triggeredBy: input.triggeredBy,
          resultSummaryJson: {
            readinessLevel: summary.readiness.readinessLevel,
            suppressionFlags: summary.decision.suppressionFlags,
            humanOverrideFlags: summary.decision.humanOverrideFlags,
            notes: summary.decision.notes,
          },
        },
      });
    }

    await tx.disputeCaseRecord.update({
      where: { id: record.id },
      data: {
        status: mapCaseStatus(primaryStage),
        currentStage: primaryStage,
        currentReadinessLevel: Math.max(...decisionSummaries.map((item) => item.readiness.readinessLevel), 0),
        latestEngineSummaryJson: {
          hardStops: caseEvaluation.hardStops,
          softStops: caseEvaluation.softStops,
          decisions: decisionSummaries.map((item) => ({
            tradelineId: item.tradelineId,
            finalStage: item.decision.finalStage,
            escalationOption: item.decision.escalationOption,
            readinessLevel: item.readiness.readinessLevel,
          })),
        },
        latestPacketOrderJson: caseEvaluation.recommendedPacketOrder.map((item) => ({
          bureau: item.bureau,
          accountNumberMasked: item.accountNumberMasked,
          theoryPrimary: item.theoryPrimary,
          targetType: item.targetType,
        })),
        latestEvaluatedAt: new Date(),
      },
    });

    await tx.disputeEngineRun.create({
      data: {
        tenantId: input.tenantId,
        disputeCaseId: record.id,
        triggeredBy: input.triggeredBy,
        primaryObjective: caseEvaluation.primaryObjective,
        hardStopsJson: caseEvaluation.hardStops,
        softStopsJson: caseEvaluation.softStops,
        packetOrderJson: caseEvaluation.recommendedPacketOrder.map((item) => ({
          bureau: item.bureau,
          accountNumberMasked: item.accountNumberMasked,
          theoryPrimary: item.theoryPrimary,
          targetType: item.targetType,
        })),
        decisionSummaryJson: decisionSummaries.map((item) => ({
          tradelineId: item.tradelineId,
          finalStage: item.decision.finalStage,
          escalationOption: item.decision.escalationOption,
          readinessLevel: item.readiness.readinessLevel,
          suppressionFlags: item.decision.suppressionFlags,
          humanOverrideFlags: item.decision.humanOverrideFlags,
        })),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: input.triggeredBy ? "USER" : "SYSTEM",
        eventType: "DISPUTE_ENGINE_RUN_COMPLETED",
        referenceType: "DISPUTE_CASE",
        referenceId: record.id,
        outputSnapshotJson: {
          tradelineCount: record.tradelines.length,
          currentStage: primaryStage,
          caseStatus: mapCaseStatus(primaryStage),
          topReadinessLevel: Math.max(...decisionSummaries.map((item) => item.readiness.readinessLevel), 0),
        },
      },
    });
  });

  return {
    caseId: record.id,
    tradelineCount: record.tradelines.length,
    currentStage: primaryStage,
    topReadinessLevel: Math.max(...decisionSummaries.map((item) => item.readiness.readinessLevel), 0),
  };
}

function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code);
}

export async function getTenantDisputeOverview(tenantId: string) {
  try {
    const [totalCases, openCases, escalatedCases, recentRuns] = await Promise.all([
      prisma.disputeCaseRecord.count({ where: { tenantId } }),
      prisma.disputeCaseRecord.count({
        where: {
          tenantId,
          status: {
            in: [DisputeCaseStatus.DRAFT, DisputeCaseStatus.IN_REVIEW, DisputeCaseStatus.ACTIVE, DisputeCaseStatus.MONITORING],
          },
        },
      }),
      prisma.disputeCaseRecord.count({
        where: {
          tenantId,
          status: DisputeCaseStatus.ESCALATED,
        },
      }),
      prisma.disputeEngineRun.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          primaryObjective: true,
          createdAt: true,
          disputeCaseId: true,
        },
      }),
    ]);

    return {
      totalCases,
      openCases,
      escalatedCases,
      recentRuns,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        totalCases: 0,
        openCases: 0,
        escalatedCases: 0,
        recentRuns: [],
      };
    }

    throw error;
  }
}
