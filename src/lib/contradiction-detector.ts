/**
 * Contradiction Detection Module for Credit Wizard AI
 *
 * Populates `contradictionMetrics` on tradelines so the dispute engine's
 * scoreContradictionMaturity() round can fire correctly.
 */

import { type EvidenceItem } from "@/lib/dispute-engine";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export type RawTradeline = {
  creditor: string;
  accountNumber: string;
  bureau: string;
  balance: number | null;
  status: string;
  dateReported: string;
  dateOfFirstDelinquency?: string;
  accountOpenedDate?: string;
};

export type ContradictionMetrics = {
  crossBureauConflicts: number; // 0-3
  reportVsDocumentConflicts: number; // 0-3
  furnisherVsBureauConflicts: number; // 0-3
  oneBureauDeletedAnotherVerified: number; // 0-2
  timelineImpossibility: number; // 0-2
  ownershipOrIdentityConflict: number; // 0-2
  sourceDocumentStrength: number; // 0-3
  precisionOfRequestedRemedy: number; // 0-2
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const CLAMPED_RANGES: Record<keyof ContradictionMetrics, [number, number]> = {
  crossBureauConflicts: [0, 3],
  reportVsDocumentConflicts: [0, 3],
  furnisherVsBureauConflicts: [0, 3],
  oneBureauDeletedAnotherVerified: [0, 2],
  timelineImpossibility: [0, 2],
  ownershipOrIdentityConflict: [0, 2],
  sourceDocumentStrength: [0, 3],
  precisionOfRequestedRemedy: [0, 2],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true when the account number appears truncated to last-4 only.
 * Real account numbers typically have 8-17 digits or alphanumeric patterns
 * longer than 4 characters.
 */
function isAccountNumberTruncated(accountNumber: string): boolean {
  const cleaned = accountNumber.trim().replace(/\s|-/g, "");
  // Truncated accounts usually show as "XXXX1234" or just "1234"
  // A full account number is almost always > 6 chars
  if (cleaned.length <= 6) return true;
  // If it starts with Xs/asterisks and ends with 4 digits, it's truncated
  if (/^[X*x*\d-]{1,6}$/.test(cleaned)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * crossBureauConflicts (0-3):
 * Compare a tradeline against the same account reported by other bureaus.
 * +1 per field that differs: status, balance, dateReported, dateOfFirstDelinquency.
 */
function detectCrossBureauConflicts(
  tradeline: RawTradeline,
  otherBureauTradelines: RawTradeline[],
): number {
  if (otherBureauTradelines.length === 0) return 0;

  const SAME_CREDITOR_RE = new RegExp(
    `^${tradeline.creditor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i",
  );

  const matching = otherBureauTradelines.filter((t) =>
    SAME_CREDITOR_RE.test(t.creditor),
  );
  if (matching.length === 0) return 0;

  let score = 0;

  for (const other of matching) {
    // Status comparison (normalize common variants)
    const normA = tradeline.status.trim().toUpperCase();
    const normB = other.status.trim().toUpperCase();
    if (normA !== normB) score++;

    // Balance comparison (both null → same; one null → different; values differ)
    if (
      tradeline.balance !== null &&
      other.balance !== null &&
      tradeline.balance !== other.balance
    ) {
      score++;
    } else if (
      (tradeline.balance === null) !== (other.balance === null)
    ) {
      score++;
    }

    // dateReported comparison
    if (tradeline.dateReported !== other.dateReported) score++;

    // dateOfFirstDelinquency comparison
    if (
      (tradeline.dateOfFirstDelinquency ?? "") !==
      (other.dateOfFirstDelinquency ?? "")
    ) {
      score++;
    }
  }

  return clamp(score, 0, 3);
}

/**
 * reportVsDocumentConflicts (0-3):
 * Checks whether document evidence contradicts report data.
 * Looks for EvidenceItems with type matching known dispute doc categories.
 *
 * EvidenceItem.type values that can indicate a conflict:
 *   "police_report"        → identity theft / fraud
 *   "ftc_affidavit"        → identity theft sworn statement
 *   "bank_statement"      → balance / payment dispute
 *   "payment_receipt"      → payment proof contradicting status
 *   "correspondence"       → furnisher/bureau letters
 *   "billing_dispute"      → billing error
 *
 * +1 per document type that contradicts a report field.
 */
function detectReportVsDocumentConflicts(
  tradeline: RawTradeline,
  documentEvidence?: EvidenceItem[],
): number {
  if (!documentEvidence || documentEvidence.length === 0) return 0;

  let score = 0;

  for (const doc of documentEvidence) {
    const docType = (doc.type ?? "").toLowerCase();

    // Police report → contradicts fraudulent/unauthorized account
    if (
      docType === "police_report" &&
      !tradeline.status.toLowerCase().includes("fraud") &&
      !tradeline.status.toLowerCase().includes("unauthorized")
    ) {
      score++;
      continue;
    }

    // FTC affidavit → contradicts fraud/identity theft
    if (
      docType === "ftc_affidavit" &&
      !tradeline.status.toLowerCase().includes("fraud") &&
      !tradeline.status.toLowerCase().includes("identity")
    ) {
      score++;
      continue;
    }

    // Bank statement → can contradict balance or payment status
    if (docType === "bank_statement") {
      const extra = doc as EvidenceItem & { reportedBalance?: number };
      const reportedBal: number | null | undefined = extra.reportedBalance;
      if (
        tradeline.balance !== null &&
        reportedBal != null &&
        Math.abs(tradeline.balance - reportedBal) > 1
      ) {
        score++;
      }
      continue;
    }

    // Payment receipt → can contradict past-due or delinquency status
    if (
      docType === "payment_receipt" &&
      (tradeline.status.toLowerCase().includes("past due") ||
        tradeline.status.toLowerCase().includes("delinquent"))
    ) {
      score++;
      continue;
    }

    // Billing dispute letter → can contradict accurate/verified status
    if (
      docType === "billing_dispute" &&
      (tradeline.status.toLowerCase().includes("accurate") ||
        tradeline.status.toLowerCase().includes("verified"))
    ) {
      score++;
      continue;
    }
  }

  return clamp(score, 0, 3);
}

/**
 * furnisherVsBureauConflicts (0-3):
 * Heuristic: if the tradeline status is "verified" but other bureaus show
 * something different, or if document evidence flags the furnisher as
 * inconsistent — treat it as a furnisher-vs-bureau conflict.
 *
 * In a real system this would be backed by actual furnisher response data.
 * Here we use a strong documentary signal: a "furnisher_letter" or
 * "furnisher_response" doc type attached to a "verified" account.
 */
function detectFurnisherVsBureauConflicts(
  tradeline: RawTradeline,
  documentEvidence?: EvidenceItem[],
): number {
  if (!documentEvidence || documentEvidence.length === 0) return 0;

  let score = 0;

  const statusIsVerified = tradeline.status
    .trim()
    .toLowerCase()
    .startsWith("verif");

  for (const doc of documentEvidence) {
    const docType = (doc.type ?? "").toLowerCase();

    if (
      (docType === "furnisher_letter" ||
        docType === "furnisher_response" ||
        docType === "furnisher_dispute") &&
      statusIsVerified
    ) {
      // Furnisher says verified but consumer has a furnisher dispute letter
      score++;
      continue;
    }

    if (
      docType === "correspondence" &&
      statusIsVerified &&
      (doc.label?.toLowerCase().includes("furnisher") ?? false)
    ) {
      score++;
    }
  }

  return clamp(score, 0, 3);
}

/**
 * oneBureauDeletedAnotherVerified (0-2):
 * Checks whether the current bureau tradeline and another bureau's
 * tradeline for the same account disagree on deletion vs. verification.
 */
function detectOneBureauDeletedAnotherVerified(
  tradeline: RawTradeline,
  otherBureauTradelines: RawTradeline[],
): number {
  if (otherBureauTradelines.length === 0) return 0;

  const statusA = tradeline.status.trim().toLowerCase();
  const aIsDeleted =
    statusA.includes("deleted") ||
    statusA.includes("removed") ||
    statusA.includes("closed") ||
    statusA === "removed";
  const aIsVerified =
    statusA.includes("verif") || statusA === "verified" || statusA === "accurate";

  if (!aIsDeleted && !aIsVerified) return 0;

  let score = 0;
  for (const other of otherBureauTradelines) {
    const statusB = other.status.trim().toLowerCase();
    const bIsDeleted =
      statusB.includes("deleted") ||
      statusB.includes("removed") ||
      statusB.includes("closed") ||
      statusB === "removed";
    const bIsVerified =
      statusB.includes("verif") ||
      statusB === "verified" ||
      statusB === "accurate";

    if (aIsDeleted && bIsVerified) score++;
    if (aIsVerified && bIsDeleted) score++;
  }

  return clamp(score, 0, 2);
}

/**
 * timelineImpossibility (0-2):
 * Detects physically impossible date sequences and negative values.
 *
 * Flags:
 * - dateOfFirstDelinquency < accountOpenedDate
 * - dateOfFirstDelinquency in the future
 * - accountOpenedDate in the future
 * - dateReported in the future
 * - negative balance
 */
function detectTimelineImpossibility(
  tradeline: RawTradeline,
): number {
  let score = 0;

  // Negative balance
  if (tradeline.balance !== null && tradeline.balance < 0) {
    score++;
  }

  const now = new Date();
  const opened = parseDate(tradeline.accountOpenedDate);
  const delinquency = parseDate(tradeline.dateOfFirstDelinquency);
  const reported = parseDate(tradeline.dateReported);

  // Future account opened date
  if (opened && opened > now) score++;

  // Future date of first delinquency
  if (delinquency && delinquency > now) score++;

  // Delinquency before account was opened (impossible)
  if (opened && delinquency && delinquency < opened) {
    score++;
  }

  // Future date reported (data shouldn't be from the future)
  if (reported && reported > now) score++;

  return clamp(score, 0, 2);
}

/**
 * ownershipOrIdentityConflict (0-2):
 * Heuristic: checks whether the creditor name has unusual patterns
 * that could indicate a different person (e.g., clearly different name,
 * spelling variations, maiden names) or whether the account number
 * doesn't match expected patterns for this consumer.
 *
 * In production this would cross-reference the consumer's identity.
 * Here we flag if creditor name has obvious mismatch signals.
 */
function detectOwnershipOrIdentityConflict(
  tradeline: RawTradeline,
  consumerFullName?: string,
): number {
  if (!consumerFullName) return 0;

  let score = 0;
  const consumerNormalized = consumerFullName.trim().toLowerCase();
  const creditorNormalized = tradeline.creditor.trim().toLowerCase();

  // Exact match on the creditor is a good sign (low conflict)
  if (creditorNormalized === consumerNormalized) return 0;

  // Completely different names — could be identity mix-up
  const consumerWords = consumerNormalized.split(/\s+/);
  const creditorWords = creditorNormalized.split(/\s+/);

  // Check if any word overlaps — no overlap suggests possible mix-up
  const overlap = consumerWords.filter((w) =>
    creditorWords.some((c) => c.startsWith(w.slice(0, 3))),
  );

  if (overlap.length === 0) {
    // Names are completely disjoint — possible identity conflict
    score += 2;
  } else if (overlap.length === 1 && consumerWords.length > 1) {
    // Only one word matches — possible variation / maiden name / typo
    score += 1;
  }

  return clamp(score, 0, 2);
}

/**
 * sourceDocumentStrength (0-3):
 * Primary source documents carry the most weight.
 * +2 for police report or FTC affidavit (notarized/official)
 * +1 for bank statement, payment receipt, billing statement
 * +0 for correspondence or other
 */
function detectSourceDocumentStrength(
  documentEvidence?: EvidenceItem[],
): number {
  if (!documentEvidence || documentEvidence.length === 0) return 0;

  let score = 0;
  let maxScore = 0;

  for (const doc of documentEvidence) {
    const docType = (doc.type ?? "").toLowerCase();

    if (docType === "police_report" || docType === "ftc_affidavit") {
      maxScore = Math.max(maxScore, 2);
    } else if (
      docType === "bank_statement" ||
      docType === "payment_receipt" ||
      docType === "billing_statement"
    ) {
      maxScore = Math.max(maxScore, 1);
    } else if (docType === "correspondence" || docType === "furnisher_letter") {
      maxScore = Math.max(maxScore, 0);
    }
  }

  return clamp(maxScore, 0, 3);
}

/**
 * precisionOfRequestedRemedy (0-2):
 * Detailed, specific information strengthens a dispute.
 * +1 for full account number (not truncated to 4 digits)
 * +1 for specific dates (dateOfFirstDelinquency or accountOpenedDate present)
 */
function detectPrecisionOfRequestedRemedy(
  tradeline: RawTradeline,
): number {
  let score = 0;

  if (!isAccountNumberTruncated(tradeline.accountNumber)) {
    score++;
  }

  const hasSpecificDates =
    tradeline.dateOfFirstDelinquency !== undefined ||
    tradeline.accountOpenedDate !== undefined;

  if (hasSpecificDates) score++;

  return clamp(score, 0, 2);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DetectContradictionsOptions {
  /**
   * Consumer's full legal name, used for ownership/identity conflict
   * detection. If omitted, that signal is skipped.
   */
  consumerFullName?: string;
}

/**
 * Main entry point. Analyzes a single tradeline against cross-bureau data
 * and document evidence to compute contradiction metrics.
 */
export function detectContradictions(
  tradeline: RawTradeline,
  otherBureauTradelines: RawTradeline[] = [],
  documentEvidence?: EvidenceItem[],
  options: DetectContradictionsOptions = {},
): ContradictionMetrics {
  const { consumerFullName } = options;

  const crossBureauConflicts = detectCrossBureauConflicts(
    tradeline,
    otherBureauTradelines,
  );

  const reportVsDocumentConflicts = detectReportVsDocumentConflicts(
    tradeline,
    documentEvidence,
  );

  const furnisherVsBureauConflicts = detectFurnisherVsBureauConflicts(
    tradeline,
    documentEvidence,
  );

  const oneBureauDeletedAnotherVerified = detectOneBureauDeletedAnotherVerified(
    tradeline,
    otherBureauTradelines,
  );

  const timelineImpossibility = detectTimelineImpossibility(tradeline);

  const ownershipOrIdentityConflict = detectOwnershipOrIdentityConflict(
    tradeline,
    consumerFullName,
  );

  const sourceDocumentStrength = detectSourceDocumentStrength(documentEvidence);

  const precisionOfRequestedRemedy = detectPrecisionOfRequestedRemedy(tradeline);

  return {
    crossBureauConflicts,
    reportVsDocumentConflicts,
    furnisherVsBureauConflicts,
    oneBureauDeletedAnotherVerified,
    timelineImpossibility,
    ownershipOrIdentityConflict,
    sourceDocumentStrength,
    precisionOfRequestedRemedy,
  };
}

/**
 * Converts a populated ContradictionMetrics object into a single
 * 0-20 resistance score that mirrors scoreConclusiveVerificationResistance().
 *
 * Score bands:
 *   0-4  → weak resistance
 *   5-9  → moderate resistance
 *  10-14 → strong resistance
 *  15-20 → elite resistance
 */
export function computeContradictionScore(
  metrics: Partial<ContradictionMetrics>,
): number {
  const score =
    clamp(metrics.crossBureauConflicts ?? 0, ...CLAMPED_RANGES.crossBureauConflicts) +
    clamp(metrics.reportVsDocumentConflicts ?? 0, ...CLAMPED_RANGES.reportVsDocumentConflicts) +
    clamp(metrics.furnisherVsBureauConflicts ?? 0, ...CLAMPED_RANGES.furnisherVsBureauConflicts) +
    clamp(metrics.oneBureauDeletedAnotherVerified ?? 0, ...CLAMPED_RANGES.oneBureauDeletedAnotherVerified) +
    clamp(metrics.timelineImpossibility ?? 0, ...CLAMPED_RANGES.timelineImpossibility) +
    clamp(metrics.ownershipOrIdentityConflict ?? 0, ...CLAMPED_RANGES.ownershipOrIdentityConflict) +
    clamp(metrics.sourceDocumentStrength ?? 0, ...CLAMPED_RANGES.sourceDocumentStrength) +
    clamp(metrics.precisionOfRequestedRemedy ?? 0, ...CLAMPED_RANGES.precisionOfRequestedRemedy);

  return clamp(score, 0, 20);
}
