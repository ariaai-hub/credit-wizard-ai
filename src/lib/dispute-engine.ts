export const DISPUTE_HARD_STOPS = [
  "invented_fact",
  "unsupported_damage_claim",
  "unsupported_arbitration_reference",
  "unsupported_state_law_reference",
  "dispute_of_known_accurate_information",
  "duplicate_round_without_meaningful_delta",
  "identity_theft_lane_without_required_package",
  "direct_furnisher_lane_without_sufficiency_check",
] as const;

export const DISPUTE_SOFT_STOPS = [
  "overbroad_omnibus_packet",
  "page_padding_without_relevance",
  "multi-theory_confusion",
  "emotional_language_over_factual_language",
  "premature_preclaim_tone",
] as const;

export const DISPUTE_DELTA_TYPES = [
  "new_primary_source_document",
  "new_cross_bureau_contradiction",
  "new_furnisher_vs_bureau_contradiction",
  "new_response_defect",
  "new_reinsertion_event",
  "new_harm_document",
  "new_timing_violation",
  "new_identity_theft_document",
  "new_designated_address_or_party_correction",
  "new_legal_trigger_from_state_overlay",
] as const;

export const DISPUTE_RESPONSE_DEFECTS = [
  "verified_without_addressing_document",
  "verified_despite_cross_bureau_conflict",
  "verified_despite_furnisher_conflict",
  "updated_noncore_field_only",
  "deleted_elsewhere_verified_here",
  "identity_deficiency_asserted_despite_sufficient_docs",
  "no_results_notice",
  "no_substantive_response",
  "reinserted_after_deletion",
  "failed_to_mark_disputed",
  "continued_reporting_after_documentary_notice",
  "collector_original_creditor_double_reporting_conflict",
  "timing_window_violation",
] as const;

export const DISPUTE_RESPONSE_CLASSES = [
  "deleted",
  "corrected_as_requested",
  "corrected_but_incomplete",
  "verified_without_addressing_document",
  "verified_despite_cross_bureau_conflict",
  "verified_despite_furnisher_conflict",
  "updated_noncore_field_only",
  "deleted_elsewhere_verified_here",
  "identity_deficiency_asserted_despite_sufficient_docs",
  "frivolous_or_irrelevant_notice",
  "no_results_notice",
  "no_substantive_response",
  "timing_window_violation",
  "reinserted",
  "blocked",
  "denied_block",
  "failed_to_mark_disputed",
  "continued_reporting_after_documentary_notice",
] as const;

export const DISPUTE_STAGES = [
  "stage_0_intake",
  "bureau_round_1",
  "furnisher_round_1",
  "contradiction_round",
  "complaint_escalation",
  "pre_claim",
  "arbitration_ready",
  "litigation_referral",
  "monitoring",
] as const;

export const DISPUTE_SPECIAL_LANES = [
  "standard",
  "identity_theft",
  "statutory_block",
  "mixed_file",
  "duplicate_reporting",
  "reinsertion",
  "inquiry_only",
] as const;

export const ESCALATION_OPTIONS = [
  "bureau_round",
  "direct_furnisher_round",
  "CFPB_complaint",
  "state_AG_or_regulator_complaint",
  "BBB_secondary_pressure",
  "pre_claim_notice",
  "arbitration_packet",
  "litigation_referral",
] as const;

export const UNIFIED_DISPUTE_FRAMEWORK = {
  baseLayer: {
    name: "core_legal_and_workflow_engine",
    responsibilities: [
      "dispute_generation",
      "escalation_routing",
      "damages_preservation",
      "statutory_identity_theft_block_logic",
      "contradiction_analysis",
      "response_defect_handling",
      "arbitration_gating",
      "funding_readiness_prioritization",
    ],
  },
  optimizationLayer: {
    name: "performance_and_moat_layer",
    responsibilities: [
      "live_50_state_legal_overlay_library",
      "bureau_specific_and_furnisher_specific_playbooks",
      "outcome_trained_packet_optimization",
      "claim_readiness_matrix_for_arbitration_or_litigation_handoff",
      "deterministic_production_rules_with_thresholds_fallbacks_and_conflict_resolution",
    ],
    buildPriority: [
      "deterministic_production_rules_engine",
      "claim_readiness_matrix",
      "live_50_state_legal_library",
      "bureau_and_furnisher_playbooks",
      "outcome_trained_packet_optimization",
    ],
  },
  precedenceRules: [
    "legal_supportability_and_factual_truth_override_optimization",
    "hard_guardrails_cannot_be_removed_by_optimization",
    "unsupported_claims_arbitration_references_state_law_references_and_disputes_of_accurate_information_are_blocked",
    "output_prioritizes_lawful_removals_corrections_speed_to_funding_readiness_contradiction_heavy_packet_quality_and_escalation_readiness",
  ],
} as const;

