export type ReportEligibilityInput = {
  reportedIdentityTheft: boolean;
  identityTheftNarrative?: string | null;
  disputedWithCreditBureaus: boolean;
  authorizedFtcIdentityTheftReport: boolean;
  authorizedCfpbComplaint: boolean;
  authorizedBbbComplaint: boolean;
};

export type ReportEligibilityStatus = {
  ready: boolean;
  requiresIdentityTheftReport: boolean;
  missingItems: string[];
  summaryLabel: string;
};

export function buildReportEligibilityStatus(input: ReportEligibilityInput): ReportEligibilityStatus {
  const missingItems: string[] = [];
  const requiresIdentityTheftReport = input.reportedIdentityTheft;
  const hasNarrative = Boolean(input.identityTheftNarrative?.trim());

  if (!input.disputedWithCreditBureaus) {
    missingItems.push("prior dispute confirmation");
  }

  if (!input.authorizedCfpbComplaint) {
    missingItems.push("CFPB authorization");
  }

  if (!input.authorizedBbbComplaint) {
    missingItems.push("BBB authorization");
  }

  if (requiresIdentityTheftReport) {
    if (!input.authorizedFtcIdentityTheftReport) {
      missingItems.push("FTC identity theft authorization");
    }

    if (!hasNarrative) {
      missingItems.push("identity theft explanation");
    }
  }

  return {
    ready: missingItems.length === 0,
    requiresIdentityTheftReport,
    missingItems,
    summaryLabel:
      missingItems.length === 0
        ? requiresIdentityTheftReport
          ? "Ready for FTC, CFPB, and BBB filing"
          : "Ready for CFPB and BBB filing"
        : `Missing ${missingItems.length} filing item${missingItems.length === 1 ? "" : "s"}`,
  };
}