export const MOAT_LAYER_MODULES = [
  "deterministic_production_rules_engine",
  "claim_readiness_matrix",
  "live_50_state_legal_library",
  "bureau_and_furnisher_playbooks",
  "outcome_trained_packet_optimization",
] as const;

export const CLAIM_READINESS_LEVELS = {
  0: "not preserved",
  1: "reservation only",
  2: "plausible",
  3: "escalation ready",
  4: "arbitration/litigation handoff ready",
} as const;

export const MOAT_LAYER_MINIMUM_VIABLE = {
  requires: [
    "deterministic rules engine live",
    "claim-readiness matrix live",
    "state-law library active for all 50 states",
    "at least initial bureau playbooks",
    "at least top furnisher playbooks by volume",
    "outcome learning loop collecting structured performance data",
  ],
} as const;

export type DisputeHardStop = (typeof DISPUTE_HARD_STOPS)[number];
export type DisputeSoftStop = (typeof DISPUTE_SOFT_STOPS)[number];
export type DisputeDeltaType = (typeof DISPUTE_DELTA_TYPES)[number];
export type DisputeResponseDefect = (typeof DISPUTE_RESPONSE_DEFECTS)[number];
export type DisputeResponseClass = (typeof DISPUTE_RESPONSE_CLASSES)[number];
export type DisputeStage = (typeof DISPUTE_STAGES)[number];
export type DisputeSpecialLane = (typeof DISPUTE_SPECIAL_LANES)[number];
export type EscalationOption = (typeof ESCALATION_OPTIONS)[number];
export type MoatLayerModule = (typeof MOAT_LAYER_MODULES)[number];

export type ConsumerGoal =
  | "delete_or_correct"
  | "block_identity_theft_information"
  | "stop_reinsertion"
  | "stop_inaccurate_furnishing"
  | "preserve_claims"
  | "improve_underwriting_profile"
  | "reduce_denial_risk"
  | "reduce_cost_of_credit"
  | "accelerate_funding_readiness";

export type EvidenceItem = {
  id: string;
  type: string;
  label: string;
  contradictionValue?: number;
  primarySource?: boolean;
  tiedToNarrative?: boolean;
  tiedToDisputedItem?: boolean;
};

export type TradelineScores = {
  evidenceScore: number;
  removabilityScore: number;
  deltaScore: number;
  resistanceScore: number;
  damagesScore: number;
  arbitrationScore: number;
  fundingPriorityScore: number;
};

export type TradelineCase = {
  bureau: string;
  targetType: string;
  accountNumberMasked: string;
  accountType: string;
  theoryPrimary: string;
  remedyPrimary: string;
  evidenceItems: EvidenceItem[];
  priorEvents: string[];
  responseDefects: DisputeResponseDefect[];
  specialLane: DisputeSpecialLane;
  scores: TradelineScores;
  furnisherName?: string;
  collectorName?: string;
  originalCreditor?: string;
  status?: string;
  balance?: number;
  pastDue?: number;
  monthlyPayment?: number;
  dateOfFirstDelinquency?: string;
  lastPaymentDate?: string;
  remarksComments?: string;
  harmEvents?: string[];
  responseClass?: DisputeResponseClass;
  precisePriorCraDispute?: boolean;
  directFurnisherSufficiencyPassed?: boolean;
  knownAccurate?: boolean;
  identityTheftPackage?: {
    proofOfIdentity: boolean;
    identityTheftReport: boolean;
    informationIdentifiedToBeBlocked: boolean;
    consumerStatementNoRelationToTransaction: boolean;
  };
  contradictionMetrics?: {
    crossBureauConflicts?: number;
    reportVsDocumentConflicts?: number;
    furnisherVsBureauConflicts?: number;
    oneBureauDeletedAnotherVerified?: number;
    timelineImpossibility?: number;
    ownershipOrIdentityConflict?: number;
    sourceDocumentStrength?: number;
    precisionOfRequestedRemedy?: number;
  };
  deltaTypes?: DisputeDeltaType[];
  readinessSignals?: {
    validArbitrationClauseLocated?: boolean;
    arbitrationProperPartyIdentified?: boolean;
    arbitrationClaimAppearsInScope?: boolean;
    arbitrationForumKnown?: boolean;
    arbitrationNoticeRequirementCaptured?: boolean;
    matureNoticeRecord?: boolean;
    stateFederalClaimInventoryClean?: boolean;
    chronologyClean?: boolean;
    exhibitsClean?: boolean;
    stateOverlayMatched?: boolean;
  };
};

export type DisputeConsumer = {
  fullName: string;
  currentAddress: string;
  dob: string;
  ssnLast4: string;
  currentState: string;
  nameVariants?: string[];
  addressHistory?: string[];
  phoneHistory?: string[];
  emailHistory?: string[];
  priorStates?: string[];
};

export type FileContext = {
  reportSource: string;
  reportPullDates: string[];
  bureauReportsPresent: string[];
  identityTheftFlag: boolean;
  fraudAlertFlag: boolean;
  securityFreezeFlag: boolean;
};

export type BusinessContext = {
  primaryGoal: ConsumerGoal;
  urgencyDeadline?: string;
  fundingTargetType?: string;
};

export type CaseHistory = {
  priorDisputeHistoryPresent: boolean;
  priorComplaintsPresent: boolean;
  priorArbitrationOrLitigationPresent: boolean;
};

export type DisputeCase = {
  consumer: DisputeConsumer;
  fileContext: FileContext;
  businessContext: BusinessContext;
  caseHistory: CaseHistory;
  tradelines: TradelineCase[];
};

export type TradelineEvaluation = {
  tradeline: TradelineCase;
  hardStops: DisputeHardStop[];
  softStops: DisputeSoftStop[];
  nextStage: DisputeStage;
  escalationOption?: EscalationOption;
  blockEligible: boolean;
  resistanceLabel: "weak resistance" | "moderate resistance" | "strong resistance" | "elite resistance";
};

export type DisputeCaseEvaluation = {
  hardStops: DisputeHardStop[];
  softStops: DisputeSoftStop[];
  primaryObjective: ConsumerGoal;
  recommendedPacketOrder: TradelineCase[];
  tradelineEvaluations: TradelineEvaluation[];
};

export type StateLawLibraryRecord = {
  stateCode: string;
  statuteName: string;
  citation: string;
  claimCategory: string;
  appliesTo: Array<"CRA" | "furnisher" | "collector" | "original_creditor">;
  elements: string[];
  noticeRequired: boolean;
  noticeTiming?: string;
  remedies: string[];
  attorneyFeesFlag: boolean;
  letterStageAllowed: DisputeStage[];
  triggerConditions: string[];
  blockedIf: string[];
  lastReviewed: string;
  version: string;
  active?: boolean;
};

export type BureauPlaybook = {
  targetName: string;
  bestHistoricalDisputeTypes: string[];
  commonResponsePatterns: string[];
  mostEffectiveContradictionTypes: string[];
  mostEffectiveExhibitTypes: string[];
  pageLengthToleranceBand: string;
  frivolousIrrelevantSensitivityProfile: string;
  bestEscalationChannel: EscalationOption;
  timeToResolutionProfile: string;
};

export type FurnisherPlaybook = {
  furnisherName: string;
  directDisputeResponsiveness: string;
  designatedAddressQualityConfidence: string;
  mostSuccessfulDisputeTheories: string[];
  commonWeakResponsePatterns: string[];
  bestExhibitsByAccountType: Record<string, string[]>;
  collectorOriginalCreditorDuplicateBehaviorPatterns: string[];
  complaintResponsiveness: string;
  arbitrationRelevance: string;
  handoffReadinessProfile: string;
};

export type PacketOptimizationProfile = {
  bureau?: string;
  furnisher?: string;
  state?: string;
  tradelineType?: string;
  theory?: string;
  specialLane?: DisputeSpecialLane;
  responseDefect?: DisputeResponseDefect;
  exhibitMix: string[];
  packetLengthBand: string;
  toneMode: string;
  escalationPath: EscalationOption;
  bestSectionOrdering: string[];
  bestExhibitOrdering: string[];
  bestContradictionDensity?: string;
  explainabilityNote: string;
};

export type ClaimReadinessDimensions = {
  noticeMaturity: number;
  deltaMaturity: number;
  documentMaturity: number;
  contradictionMaturity: number;
  responseDefectSeverity: number;
  harmMaturity: number;
  properPartyConfidence: number;
  arbitrationClauseConfidence: number;
  stateOverlaySupport: number;
  chronologyCleanliness: number;
  exhibitCleanliness: number;
};

export type ClaimReadinessMatrix = ClaimReadinessDimensions & {
  readinessLevel: keyof typeof CLAIM_READINESS_LEVELS;
  arbitrationReadinessChecks: {
    validClauseLocated: boolean;
    properPartyIdentified: boolean;
    claimAppearsInScope: boolean;
    forumKnown: boolean;
    noticeRequirementCaptured: boolean;
    matureContradictionOrBadHandlingRecord: boolean;
    harmOrRepeatedNoncomplianceTheory: boolean;
  };
  litigationReferralChecks: {
    matureNoticeRecord: boolean;
    badHandlingOrNoResponsePattern: boolean;
    damagesOrStrongRepeatedNoncompliance: boolean;
    stateFederalClaimInventoryClean: boolean;
    chronologyAndExhibitsReadyForCounselReview: boolean;
  };
};

export type DeterministicProductionRuleSet = {
  contradictionRoundThreshold: string[];
  complaintEscalationThreshold: string[];
  preClaimThreshold: string[];
  arbitrationReadyThreshold: string[];
  fallbackLogic: string[];
  conflictResolution: string[];
  laneLockingRules: string[];
  suppressionRules: string[];
  escalationPromotionRules: string[];
  deEscalationRules: string[];
  humanOverrideFlags: string[];
};

export type DeterministicDisputeDecision = {
  tradeline: TradelineCase;
  baselineStage: DisputeStage;
  finalStage: DisputeStage;
  escalationOption?: EscalationOption;
  claimReadiness: ClaimReadinessMatrix;
  suppressionFlags: string[];
  humanOverrideFlags: string[];
  stateLawAllowed: boolean;
  arbitrationLanguageAllowed: boolean;
  notes: string[];
};

export const DEFAULT_DETERMINISTIC_RULES: DeterministicProductionRuleSet = {
  contradictionRoundThreshold: ["resistance_score >= 6 OR response_defect_count >= 1"],
  complaintEscalationThreshold: ["response defect persists after precise notice"],
  preClaimThreshold: ["repeated failures after notice AND damages/serious exposure pattern"],
  arbitrationReadyThreshold: ["claim_readiness >= 4 AND arbitration checks pass"],
  fallbackLogic: [
    "If state overlay missing, continue federal-only.",
    "If arbitration clause unverified, suppress arbitration language.",
    "If direct-furnisher address not verified, hold furnisher round.",
    "If identity-theft block package incomplete, downgrade to identity-theft dispute lane.",
    "If no meaningful delta exists, suppress repeat round and wait for new evidence/event.",
  ],
  conflictResolution: [
    "If multiple theories apply, choose the strongest removal theory as primary.",
    "If a lane conflict exists, identity-theft statutory block outranks generic not-mine.",
    "If funding priority and removability conflict, choose the item with highest combined funding_priority + evidence strength.",
    "If packet length target conflicts with clarity, clarity wins.",
  ],
  laneLockingRules: [
    "Statutory-block lane stays locked when the full identity-theft package is present.",
    "Direct-furnisher lane is locked only after sufficiency checks pass.",
  ],
  suppressionRules: [
    "Suppress all state-law output if the state overlay is missing or stale.",
    "Suppress arbitration language unless arbitration gating passes.",
    "Suppress repeat rounds without meaningful delta.",
  ],
  escalationPromotionRules: [
    "Promote to complaint escalation when contradiction or response-defect thresholds persist.",
    "Promote to pre-claim only when notice maturity and exposure facts justify it.",
  ],
  deEscalationRules: [
    "Return to monitoring after deletion or correction as requested.",
    "Downgrade from statutory block to identity-theft dispute lane if the package is incomplete.",
  ],
  humanOverrideFlags: [
    "state-law ambiguity",
    "uncertain factual support",
    "party-identification ambiguity",
    "arbitration-clause ambiguity",
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasSevereResponseDefect(defects: DisputeResponseDefect[]) {
  return defects.some((defect) =>
    [
      "verified_despite_cross_bureau_conflict",
      "verified_despite_furnisher_conflict",
      "continued_reporting_after_documentary_notice",
      "reinserted_after_deletion",
      "timing_window_violation",
    ].includes(defect),
  );
}

function scoreResponseDefectSeverity(defects: DisputeResponseDefect[]) {
  const weighted = defects.reduce((total, defect) => {
    if (["verified_despite_cross_bureau_conflict", "verified_despite_furnisher_conflict", "continued_reporting_after_documentary_notice", "reinserted_after_deletion"].includes(defect)) {
      return total + 2;
    }

    return total + 1;
  }, 0);

  return clamp(weighted, 0, 5);
}

function scoreDocumentMaturity(tradeline: TradelineCase) {
  const primarySourceCount = tradeline.evidenceItems.filter((item) => item.primarySource).length;
  const tiedEvidenceCount = tradeline.evidenceItems.filter((item) => item.tiedToNarrative && item.tiedToDisputedItem).length;
  return clamp(primarySourceCount + (tiedEvidenceCount > 0 ? 1 : 0), 0, 5);
}

function scoreContradictionMaturity(tradeline: TradelineCase) {
  return Math.min(Math.ceil(scoreConclusiveVerificationResistance(tradeline).score / 4), 5);
}

function scoreDeltaMaturity(tradeline: TradelineCase) {
  return clamp(tradeline.deltaTypes?.length ?? 0, 0, 5);
}

function scoreNoticeMaturity(caseFile: DisputeCase, tradeline: TradelineCase) {
  let score = caseFile.caseHistory.priorDisputeHistoryPresent ? 2 : 0;

  if (tradeline.precisePriorCraDispute) {
    score += 1;
  }

  if (caseFile.caseHistory.priorComplaintsPresent) {
    score += 1;
  }

  if (tradeline.readinessSignals?.matureNoticeRecord) {
    score += 1;
  }

  return clamp(score, 0, 5);
}

function scoreHarmMaturity(tradeline: TradelineCase) {
  return clamp(tradeline.harmEvents?.length ?? 0, 0, 5);
}

function scoreProperPartyConfidence(tradeline: TradelineCase) {
  return clamp((tradeline.furnisherName ? 2 : 0) + (tradeline.collectorName || tradeline.originalCreditor ? 1 : 0) + (tradeline.readinessSignals?.arbitrationProperPartyIdentified ? 2 : 0), 0, 5);
}

function scoreArbitrationClauseConfidence(tradeline: TradelineCase) {
  return clamp(
    (tradeline.readinessSignals?.validArbitrationClauseLocated ? 2 : 0) +
      (tradeline.readinessSignals?.arbitrationClaimAppearsInScope ? 1 : 0) +
      (tradeline.readinessSignals?.arbitrationForumKnown ? 1 : 0) +
      (tradeline.readinessSignals?.arbitrationNoticeRequirementCaptured ? 1 : 0),
    0,
    5,
  );
}

function scoreStateOverlaySupport(tradeline: TradelineCase, stateLawRecord?: StateLawLibraryRecord | null) {
  if (!stateLawRecord?.active) {
    return 0;
  }

  return clamp((tradeline.readinessSignals?.stateOverlayMatched ? 3 : 1) + (stateLawRecord.noticeRequired ? 1 : 0) + (stateLawRecord.attorneyFeesFlag ? 1 : 0), 0, 5);
}

function scoreCleanliness(flag?: boolean) {
  return flag ? 5 : 3;
}

export function scoreConclusiveVerificationResistance(tradeline: TradelineCase) {
  const metrics = tradeline.contradictionMetrics ?? {};
  const score =
    clamp(metrics.crossBureauConflicts ?? 0, 0, 3) +
    clamp(metrics.reportVsDocumentConflicts ?? 0, 0, 3) +
    clamp(metrics.furnisherVsBureauConflicts ?? 0, 0, 3) +
    clamp(metrics.oneBureauDeletedAnotherVerified ?? 0, 0, 2) +
    clamp(metrics.timelineImpossibility ?? 0, 0, 2) +
    clamp(metrics.ownershipOrIdentityConflict ?? 0, 0, 2) +
    clamp(metrics.sourceDocumentStrength ?? 0, 0, 3) +
    clamp(metrics.precisionOfRequestedRemedy ?? 0, 0, 2);

  const label =
    score <= 4
      ? "weak resistance"
      : score <= 9
        ? "moderate resistance"
        : score <= 14
          ? "strong resistance"
          : "elite resistance";

  return { score, label } as const;
}

export function isIdentityTheftBlockEligible(tradeline: TradelineCase) {
  const pkg = tradeline.identityTheftPackage;
  if (!pkg) {
    return false;
  }

  return (
    pkg.proofOfIdentity &&
    pkg.identityTheftReport &&
    pkg.informationIdentifiedToBeBlocked &&
    pkg.consumerStatementNoRelationToTransaction
  );
}

export function evaluateTradeline(caseFile: DisputeCase, tradeline: TradelineCase): TradelineEvaluation {
  const hardStops: DisputeHardStop[] = [];
  const softStops: DisputeSoftStop[] = [];
  const blockEligible = isIdentityTheftBlockEligible(tradeline);
  const resistance = scoreConclusiveVerificationResistance(tradeline);
  const hasMeaningfulDelta = (tradeline.deltaTypes?.length ?? 0) > 0;
  const hasEvidenceOrContradiction = tradeline.evidenceItems.length > 0 || resistance.score > 0;

  if (tradeline.knownAccurate) {
    hardStops.push("dispute_of_known_accurate_information");
  }

  if (!hasEvidenceOrContradiction) {
    softStops.push("overbroad_omnibus_packet");
  }

  if (tradeline.precisePriorCraDispute && !hasMeaningfulDelta) {
    hardStops.push("duplicate_round_without_meaningful_delta");
  }

  if (tradeline.specialLane === "identity_theft" && caseFile.fileContext.identityTheftFlag && !blockEligible && tradeline.responseClass === "denied_block") {
    hardStops.push("identity_theft_lane_without_required_package");
  }

  if (tradeline.specialLane === "statutory_block" && !blockEligible) {
    hardStops.push("identity_theft_lane_without_required_package");
  }

  if (tradeline.responseClass === "frivolous_or_irrelevant_notice") {
    softStops.push("page_padding_without_relevance");
  }

  if (tradeline.specialLane !== "statutory_block" && tradeline.specialLane !== "identity_theft" && tradeline.theoryPrimary.includes(" and ")) {
    softStops.push("multi-theory_confusion");
  }

  if (tradeline.responseDefects.includes("verified_despite_cross_bureau_conflict") || tradeline.responseDefects.includes("verified_despite_furnisher_conflict")) {
    return {
      tradeline,
      hardStops,
      softStops,
      nextStage: "complaint_escalation",
      escalationOption: "CFPB_complaint",
      blockEligible,
      resistanceLabel: resistance.label,
    };
  }

  if (tradeline.responseDefects.includes("continued_reporting_after_documentary_notice")) {
    return {
      tradeline,
      hardStops,
      softStops,
      nextStage: "pre_claim",
      escalationOption: "pre_claim_notice",
      blockEligible,
      resistanceLabel: resistance.label,
    };
  }

  if (tradeline.responseDefects.length > 0 || tradeline.responseClass === "corrected_but_incomplete") {
    return {
      tradeline,
      hardStops,
      softStops,
      nextStage: "contradiction_round",
      escalationOption: "bureau_round",
      blockEligible,
      resistanceLabel: resistance.label,
    };
  }

  if (tradeline.specialLane === "statutory_block" && blockEligible) {
    return {
      tradeline,
      hardStops,
      softStops,
      nextStage: "complaint_escalation",
      escalationOption: "CFPB_complaint",
      blockEligible,
      resistanceLabel: resistance.label,
    };
  }

  if (tradeline.targetType.toLowerCase().includes("furnisher")) {
    if (!tradeline.directFurnisherSufficiencyPassed) {
      hardStops.push("direct_furnisher_lane_without_sufficiency_check");
    }

    return {
      tradeline,
      hardStops,
      softStops,
      nextStage: "furnisher_round_1",
      escalationOption: "direct_furnisher_round",
      blockEligible,
      resistanceLabel: resistance.label,
    };
  }

  return {
    tradeline,
    hardStops,
    softStops,
    nextStage: "bureau_round_1",
    escalationOption: "bureau_round",
    blockEligible,
    resistanceLabel: resistance.label,
  };
}

export function evaluateDisputeCase(caseFile: DisputeCase): DisputeCaseEvaluation {
  const tradelineEvaluations = caseFile.tradelines.map((tradeline) => evaluateTradeline(caseFile, tradeline));
  const hardStops = tradelineEvaluations.flatMap((item) => item.hardStops);
  const softStops = tradelineEvaluations.flatMap((item) => item.softStops);
  const recommendedPacketOrder = [...caseFile.tradelines].sort((a, b) => {
    if (b.scores.fundingPriorityScore !== a.scores.fundingPriorityScore) {
      return b.scores.fundingPriorityScore - a.scores.fundingPriorityScore;
    }
    if (b.scores.removabilityScore !== a.scores.removabilityScore) {
      return b.scores.removabilityScore - a.scores.removabilityScore;
    }
    if (b.scores.resistanceScore !== a.scores.resistanceScore) {
      return b.scores.resistanceScore - a.scores.resistanceScore;
    }
    if (b.scores.evidenceScore !== a.scores.evidenceScore) {
      return b.scores.evidenceScore - a.scores.evidenceScore;
    }
    return b.scores.deltaScore - a.scores.deltaScore;
  });

  return {
    hardStops: [...new Set(hardStops)],
    softStops: [...new Set(softStops)],
    primaryObjective: caseFile.businessContext.primaryGoal,
    recommendedPacketOrder,
    tradelineEvaluations,
  };
}

export function buildClaimReadinessMatrix(
  caseFile: DisputeCase,
  tradeline: TradelineCase,
  options?: {
    stateLawRecord?: StateLawLibraryRecord | null;
  },
): ClaimReadinessMatrix {
  const noticeMaturity = scoreNoticeMaturity(caseFile, tradeline);
  const deltaMaturity = scoreDeltaMaturity(tradeline);
  const documentMaturity = scoreDocumentMaturity(tradeline);
  const contradictionMaturity = scoreContradictionMaturity(tradeline);
  const responseDefectSeverity = scoreResponseDefectSeverity(tradeline.responseDefects);
  const harmMaturity = scoreHarmMaturity(tradeline);
  const properPartyConfidence = scoreProperPartyConfidence(tradeline);
  const arbitrationClauseConfidence = scoreArbitrationClauseConfidence(tradeline);
  const stateOverlaySupport = scoreStateOverlaySupport(tradeline, options?.stateLawRecord);
  const chronologyCleanliness = scoreCleanliness(tradeline.readinessSignals?.chronologyClean);
  const exhibitCleanliness = scoreCleanliness(tradeline.readinessSignals?.exhibitsClean);

  const arbitrationReadinessChecks = {
    validClauseLocated: Boolean(tradeline.readinessSignals?.validArbitrationClauseLocated),
    properPartyIdentified: Boolean(tradeline.readinessSignals?.arbitrationProperPartyIdentified),
    claimAppearsInScope: Boolean(tradeline.readinessSignals?.arbitrationClaimAppearsInScope),
    forumKnown: Boolean(tradeline.readinessSignals?.arbitrationForumKnown),
    noticeRequirementCaptured: Boolean(tradeline.readinessSignals?.arbitrationNoticeRequirementCaptured),
    matureContradictionOrBadHandlingRecord: contradictionMaturity >= 3 || hasSevereResponseDefect(tradeline.responseDefects),
    harmOrRepeatedNoncomplianceTheory: harmMaturity >= 1 || responseDefectSeverity >= 3,
  };

  const litigationReferralChecks = {
    matureNoticeRecord: noticeMaturity >= 3,
    badHandlingOrNoResponsePattern: hasSevereResponseDefect(tradeline.responseDefects) || tradeline.responseDefects.includes("no_substantive_response"),
    damagesOrStrongRepeatedNoncompliance: harmMaturity >= 1 || responseDefectSeverity >= 3,
    stateFederalClaimInventoryClean: Boolean(tradeline.readinessSignals?.stateFederalClaimInventoryClean),
    chronologyAndExhibitsReadyForCounselReview: chronologyCleanliness >= 4 && exhibitCleanliness >= 4,
  };

  const arbitrationReady = Object.values(arbitrationReadinessChecks).every(Boolean);
  const litigationReady = Object.values(litigationReferralChecks).every(Boolean);

  const total =
    noticeMaturity +
    deltaMaturity +
    documentMaturity +
    contradictionMaturity +
    responseDefectSeverity +
    harmMaturity +
    properPartyConfidence +
    arbitrationClauseConfidence +
    stateOverlaySupport +
    chronologyCleanliness +
    exhibitCleanliness;

  const readinessLevel: keyof typeof CLAIM_READINESS_LEVELS =
    arbitrationReady || litigationReady
      ? 4
      : total >= 28
        ? 3
        : total >= 18
          ? 2
          : total >= 10
            ? 1
            : 0;

  return {
    noticeMaturity,
    deltaMaturity,
    documentMaturity,
    contradictionMaturity,
    responseDefectSeverity,
    harmMaturity,
    properPartyConfidence,
    arbitrationClauseConfidence,
    stateOverlaySupport,
    chronologyCleanliness,
    exhibitCleanliness,
    readinessLevel,
    arbitrationReadinessChecks,
    litigationReferralChecks,
  };
}

export function applyDeterministicProductionRules(
  caseFile: DisputeCase,
  tradeline: TradelineCase,
  options?: {
    stateLawRecord?: StateLawLibraryRecord | null;
    rules?: DeterministicProductionRuleSet;
  },
): DeterministicDisputeDecision {
  const rules = options?.rules ?? DEFAULT_DETERMINISTIC_RULES;
  const baseline = evaluateTradeline(caseFile, tradeline);
  const claimReadiness = buildClaimReadinessMatrix(caseFile, tradeline, {
    stateLawRecord: options?.stateLawRecord,
  });
  const suppressionFlags: string[] = [];
  const humanOverrideFlags: string[] = [];
  const notes: string[] = [];

  const stateLawAllowed = Boolean(options?.stateLawRecord?.active && tradeline.readinessSignals?.stateOverlayMatched);
  const arbitrationLanguageAllowed = Object.values(claimReadiness.arbitrationReadinessChecks).every(Boolean);

  if (!stateLawAllowed) {
    suppressionFlags.push("suppress_state_law_output");
    notes.push(rules.fallbackLogic[0] ?? "If state overlay missing, continue federal-only.");
  }

  if (!arbitrationLanguageAllowed) {
    suppressionFlags.push("suppress_arbitration_language");
    notes.push(rules.fallbackLogic[1] ?? "If arbitration clause unverified, suppress arbitration language.");
  }

  if (tradeline.targetType.toLowerCase().includes("furnisher") && !tradeline.directFurnisherSufficiencyPassed) {
    suppressionFlags.push("hold_furnisher_round");
    notes.push(rules.fallbackLogic[2] ?? "If direct-furnisher address not verified, hold furnisher round.");
  }

  if ((tradeline.specialLane === "identity_theft" || tradeline.specialLane === "statutory_block") && !isIdentityTheftBlockEligible(tradeline)) {
    suppressionFlags.push("downgrade_incomplete_statutory_block");
    notes.push(rules.fallbackLogic[3] ?? "If identity-theft block package incomplete, downgrade to identity-theft dispute lane.");
  }

  if (tradeline.precisePriorCraDispute && (tradeline.deltaTypes?.length ?? 0) === 0) {
    suppressionFlags.push("suppress_repeat_round_without_delta");
    notes.push(rules.fallbackLogic[4] ?? "If no meaningful delta exists, suppress repeat round and wait for new evidence/event.");
  }

  if (!stateLawAllowed) {
    humanOverrideFlags.push("state-law ambiguity");
  }

  if (!arbitrationLanguageAllowed && tradeline.readinessSignals?.validArbitrationClauseLocated) {
    humanOverrideFlags.push("arbitration-clause ambiguity");
  }

  if (baseline.hardStops.length > 0) {
    humanOverrideFlags.push("uncertain factual support");
  }

  if (tradeline.targetType.toLowerCase().includes("furnisher") && !tradeline.furnisherName) {
    humanOverrideFlags.push("party-identification ambiguity");
  }

  let finalStage = baseline.nextStage;
  let escalationOption = baseline.escalationOption;

  if (claimReadiness.readinessLevel >= 4 && arbitrationLanguageAllowed) {
    finalStage = "arbitration_ready";
    escalationOption = "arbitration_packet";
    notes.push("Claim-readiness threshold met for arbitration/litigation handoff.");
  } else if (
    claimReadiness.readinessLevel >= 4 &&
    claimReadiness.litigationReferralChecks.matureNoticeRecord &&
    claimReadiness.litigationReferralChecks.badHandlingOrNoResponsePattern
  ) {
    finalStage = "litigation_referral";
    escalationOption = "litigation_referral";
    notes.push("Claim-readiness threshold met for litigation referral handoff.");
  } else if (
    hasSevereResponseDefect(tradeline.responseDefects) &&
    claimReadiness.noticeMaturity >= 3 &&
    (claimReadiness.harmMaturity >= 1 || claimReadiness.responseDefectSeverity >= 3)
  ) {
    finalStage = "pre_claim";
    escalationOption = "pre_claim_notice";
    notes.push(rules.preClaimThreshold[0] ?? "Pre-claim threshold met.");
  } else if (
    tradeline.responseDefects.length > 0 &&
    (baseline.nextStage === "contradiction_round" || baseline.nextStage === "complaint_escalation")
  ) {
    finalStage = baseline.nextStage === "complaint_escalation" ? "complaint_escalation" : "contradiction_round";
    escalationOption = baseline.nextStage === "complaint_escalation" ? "CFPB_complaint" : baseline.escalationOption;
    notes.push(
      baseline.nextStage === "complaint_escalation"
        ? rules.complaintEscalationThreshold[0] ?? "Complaint escalation threshold met."
        : rules.contradictionRoundThreshold[0] ?? "Contradiction round threshold met.",
    );
  }

  if (suppressionFlags.includes("hold_furnisher_round") && finalStage === "furnisher_round_1") {
    finalStage = "stage_0_intake";
    escalationOption = undefined;
  }

  if (suppressionFlags.includes("downgrade_incomplete_statutory_block") && finalStage === "complaint_escalation") {
    finalStage = "contradiction_round";
    escalationOption = "bureau_round";
  }

  if (suppressionFlags.includes("suppress_repeat_round_without_delta") && tradeline.precisePriorCraDispute) {
    finalStage = "monitoring";
    escalationOption = undefined;
  }

  return {
    tradeline,
    baselineStage: baseline.nextStage,
    finalStage,
    escalationOption,
    claimReadiness,
    suppressionFlags: [...new Set(suppressionFlags)],
    humanOverrideFlags: [...new Set(humanOverrideFlags)],
    stateLawAllowed,
    arbitrationLanguageAllowed,
    notes,
  };
}
