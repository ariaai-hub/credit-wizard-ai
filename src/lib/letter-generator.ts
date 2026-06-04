/**
 * Lane-Aware Letter Generator — Credit Wizard AI
 *
 * Generates 8 letter types gated by hard stops, soft stops, and stage.
 * Each letter cites specific FCRA subsections, includes a declaration block,
 * and an exhibit list. Tone is matched to the dispute stage.
 *
 * Hard stops:
 * - knownAccurate === true → SUPPRESS all letters for this tradeline
 * - specialLane === "identity_theft" + incomplete package → fall back to bureau dispute
 * - specialLane === "statutory_block" + not block eligible → fall back to identity theft dispute lane
 * - directFurnisherSufficiencyPassed !== true → fall back to bureau dispute
 * - contradictionMetrics all zeros/empty → SUPPRESS contradiction letter
 * - premature_preclaim_tone → SUPPRESS pre-claim notice
 */

import { BUREAU_ADDRESSES, type Bureau } from "./bureau-addresses";
import type { TradelineCase, DisputeCase, DisputeStage, StateLawLibraryRecord } from "./dispute-engine";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LetterClient {
  firstName: string;
  lastName: string;
  fullName: string;
  currentAddress: string;
  dateOfBirth: string;
  ssnLast4: string;
}

export interface LetterRequest {
  client: LetterClient;
  tradeline: TradelineCase;
  bureau: Bureau;
  stage: DisputeStage;
  caseFile: DisputeCase;
  stateLawRecord?: StateLawLibraryRecord | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function todayShort(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function safeMask(accountNumberMasked?: string): string {
  return accountNumberMasked ?? "****";
}

function safeStr(val?: string | null | false): string {
  return val ? String(val) : "";
}

function hasRealContradictionData(metrics?: TradelineCase["contradictionMetrics"]): boolean {
  if (!metrics) return false;
  return (
    (metrics.crossBureauConflicts ?? 0) > 0 ||
    (metrics.reportVsDocumentConflicts ?? 0) > 0 ||
    (metrics.furnisherVsBureauConflicts ?? 0) > 0 ||
    (metrics.oneBureauDeletedAnotherVerified ?? 0) > 0 ||
    (metrics.timelineImpossibility ?? 0) > 0 ||
    (metrics.ownershipOrIdentityConflict ?? 0) > 0
  );
}

function identityTheftPackageComplete(pkg?: TradelineCase["identityTheftPackage"]): boolean {
  if (!pkg) return false;
  return (
    pkg.proofOfIdentity &&
    pkg.identityTheftReport &&
    pkg.informationIdentifiedToBeBlocked &&
    pkg.consumerStatementNoRelationToTransaction
  );
}

function isBlockEligible(tradeline: TradelineCase): boolean {
  return identityTheftPackageComplete(tradeline.identityTheftPackage);
}

function buildHeader(
  bureau: Bureau,
  caseFile: DisputeCase,
  tradeline: TradelineCase,
  subjectLine: string,
  exhibits: string[],
): string {
  const addr = BUREAU_ADDRESSES[bureau];
  const consumer = caseFile.consumer;

  return `${addr.name}
${addr.street}
${addr.city}, ${addr.state}  ${addr.zip}

Date: ${today()}
RE: ${subjectLine}
Consumer: ${consumer.fullName}
Address: ${consumer.currentAddress}
Date of Birth: ${consumer.dob}
SSN: ****
Account: ${safeMask(tradeline.accountNumberMasked)}
Creditor: ${tradeline.furnisherName ?? tradeline.originalCreditor ?? "Unknown"}

─────────────────────────────────────────────────────────────

`;
}

function buildDeclaration(client: LetterClient): string {
  return `DECLARATION

I, ${client.firstName} ${client.lastName}, declare under penalty of perjury pursuant to 28 U.S.C. § 1746 that the foregoing is true and correct to the best of my knowledge, information, and belief. I hereby authorize this dispute to be filed on my behalf and confirm that the information provided herein is accurate and complete to the best of my knowledge.

Executed on: ${today()}

Signature: ___________________________________

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────

`;
}

function buildExhibits(exhibits: string[]): string {
  if (exhibits.length === 0) return "";
  return (
    "EXHIBIT LIST\n\n" +
    exhibits.map((ex, i) => `Exhibit ${i + 1}: ${ex}`).join("\n") +
    "\n\n─────────────────────────────────────────────────────────────\n\n"
  );
}

function getCreditorName(tradeline: TradelineCase): string {
  return tradeline.furnisherName ?? tradeline.originalCreditor ?? "N/A";
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 1: Bureau Dispute Letter — FCRA § 611
// ─────────────────────────────────────────────────────────────────────────────

function bureauDisputeLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile, stateLawRecord } = request;
  const furnisher = getCreditorName(tradeline);
  const exhibits: string[] = [
    "Copy of Consumer's Credit Report with disputed item highlighted",
    "Supporting documentation evidencing inaccuracy or incompleteness",
  ];

  const subject = `DISPUTE OF CONSUMER CREDIT REPORT — FCRA § 611 / 15 U.S.C. § 1681i\nAccount: ${furnisher} | Account Reference: ${safeMask(tradeline.accountNumberMasked)}`;

  const statusDesc =
    tradeline.status === "GOOD"
      ? "Account reported as current/accurate"
      : tradeline.status === "CLOSED"
        ? "Account reported as closed"
        : tradeline.status === "PAST_DUE"
          ? "Account reported as past due"
          : tradeline.status === "COLLECTION"
            ? "Account reported in collections"
            : "Account status disputed";

  const balanceStr =
    tradeline.balance !== undefined && tradeline.balance !== null
      ? `$${tradeline.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "N/A";

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `DISPUTE LETTER — FAIR CREDIT REPORTING ACT § 611 / 15 U.S.C. § 1681i

Dear Sir or Madam:

I am writing to formally dispute the above-referenced tradeline appearing in my consumer credit file maintained by ${BUREAU_ADDRESSES[bureau].name} ("Bureau"). I believe this item is inaccurate, incomplete, and/or unverifiable in violation of the Fair Credit Reporting Act, 15 U.S.C. § 1681i.

──────────────────────────────────────────────────
NATURE OF DISPUTE
──────────────────────────────────────────────────

Creditor: ${furnisher}
Account Number: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "Unknown"}
Status Reported: ${statusDesc}
Balance Reported: ${balanceStr}
Date of First Delinquency: ${tradeline.dateOfFirstDelinquency ?? "N/A"}
Last Payment Date: ${tradeline.lastPaymentDate ?? "N/A"}
Monthly Payment: ${tradeline.monthlyPayment ? `$${tradeline.monthlyPayment.toLocaleString("en-US")}` : "N/A"}

The above account is being reported inaccurately, incompletely, or in a manner that cannot be verified as complete and accurate. Specifically, the information associated with this account fails to reflect the true status of the obligation, or cannot be corroborated by the furnisher of record.

──────────────────────────────────────────────────
LEGAL BASIS — FCRA § 611(a) / 15 U.S.C. § 1681i(a)
──────────────────────────────────────────────────

Pursuant to 15 U.S.C. § 1681i(a)(1)(A), upon receiving a dispute notice from a consumer, the Bureau is required to conduct a reasonable reinvestigation of the disputed information. If the information is found to be inaccurate, incomplete, or unverifiable, the Bureau must promptly correct or delete the information.

Under 15 U.S.C. § 1681i(a)(5)(B), if a furnisher fails to respond within the reinvestigation period, or if the information cannot be verified as accurate and complete, the Bureau must delete the item from the consumer's credit file.

Pursuant to 15 U.S.C. § 1681i(a)(2), the Bureau must provide the furnisher of the disputed information with notice of the consumer's dispute and the furnisher must conduct an investigation of the disputed information.

──────────────────────────────────────────────────
REQUEST FOR INVESTIGATION AND REMOVAL
──────────────────────────────────────────────────

I respectfully request that the Bureau:

1. Conduct a prompt and thorough reinvestigation of the above-referenced tradeline;
2. Notify the furnisher of this dispute and require the furnisher to investigate and report its findings;
3. Correct any inaccurate, incomplete, or unverifiable information, or permanently delete this tradeline if verification cannot be completed;
4. Send me written confirmation of the results of your reinvestigation upon completion;
5. If this item is deleted, confirm in writing that it has been removed from my credit file and will not be reinserted without compliance with FCRA § 611(c) requirements.

If the Bureau determines that the information is accurate and complete, please provide a detailed explanation of the factual and legal basis for that determination, including the specific documents and records relied upon.

──────────────────────────────────────────────────
STATE LAW OVERLAY${stateLawRecord ? ` — ${stateLawRecord.stateCode}` : ""}
──────────────────────────────────────────────────

`;

  if (stateLawRecord?.active && stateLawRecord.letterStageAllowed.includes(request.stage)) {
    body += `In addition to federal law, applicable ${stateLawRecord.stateCode} state law may provide additional rights and remedies. The applicable statute, ${stateLawRecord.statuteName}, ${stateLawRecord.citation}, confers rights applicable to this category of dispute involving "${stateLawRecord.claimCategory}" items. Consumer remedies under this statute include: ${stateLawRecord.remedies.join("; ")}.${stateLawRecord.attorneyFeesFlag ? " Attorney fee shifting is applicable under this statute." : ""}

`;
  } else {
    body += `(No active state-law overlay applicable at this stage. Federal FCRA standards govern.)

`;
  }

  body += `──────────────────────────────────────────────────
SUPPORTING DOCUMENTATION
──────────────────────────────────────────────────

I have attached a copy of my credit report with the disputed item identified, along with supporting documentation relevant to this dispute. Under 15 U.S.C. § 1681g, I am entitled to receive all information in my consumer file, including the sources of any information reported to the Bureau.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `This letter constitutes a formal dispute under FCRA § 611 / 15 U.S.C. § 1681i. I expect written confirmation of your reinvestigation results within the statutory period. Failure to conduct a reasonable reinvestigation, failure to correct inaccurate or unverifiable information, or failure to delete information that cannot be verified may subject the Bureau to liability under 15 U.S.C. § 1681n and § 1681o.

Please direct all correspondence to my current address on file.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
Automated dispute pursuant to FCRA § 611 | 15 U.S.C. § 1681i
Credit Wizard AI — Generated ${todayShort()}
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 2: Identity Theft Block Letter — FCRA § 605B / 15 U.S.C. § 1681c-2
// ─────────────────────────────────────────────────────────────────────────────

function identityTheftBlockLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile } = request;
  const pkg = tradeline.identityTheftPackage;
  const furnisher = getCreditorName(tradeline);

  const exhibits: string[] = [
    "Identity Theft Report / Police Report",
    "Proof of Identity (government-issued photo ID)",
    "Listing of Information to Be Blocked as erroneous due to identity theft",
    "Consumer Statement indicating no relation to the transaction",
  ];

  const subject = `REQUEST FOR STATUTORY BLOCK — FCRA § 605B / 15 U.S.C. § 1681c-2\nIdentity Theft — Account: ${safeMask(tradeline.accountNumberMasked)} | Creditor: ${furnisher}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `STATUTORY BLOCK REQUEST — FAIR CREDIT REPORTING ACT § 605B / 15 U.S.C. § 1681c-2

Dear Sir or Madam:

I am writing to formally request a statutory block of the above-referenced account appearing in my consumer credit file maintained by ${BUREAU_ADDRESSES[bureau].name} ("Bureau"). This account was opened, used, or otherwise incurred as a result of the theft or misuse of my identity, and its reporting constitutes a violation of my rights under the Fair Credit Reporting Act.

──────────────────────────────────────────────────
IDENTITY THEFT CONFIRMATION
──────────────────────────────────────────────────

Creditor: ${furnisher}
Account Number: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "Unknown"}
Status Reported: ${tradeline.status ?? "N/A"}
Balance Reported: ${tradeline.balance !== undefined ? `$${tradeline.balance.toLocaleString("en-US")}` : "N/A"}

I have submitted or will submit an identity theft report documenting my status as a victim of identity theft with respect to this account. I have also identified with specificity the information reported in my credit file that is being disputed as the result of the identity theft.

──────────────────────────────────────────────────
LEGAL BASIS — FCRA § 605B / 15 U.S.C. § 1681c-2
──────────────────────────────────────────────────

Under 15 U.S.C. § 1681c-2(a)(1), a consumer may submit an identity theft report to a consumer reporting agency requesting a block of information in the consumer's credit file that resulted from identity theft. Upon receipt of a valid identity theft report and the consumer's identification of the information to be blocked, the agency shall block the information from the consumer's file.

Pursuant to 15 U.S.C. § 1681c-2(a)(2), the Bureau must also notify the furnisher that the information has been blocked as identity theft information, and the furnisher is prohibited from re-reporting such information.

Under 15 U.S.C. § 1681c-2(c), if the Bureau determines that the information resulted from identity theft, the agency shall promptly delete the information and may not reinsert it without compliance with the requirements of 15 U.S.C. § 1681c-2.

Under 15 U.S.C. § 1681c-2(e), the Bureau may not charge a fee for receiving an identity theft report or for blocking information pursuant to this section.

──────────────────────────────────────────────────
PACKAGE COMPLETENESS VERIFICATION
──────────────────────────────────────────────────

This statutory block request is being made with the following identity theft documentation package:

• Proof of Identity: ${pkg?.proofOfIdentity ? "ENCLOSED" : "NOT ENCLOSED — REQUIRED"}
• Identity Theft Report: ${pkg?.identityTheftReport ? "ENCLOSED" : "NOT ENCLOSED — REQUIRED"}
• Specific Identification of Information to Be Blocked: ${pkg?.informationIdentifiedToBeBlocked ? "ENCLOSED" : "NOT ENCLOSED — REQUIRED"}
• Consumer Statement of No Relation to Transaction: ${pkg?.consumerStatementNoRelationToTransaction ? "ENCLOSED" : "NOT ENCLOSED — REQUIRED"}

Note: In the event any element of this package is not yet enclosed, I reserve the right to supplement this request and demand that no reinsertion occur pending full documentation. Under 15 U.S.C. § 1681c-2(a)(1), block requests must be supported by an identity theft report and specific identification of information. Deficient packages will be supplemented within a reasonable period.

──────────────────────────────────────────────────
REQUEST FOR BLOCK AND FURNISHER NOTIFICATION
──────────────────────────────────────────────────

I respectfully request that the Bureau:

1. Immediately block the above-referenced account from my credit file pursuant to 15 U.S.C. § 1681c-2;
2. Notify the furnisher of this account that the information has been blocked as identity theft information;
3. Confirm in writing that the block has been implemented and that the furnisher has been notified;
4. Confirm that the blocked information will not be reinserted without full compliance with FCRA § 605B requirements;
5. Provide me with written confirmation of the action taken.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `I understand that furnishing false information or failing to correct inaccurate information in connection with an identity theft block may subject the furnisher and/or the Bureau to liability under 15 U.S.C. § 1681n (willful noncompliance) and § 1681o (negligent noncompliance). I reserve all rights and remedies available under federal and state law.

This letter constitutes a formal statutory block request under FCRA § 605B / 15 U.S.C. § 1681c-2. Please implement the block immediately upon receipt.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
Statutory block request pursuant to FCRA § 605B | 15 U.S.C. § 1681c-2
Credit Wizard AI — Generated ${todayShort()}
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 3: Direct Furnisher Letter — FCRA § 623(a)(8) / 15 U.S.C. § 1681s-2
// ─────────────────────────────────────────────────────────────────────────────

function directFurnisherLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile, stateLawRecord } = request;
  const furnisher = getCreditorName(tradeline);

  const exhibits: string[] = [
    "Copy of Credit Report with disputed item highlighted",
    "Supporting documentation evidencing inaccuracy",
    "Proof of prior dispute to the CRA (if any)",
  ];

  const subject = `DIRECT DISPUTE TO FURNISHER — FCRA § 623(a)(8) / 15 U.S.C. § 1681s-2(b)\nAccount: ${safeMask(tradeline.accountNumberMasked)} | Creditor: ${furnisher}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `DIRECT FURNISHER DISPUTE — FAIR CREDIT REPORTING ACT § 623(a)(8) / 15 U.S.C. § 1681s-2(b)

Date: ${today()}

${furnisher}
[Designated Address for Consumer Disputes — verified address on file]

RE: Direct Dispute of Consumer Credit Information
Account: ${safeMask(tradeline.accountNumberMasked)}
Consumer: ${client.fullName}
Date of Birth: ${client.dateOfBirth}
Current Address: ${client.currentAddress}

──────────────────────────────────────────────────
NOTICE OF DIRECT DISPUTE — FCRA § 623(a)(8)
──────────────────────────────────────────────────

Dear Sir or Madam:

I am writing to formally dispute the above-referenced account information that has been reported to the consumer reporting agencies, including ${BUREAU_ADDRESSES[bureau].name}, by ${furnisher} ("Furnisher"). I believe this information is inaccurate, incomplete, and/or unauthorized, in violation of the Fair Credit Reporting Act.

This letter constitutes a direct dispute submitted to the furnisher of the information pursuant to 15 U.S.C. § 1681s-2(b)(1)(A).

──────────────────────────────────────────────────
DISPUTED ACCOUNT INFORMATION
──────────────────────────────────────────────────

Creditor/Furnisher: ${furnisher}
Original Creditor: ${tradeline.originalCreditor ?? "N/A"}
Account Number: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "Unknown"}
Status: ${tradeline.status ?? "N/A"}
Balance: ${tradeline.balance !== undefined ? `$${tradeline.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "N/A"}
Date of First Delinquency: ${tradeline.dateOfFirstDelinquency ?? "N/A"}
Last Payment Date: ${tradeline.lastPaymentDate ?? "N/A"}
Monthly Payment: ${tradeline.monthlyPayment ? `$${tradeline.monthlyPayment.toLocaleString("en-US")}` : "N/A"}
Collector: ${tradeline.collectorName ?? "N/A"}

──────────────────────────────────────────────────
NATURE OF DISPUTE
──────────────────────────────────────────────────

The above account is being reported inaccurately, incompletely, or in a manner that does not reflect the true status of the account. Specifically, this account was not authorized, not incurred by the consumer, not accurate as reported, or is otherwise disputed.

──────────────────────────────────────────────────
LEGAL BASIS — FCRA § 623(a)(8) / 15 U.S.C. § 1681s-2(b)
──────────────────────────────────────────────────

Pursuant to 15 U.S.C. § 1681s-2(b)(1)(A), upon receiving a direct dispute notice from a consumer, the furnisher shall conduct a reasonable investigation of the disputed information and review all relevant information provided by the consumer.

Under 15 U.S.C. § 1681s-2(b)(1)(D), if the furnisher finds that the information is incomplete or inaccurate, the furnisher shall promptly notify the consumer reporting agency of the incorrect or incomplete information and provide the corrected information to each consumer reporting agency to which the furnisher provided the incorrect or incomplete information.

Under 15 U.S.C. § 1681s-2(b)(1)(E), if the furnisher determines that the information is accurate and complete, the furnisher shall notify the consumer in writing of the determination and the reason for the determination, including the specific records and documents relied upon.

──────────────────────────────────────────────────
REQUEST FOR INVESTIGATION AND CORRECTION
──────────────────────────────────────────────────

I respectfully request that the Furnisher:

1. Conduct a prompt and thorough investigation of the above-referenced account information;
2. Review all relevant documentation provided herein;
3. Correct inaccurate, incomplete, or unauthorized information and notify all relevant consumer reporting agencies;
4. If the information is found to be accurate, provide a detailed written explanation including all specific records and documents relied upon;
5. Provide me with written confirmation of the results of the investigation.

──────────────────────────────────────────────────
`;

  if (stateLawRecord?.active && stateLawRecord.letterStageAllowed.includes(request.stage)) {
    body += `STATE LAW NOTICE — ${stateLawRecord.stateCode}
${stateLawRecord.statuteName}, ${stateLawRecord.citation} applies. Remedies: ${stateLawRecord.remedies.join("; ")}.${stateLawRecord.attorneyFeesFlag ? " Attorney fee shifting applies." : ""}

`;
  }

  body += `──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `This letter constitutes a formal direct dispute under FCRA § 623(a)(8) / 15 U.S.C. § 1681s-2(b). Failure to conduct a reasonable investigation, failure to correct inaccurate or incomplete information, or continued reporting of inaccurate information may subject the Furnisher to liability under 15 U.S.C. § 1681n and § 1681o.

Please direct all correspondence to my current address on file.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
Direct furnisher dispute pursuant to FCRA § 623(a)(8) | 15 U.S.C. § 1681s-2(b)
Credit Wizard AI — Generated ${todayShort()}
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 4: Cross-Bureau Contradiction Letter — FCRA § 611 / § 623
// ─────────────────────────────────────────────────────────────────────────────

function contradictionLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile } = request;
  const metrics = tradeline.contradictionMetrics;

  if (!hasRealContradictionData(metrics)) {
    return ""; // suppressed
  }

  const furnisher = getCreditorName(tradeline);
  const exhibits: string[] = [
    "Multi-bureau credit reports showing contradictory reporting",
    "Primary source documents contradicting reported information",
    "Timeline analysis demonstrating inconsistency",
  ];

  const subject = `CROSS-BUREAU CONTRADICTION DISPUTE — FCRA § 611 / 15 U.S.C. § 1681i\nAccount: ${safeMask(tradeline.accountNumberMasked)} | Creditor: ${furnisher}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `CROSS-BUREAU CONTRADICTION DISPUTE — FAIR CREDIT REPORTING ACT § 611 / 15 U.S.C. § 1681i

Dear Sir or Madam:

I am writing to formally dispute the above-referenced tradeline appearing in my consumer credit file maintained by ${BUREAU_ADDRESSES[bureau].name} ("Bureau"), on the grounds that there exists a direct, verifiable contradiction between how this account is reported across consumer reporting agencies, and between the credit file and primary source documents.

This contradiction constitutes a material inaccuracy in my credit file and violates the reinvestigation requirements of the Fair Credit Reporting Act.

──────────────────────────────────────────────────
IDENTIFIED CONTRADICTIONS
──────────────────────────────────────────────────

CONTRADICTION 1 — Cross-Bureau Conflicts
Cross-bureau conflicts detected: ${metrics?.crossBureauConflicts ?? 0}
One or more consumer reporting agencies are reporting this account differently from others. Specifically, at least one bureau has deleted, corrected, or verified differently than ${BUREAU_ADDRESSES[bureau].name}, creating an irreconcilable inconsistency in my credit file that directly impacts my creditworthiness assessment.

CONTRADICTION 2 — Report vs. Primary Source Conflicts
Report vs. document conflicts detected: ${metrics?.reportVsDocumentConflicts ?? 0}
The information reported by ${BUREAU_ADDRESSES[bureau].name} conflicts with primary source documents in my possession, including account records, correspondence, and financial records. These documents demonstrate that the information as reported is inaccurate.

CONTRADICTION 3 — Furnisher vs. Bureau Conflicts
Furnisher vs. bureau conflicts detected: ${metrics?.furnisherVsBureauConflicts ?? 0}
The furnisher of this account has provided information to ${BUREAU_ADDRESSES[bureau].name} that conflicts with either (a) the furnisher's own records, (b) information provided to another bureau, or (c) primary source documents. This creates a verifiable inconsistency that renders the reported information unreliable.

CONTRADICTION 4 — One Bureau Deleted, Another Verified
One-deleted-another-verified instances: ${metrics?.oneBureauDeletedAnotherVerified ?? 0}
At least one other consumer reporting agency has deleted this account or indicated it cannot be verified, while ${BUREAU_ADDRESSES[bureau].name} continues to report the account as accurate. This differential treatment is itself evidence of material inaccuracy and/or unverifiability.

CONTRADICTION 5 — Timeline Impossibility
Timeline impossibilities detected: ${metrics?.timelineImpossibility ?? 0}
The chronological sequence of events associated with this account, as reported by ${BUREAU_ADDRESSES[bureau].name}, is inconsistent with established facts or primary source records. This timeline impossibility demonstrates that the information is inaccurate.

CONTRADICTION 6 — Ownership / Identity Conflict
Ownership or identity conflicts detected: ${metrics?.ownershipOrIdentityConflict ?? 0}
The reporting of this account raises questions of ownership or identity that ${BUREAU_ADDRESSES[bureau].name} has failed to investigate or resolve, including whether the account was legitimately incurred by the consumer.

──────────────────────────────────────────────────
LEGAL BASIS — FCRA § 611 / 15 U.S.C. § 1681i
──────────────────────────────────────────────────

Pursuant to 15 U.S.C. § 1681i(a)(1)(A), the Bureau is required to conduct a reasonable reinvestigation of disputed information upon receiving a dispute from a consumer. When contradictions exist across bureaus and between bureaus and source documents, the Bureau cannot satisfy its reinvestigation obligation by simply re-verifying the disputed item without investigating and addressing the contradiction.

Under 15 U.S.C. § 1681i(a)(5)(B), if information is found to be inaccurate, incomplete, or unverifiable, the Bureau must correct or delete the information. A verified-but-contradicted item cannot be considered accurate and complete within the meaning of the FCRA.

Under 15 U.S.C. § 1681i(a)(2), the Bureau must provide the furnisher with notice of the dispute and require the furnisher to investigate. If the furnisher's response creates or confirms a contradiction, the Bureau cannot treat the item as verified without resolving the contradiction.

──────────────────────────────────────────────────
EVIDENCE STRENGTH ASSESSMENT
──────────────────────────────────────────────────

Source document strength: ${metrics?.sourceDocumentStrength ?? 0}/5
Precision of requested remedy: ${metrics?.precisionOfRequestedRemedy ?? 0}/5

The evidence record demonstrates that this item should be deleted or corrected. Continued reporting of a contradicted, unverifiable, or inaccurate item following reinvestification violates FCRA § 611.

──────────────────────────────────────────────────
REQUEST FOR INVESTIGATION AND REMEDY
──────────────────────────────────────────────────

I respectfully request that the Bureau:

1. Conduct a thorough reinvestigation that specifically addresses each identified contradiction;
2. Obtain and review all relevant information from the furnisher and from the consumer;
3. Reconcile the cross-bureau reporting inconsistencies;
4. Correct or delete the information if any contradiction cannot be resolved in the Bureau's favor;
5. Provide me with a written report of the reinvestigation results that specifically addresses each contradiction identified herein;
6. If the Bureau determines this item is accurate, provide a detailed explanation of how each identified contradiction has been resolved and the specific records relied upon.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `This letter constitutes a formal dispute under FCRA § 611 / 15 U.S.C. § 1681i based on cross-bureau contradictions. The Bureau may not treat this item as verified without investigating and resolving each identified contradiction. Failure to resolve contradictions, or re-verification without addressing contradictions, may subject the Bureau to liability under 15 U.S.C. § 1681n.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
Cross-bureau contradiction dispute pursuant to FCRA § 611 | 15 U.S.C. § 1681i
Credit Wizard AI — Generated ${todayShort()}
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 5: CFPB Escalation Letter — complaint_escalation stage
// ─────────────────────────────────────────────────────────────────────────────

function cfpbEscalationLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile } = request;
  const consumer = caseFile.consumer;
  const furnisher = getCreditorName(tradeline);

  const exhibits: string[] = [
    "Copy of prior dispute letter(s) and proof of delivery",
    "Credit report(s) with disputed item highlighted",
    "Response received from Bureau or furnisher (if any)",
    "Supporting primary source documents",
  ];

  const subject = `CFPB COMPLAINT ESCALATION — FCRA VIOLATION\nAccount: ${safeMask(tradeline.accountNumberMasked)} | ${furnisher} | Bureau: ${BUREAU_ADDRESSES[bureau].name}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `CFPB COMPLAINT — FAIR CREDIT REPORTING ACT VIOLATIONS\nEscalation to Consumer Financial Protection Bureau

──────────────────────────────────────────────────
PREFACE — NOTICE OF ESCALATION
──────────────────────────────────────────────────

Date: ${today()}

Consumer Financial Protection Bureau
Consumer Response Unit
P.O. Box 29099
Chandler, AZ 85226-0099
https://www.consumerfinance.gov/complaint/

Re: Consumer Credit Report Dispute — Escalation
Consumer: ${client.fullName}
Address: ${consumer.currentAddress}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Disputed Bureau: ${BUREAU_ADDRESSES[bureau].name}
Disputed Creditor: ${furnisher}
Account: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "N/A"}
Status: ${tradeline.status ?? "N/A"}
Balance: ${tradeline.balance !== undefined ? `$${tradeline.balance.toLocaleString("en-US")}` : "N/A"}

──────────────────────────────────────────────────
NATURE OF COMPLAINT
──────────────────────────────────────────────────

I am writing to formally escalate a credit reporting dispute to the Consumer Financial Protection Bureau ("CFPB") pursuant to the consumer complaint process. The Bureau identified above — ${BUREAU_ADDRESSES[bureau].name} — has failed to comply with its obligations under the Fair Credit Reporting Act in connection with the above-referenced account, and I have not received appropriate relief through prior dispute channels.

Specifically:

1. I submitted a formal dispute to ${BUREAU_ADDRESSES[bureau].name} pursuant to FCRA § 611 / 15 U.S.C. § 1681i regarding the above-referenced account;
2. Despite receiving my dispute, ${BUREAU_ADDRESSES[bureau].name} has failed to conduct a reasonable reinvestigation, failed to correct inaccurate or unverifiable information, and/or has continued to report information that I have disputed with supporting evidence;
${tradeline.responseDefects.length > 0 ? `3. The Bureau's response (or lack of adequate response) constitutes a known response defect: ${tradeline.responseDefects.join(", ")}.` : "3. The Bureau has not provided a substantive response or adequate resolution to my dispute."}
4. The continued reporting of this inaccurate or unverifiable information has caused and continues to cause concrete harm to my creditworthiness and access to credit.

──────────────────────────────────────────────────
PRIOR DISPUTE HISTORY
──────────────────────────────────────────────────

${caseFile.caseHistory.priorDisputeHistoryPresent ? "I have previously disputed this item through standard dispute channels." : "This is my first formal dispute regarding this item."}
${caseFile.caseHistory.priorComplaintsPresent ? "I have also escalated this matter to other regulatory bodies." : "I have not previously escalated this matter to other regulatory bodies."}

Response defects identified: ${tradeline.responseDefects.length > 0 ? tradeline.responseDefects.join("; ") : "None formally classified."}
Prior events: ${tradeline.priorEvents.length > 0 ? tradeline.priorEvents.join("; ") : "None on record."}

──────────────────────────────────────────────────
LEGAL VIOLATIONS — FCRA § 611 / 15 U.S.C. § 1681i
──────────────────────────────────────────────────

${BUREAU_ADDRESSES[bureau].name} has violated the following provisions of the Fair Credit Reporting Act:

• 15 U.S.C. § 1681i(a)(1)(A) — Failure to conduct a reasonable reinvestigation upon receiving a consumer dispute;
• 15 U.S.C. § 1681i(a)(5)(B) — Failure to delete information that is inaccurate, incomplete, or unverifiable after reinvestigation;
• 15 U.S.C. § 1681i(a)(2) — Failure to provide adequate notice to the furnisher of the consumer's dispute;
• 15 U.S.C. § 1681i(a)(4) — Failure to take appropriate action in response to a furnisher's failure to investigate;
• 15 U.S.C. § 1681i(c) — Failure to prevent reinsertion of deleted information without proper procedures;
${tradeline.responseDefects.includes("continued_reporting_after_documentary_notice") ? "• 15 U.S.C. § 1681i(a)(1) — Continued reporting after documentary notice of inaccuracy." : ""}

──────────────────────────────────────────────────
HARM SUFFERED
──────────────────────────────────────────────────

The inaccurate or unverifiable reporting of this account has:

• Decreased my credit score;
• Resulted in denial of credit or unfavorable credit terms;
• Caused increased cost of credit;
• Required me to expend time and resources pursuing this dispute.

Harm events on record: ${tradeline.harmEvents && tradeline.harmEvents.length > 0 ? tradeline.harmEvents.join("; ") : "Documented in case file."}

──────────────────────────────────────────────────
REQUEST FOR RELIEF
──────────────────────────────────────────────────

I respectfully request that the CFPB:

1. Investigate the failure of ${BUREAU_ADDRESSES[bureau].name} to comply with its FCRA obligations;
2. Require the Bureau to correct or delete the inaccurate or unverifiable information;
3. Take such other enforcement action as the CFPB deems appropriate under 15 U.S.C. § 1681n (willful noncompliance) and § 1681o (negligent noncompliance);
4. Confirm resolution in writing to me and to the CFPB complaint portal.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge.

This complaint is submitted through the CFPB's consumer complaint portal at https://www.consumerfinance.gov/complaint/ and via this written escalation letter. I reserve all rights and remedies available under the Fair Credit Reporting Act and applicable state law.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
CFPB complaint escalation | FCRA violations | Generated ${todayShort()}
Credit Wizard AI
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 6: State Attorney General Escalation Letter
// ─────────────────────────────────────────────────────────────────────────────

function stateAGLetter(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile, stateLawRecord } = request;
  const consumer = caseFile.consumer;
  const stateCode = consumer.currentState;
  const furnisher = getCreditorName(tradeline);

  const exhibits: string[] = [
    "Copy of prior dispute letter(s) and proof of delivery",
    "Credit report with disputed item highlighted",
    "Response from Bureau or furnisher (if any)",
    "Supporting primary source documents",
  ];

  const subject = `STATE ATTORNEY GENERAL COMPLAINT — FCRA / STATE LAW VIOLATIONS\nAccount: ${safeMask(tradeline.accountNumberMasked)} | ${furnisher} | Bureau: ${BUREAU_ADDRESSES[bureau].name}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `COMPLAINT TO STATE ATTORNEY GENERAL — FAIR CREDIT REPORTING ACT VIOLATIONS\nAND APPLICABLE STATE LAW

──────────────────────────────────────────────────
PREFACE — ESCALATION TO STATE LAW ENFORCEMENT
──────────────────────────────────────────────────

Date: ${today()}

[State Attorney General — ${stateCode}]
Consumer Protection / Financial Services Division
[Address of State Attorney General]

Re: Consumer Credit Report Dispute — Request for Enforcement Action
Consumer: ${client.fullName}
Address: ${consumer.currentAddress}
Date of Birth: ${client.dateOfBirth}
SSN: ****
State: ${stateCode}
Disputed Bureau: ${BUREAU_ADDRESSES[bureau].name}
Disputed Creditor: ${furnisher}
Account: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "N/A"}

──────────────────────────────────────────────────
NATURE OF COMPLAINT
──────────────────────────────────────────────────

I am writing to request that your office investigate and take appropriate enforcement action against ${BUREAU_ADDRESSES[bureau].name} for violations of the Fair Credit Reporting Act and applicable ${stateCode} state law in connection with the above-referenced consumer credit file dispute.

I have previously disputed the above-referenced account with ${BUREAU_ADDRESSES[bureau].name} pursuant to FCRA § 611 / 15 U.S.C. § 1681i, and the Bureau has failed to correct inaccurate or unverifiable information, failed to conduct a reasonable reinvestigation, and/or has continued to report information despite my dispute with supporting documentation.

──────────────────────────────────────────────────
FEDERAL VIOLATIONS — FAIR CREDIT REPORTING ACT
──────────────────────────────────────────────────

The Bureau has violated the following provisions of the Fair Credit Reporting Act:

• 15 U.S.C. § 1681i(a)(1)(A) — Failure to conduct a reasonable reinvestigation;
• 15 U.S.C. § 1681i(a)(5)(B) — Failure to delete inaccurate or unverifiable information after reinvestigation;
• 15 U.S.C. § 1681i(a)(2) — Failure to properly notify the furnisher of the dispute;
• 15 U.S.C. § 1681i(c) — Failure to prevent unlawful reinsertion of deleted information.

Response defects identified: ${tradeline.responseDefects.length > 0 ? tradeline.responseDefects.join("; ") : "None formally classified."}

──────────────────────────────────────────────────
${stateLawRecord?.active ? `STATE LAW VIOLATIONS — ${stateCode.toUpperCase()}` : "STATE LAW — APPLICABLE STATE STATUTES"}
──────────────────────────────────────────────────

${
  stateLawRecord?.active && stateLawRecord.letterStageAllowed.includes(request.stage)
    ? `Applicable ${stateCode} state law: ${stateLawRecord.statuteName}, ${stateLawRecord.citation}
Claim category: ${stateLawRecord.claimCategory}
Applies to: ${stateLawRecord.appliesTo.join(", ")}
Trigger conditions: ${stateLawRecord.triggerConditions.join("; ")}
Remedies: ${stateLawRecord.remedies.join("; ")}
${stateLawRecord.attorneyFeesFlag ? "Attorney fee shifting is applicable under this statute." : ""}
${stateLawRecord.noticeRequired ? `Notice required: ${stateLawRecord.noticeTiming ?? "Per statute"}` : "Notice not explicitly required."}
`
    : `${stateCode} state consumer protection statutes may apply to credit reporting violations. I request that your office evaluate whether the Bureau's conduct violates applicable ${stateCode} state law governing consumer credit reporting and consumer protection.`
}

──────────────────────────────────────────────────
HARM SUFFERED
──────────────────────────────────────────────────

The inaccurate or unverifiable reporting of this account has caused concrete harm, including harm to my creditworthiness, denial of credit, increased cost of credit, and expenditure of time and resources in pursuing this dispute.

Harm events: ${tradeline.harmEvents && tradeline.harmEvents.length > 0 ? tradeline.harmEvents.join("; ") : "Documented in case file."}

──────────────────────────────────────────────────
REQUEST FOR RELIEF
──────────────────────────────────────────────────

I respectfully request that your office:

1. Investigate the conduct of ${BUREAU_ADDRESSES[bureau].name} for violations of the FCRA and applicable ${stateCode} state law;
2. Take appropriate enforcement action including injunctive relief, consumer restitution, and civil penalties;
3. Notify ${BUREAU_ADDRESSES[bureau].name} of its obligations under federal and ${stateCode} state law;
4. Confirm resolution in writing to me.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge. I reserve all rights and remedies available under the Fair Credit Reporting Act, applicable ${stateCode} state law, and applicable consumer protection statutes.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}
State: ${stateCode}

─────────────────────────────────────────────────────────────
State Attorney General complaint | FCRA and state law violations | Generated ${todayShort()}
Credit Wizard AI
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 7: Pre-Claim Notice — before arbitration/litigation
// ─────────────────────────────────────────────────────────────────────────────

function preClaimNotice(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile, stateLawRecord } = request;

  // Soft stop: suppress if premature_preclaim_tone flag is set in remarksComments
  if (
    request.caseFile &&
    // @ts-ignore — remarksComments may contain informal soft-stop flag
    tradeline.remarksComments?.toLowerCase().includes("premature_preclaim_tone")
  ) {
    return ""; // suppressed
  }

  const furnisher = getCreditorName(tradeline);
  const exhibits: string[] = [
    "Chronology of all prior disputes and responses",
    "All supporting primary source documents",
    "Identity theft documentation (if applicable)",
    "Harm documentation and damages record",
  ];

  const subject = `FORMAL PRE-CLAIM NOTICE — FCRA / DEMAND FOR CORRECTION OR REMOVAL\nAccount: ${safeMask(tradeline.accountNumberMasked)} | ${furnisher} | Bureau: ${BUREAU_ADDRESSES[bureau].name}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `FORMAL PRE-CLAIM NOTICE — DEMAND FOR CORRECTION OR REMOVAL\nFair Credit Reporting Act | 30-Day Notice Before Legal Action

──────────────────────────────────────────────────
PREFACE — FORMAL NOTICE
──────────────────────────────────────────────────

Date: ${today()}

${BUREAU_ADDRESSES[bureau].name}
${BUREAU_ADDRESSES[bureau].street}
${BUREAU_ADDRESSES[bureau].city}, ${BUREAU_ADDRESSES[bureau].state}  ${BUREAU_ADDRESSES[bureau].zip}

Re: Formal Pre-Claim Notice — Demanding Correction or Removal of Inaccurate Information
Consumer: ${client.fullName}
Date of Birth: ${client.dateOfBirth}
Current Address: ${client.currentAddress}
SSN: ****
Account Reference: ${safeMask(tradeline.accountNumberMasked)}
Creditor/Furnisher: ${furnisher}

──────────────────────────────────────────────────
INTRODUCTION — NOTICE OF INTENT
──────────────────────────────────────────────────

I am writing to provide formal notice that I intend to pursue legal remedies against ${BUREAU_ADDRESSES[bureau].name} and/or the furnisher of the above-referenced account unless appropriate corrective action is taken within thirty (30) days of the date of this letter.

This notice is provided in accordance with applicable FCRA requirements and constitutes a formal pre-litigation demand pursuant to 15 U.S.C. § 1681i and applicable state law. This letter is not a routine dispute; it represents a formal escalation indicating my intent to preserve all legal claims and remedies available under federal and state law.

──────────────────────────────────────────────────
DISPUTED ITEM
──────────────────────────────────────────────────

Creditor/Furnisher: ${furnisher}
Account Number: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "N/A"}
Status: ${tradeline.status ?? "N/A"}
Balance: ${tradeline.balance !== undefined ? `$${tradeline.balance.toLocaleString("en-US")}` : "N/A"}
Date of First Delinquency: ${tradeline.dateOfFirstDelinquency ?? "N/A"}

──────────────────────────────────────────────────
CHRONOLOGY OF DISPUTE AND RESPONSE FAILURES
──────────────────────────────────────────────────

I have previously disputed the above-referenced account through the following channels:

${tradeline.priorEvents.length > 0 ? tradeline.priorEvents.map((e) => `• ${e}`).join("\n") : "• Prior dispute(s) filed — specific events documented in case file"}
${tradeline.responseDefects.length > 0 ? `\nResponse defects identified in Bureau's handling:\n${tradeline.responseDefects.map((d) => `• ${d}`).join("\n")}` : ""}

Despite my prior dispute efforts, ${BUREAU_ADDRESSES[bureau].name} has:

• Failed to conduct a reasonable reinvestigation;
• Failed to correct or delete inaccurate or unverifiable information;
• Failed to provide adequate notice to the furnisher;
• Failed to respond with a substantive determination; and/or
• Continued to report information disputed with supporting documentation.

──────────────────────────────────────────────────
LEGAL BASIS — FCRA AND STATE LAW
──────────────────────────────────────────────────

This notice is issued pursuant to and in compliance with the following legal authorities:

1. Fair Credit Reporting Act, 15 U.S.C. § 1681i — Reinvestigation requirements;
2. FCRA § 611(a)(5)(B) — Deletion of unverifiable information;
3. FCRA § 611(c) — Procedures to prevent reinsertion;
${stateLawRecord?.active
  ? `4. ${stateLawRecord.statuteName}, ${stateLawRecord.citation} — ${stateLawRecord.stateCode} state consumer protection;`
  : "4. Applicable state consumer protection statutes."}
${stateLawRecord?.attorneyFeesFlag ? "\n5. State law attorney fee shifting provisions apply." : ""}

──────────────────────────────────────────────────
CLAIM READINESS STATUS
──────────────────────────────────────────────────

Readiness signals for this claim:
• Notice maturity: ${caseFile.caseHistory.priorComplaintsPresent || caseFile.caseHistory.priorDisputeHistoryPresent ? "Established" : "Developing"}
• Document maturity: ${tradeline.evidenceItems.length} evidence item(s) on record
• Contradiction maturity: ${hasRealContradictionData(tradeline.contradictionMetrics) ? "Established" : "Developing"}
• Harm record: ${tradeline.harmEvents && tradeline.harmEvents.length > 0 ? "On record" : "In development"}
• Response defect severity: ${tradeline.responseDefects.length} defect(s) identified

This claim is escalating toward ${tradeline.readinessSignals?.validArbitrationClauseLocated ? "arbitration" : "litigation"} readiness. The response defects documented above establish a pattern of noncompliance that supports a claim for willfulness or negligence under 15 U.S.C. § 1681n and § 1681o.

──────────────────────────────────────────────────
DEMAND FOR ACTION
──────────────────────────────────────────────────

I hereby demand that ${BUREAU_ADDRESSES[bureau].name}:

1. Conduct a thorough and complete reinvestigation of the above-referenced account;
2. Delete or correct all inaccurate, incomplete, or unverifiable information;
3. Provide written confirmation of the action taken and the specific records relied upon;
4. Compensate me for any harm caused by the inaccurate reporting of this account;
5. Preserve all records related to this account for potential legal proceedings.

If this demand is not satisfied within thirty (30) days of the date of this letter, I will pursue all available legal remedies, including but not limited to filing a complaint with the CFPB, the State Attorney General, and/or filing a civil action under FCRA § 616 and § 617, without further notice.

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `This letter is a formal pre-claim notice. I reserve all rights and remedies under the Fair Credit Reporting Act, including the right to seek actual damages, punitive damages, attorney's fees, and costs under 15 U.S.C. § 1681n (willful noncompliance) and § 1681o (negligent noncompliance), and under applicable state law.

This notice is given in good faith and with the intention of achieving resolution without litigation. However, my silence or inaction after thirty days will be treated as a refusal to remedy, and I will proceed accordingly.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
Formal pre-claim notice | FCRA | 30-day demand | Generated ${todayShort()}
Credit Wizard AI — Reserved Rights Under 15 U.S.C. § 1681n and § 1681o
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter 8: Arbitration Packet Cover Letter
// ─────────────────────────────────────────────────────────────────────────────

function arbitrationPacketCover(request: LetterRequest): string {
  const { client, tradeline, bureau, caseFile, stateLawRecord } = request;
  const readiness = tradeline.readinessSignals;
  const furnisher = getCreditorName(tradeline);

  const exhibits: string[] = [
    "Exhibit A — Complete Chronology of Dispute Events",
    "Exhibit B — All Prior Dispute Letters and Responses",
    "Exhibit C — Credit Reports (Multi-Bureau)",
    "Exhibit D — Primary Source Documents Supporting Claim",
    "Exhibit E — Identity Theft Documentation (if applicable)",
    "Exhibit F — Harm and Damages Record",
    "Exhibit G — Response Defect Analysis",
    "Exhibit H — State Law Overlay Analysis",
  ];

  const subject = `ARBITRATION PACKET — DEMAND FOR ARBITRATION\nAccount: ${safeMask(tradeline.accountNumberMasked)} | ${furnisher} | Bureau: ${BUREAU_ADDRESSES[bureau].name}`;

  let body = buildHeader(bureau, caseFile, tradeline, subject, exhibits);

  body += `ARBITRATION PACKET COVER LETTER\nDemand for Arbitration of Credit Reporting Dispute

──────────────────────────────────────────────────
PREFACE — ARBITRATION READINESS
──────────────────────────────────────────────────

Date: ${today()}

${BUREAU_ADDRESSES[bureau].name}
${BUREAU_ADDRESSES[bureau].street}
${BUREAU_ADDRESSES[bureau].city}, ${BUREAU_ADDRESSES[bureau].state}  ${BUREAU_ADDRESSES[bureau].zip}

Re: Demand for Arbitration — Consumer Credit Report Dispute
Consumer: ${client.fullName}
Date of Birth: ${client.dateOfBirth}
Current Address: ${client.currentAddress}
SSN: ****
Account Reference: ${safeMask(tradeline.accountNumberMasked)}
Creditor/Furnisher: ${furnisher}
Dispute Amount: TBD (actual and statutory damages)

──────────────────────────────────────────────────
ARBITRATION NOTICE
──────────────────────────────────────────────────

I, ${client.fullName}, hereby invoke my right to arbitrate all disputes arising from the above-referenced consumer credit file and the inaccurate, incomplete, or unverifiable reporting of the identified account by ${BUREAU_ADDRESSES[bureau].name} and/or the furnisher of that account.

This arbitration demand is made pursuant to any applicable arbitration agreement governing this account, or in the alternative, pursuant to the arbitration rules of the American Arbitration Association (AAA) or other mutually agreed arbitration forum.

──────────────────────────────────────────────────
CLAIM READINESS VERIFICATION
──────────────────────────────────────────────────

Arbitration gating checks passed:

• Valid arbitration clause located: ${readiness?.validArbitrationClauseLocated ? "YES" : "NO — review required"}
• Proper party identified (furnisher/collector): ${readiness?.arbitrationProperPartyIdentified ? "YES" : "NO — review required"}
• Claim appears within scope of arbitration clause: ${readiness?.arbitrationClaimAppearsInScope ? "YES" : "NO — review required"}
• Arbitration forum known: ${readiness?.arbitrationForumKnown ? "YES" : "NO — review required"}
• Notice requirement captured: ${readiness?.arbitrationNoticeRequirementCaptured ? "YES" : "NO — review required"}
• Mature notice record: ${readiness?.matureNoticeRecord ? "YES" : "NO — review required"}
• State and federal claim inventory clean: ${readiness?.stateFederalClaimInventoryClean ? "YES" : "NO — review required"}
• Chronology clean: ${readiness?.chronologyClean ? "YES" : "NO — review required"}
• Exhibits clean: ${readiness?.exhibitsClean ? "YES" : "NO — review required"}
• State overlay matched: ${readiness?.stateOverlayMatched ? "YES" : "NO — review required"}

${stateLawRecord?.active ? `State overlay: ${stateLawRecord.statuteName}, ${stateLawRecord.citation} — ${stateLawRecord.stateCode}` : "State overlay: Federal-only (no active state overlay)"}

──────────────────────────────────────────────────
DISPUTED ITEM SUMMARY
──────────────────────────────────────────────────

Creditor/Furnisher: ${furnisher}
Account Number: ${safeMask(tradeline.accountNumberMasked)}
Account Type: ${tradeline.accountType ?? "N/A"}
Status: ${tradeline.status ?? "N/A"}
Balance: ${tradeline.balance !== undefined ? `$${tradeline.balance.toLocaleString("en-US")}` : "N/A"}
Date of First Delinquency: ${tradeline.dateOfFirstDelinquency ?? "N/A"}

Response defects: ${tradeline.responseDefects.length > 0 ? tradeline.responseDefects.join("; ") : "None classified"}
Prior events: ${tradeline.priorEvents.length > 0 ? tradeline.priorEvents.join("; ") : "None on record"}
Harm events: ${tradeline.harmEvents && tradeline.harmEvents.length > 0 ? tradeline.harmEvents.join("; ") : "None on record"}

──────────────────────────────────────────────────
LEGAL CLAIMS
──────────────────────────────────────────────────

1. FCRA § 611 / 15 U.S.C. § 1681i — Failure to conduct reasonable reinvestigation;
2. FCRA § 611(a)(5)(B) / 15 U.S.C. § 1681i(a)(5)(B) — Failure to delete inaccurate or unverifiable information;
3. FCRA § 623 / 15 U.S.C. § 1681s-2 — Failure to investigate and correct furnished information;
${tradeline.responseDefects.includes("continued_reporting_after_documentary_notice") ? "4. FCRA § 611 / 15 U.S.C. § 1681i — Continued reporting after documentary notice of inaccuracy;" : ""}
${stateLawRecord?.active ? `5. ${stateLawRecord.statuteName} — ${stateLawRecord.stateCode} state consumer protection;` : ""}
${stateLawRecord?.attorneyFeesFlag ? "6. State law attorney fee shifting provisions apply." : ""}

──────────────────────────────────────────────────
DAMAGES
──────────────────────────────────────────────────

Actual damages: To be established (credit score damage, denial of credit, increased cost of credit, emotional distress, time expenditure).
Statutory damages: Available under FCRA § 616 for willful noncompliance.
Punitive damages: Available for willful misconduct.
Attorney's fees and costs: Available under FCRA § 616 and § 617.

──────────────────────────────────────────────────
ARBITRATION FORUM AND NOTICE
──────────────────────────────────────────────────

Forum: American Arbitration Association (AAA) Commercial Arbitration Rules
Place of Arbitration: Consumer's state of residence
Governing Law: Federal Arbitration Act, FCRA, and applicable state law

──────────────────────────────────────────────────
`;

  body += buildDeclaration(client);
  body += buildExhibits(exhibits);

  body += `I declare under penalty of perjury that the exhibits attached hereto are true and accurate to the best of my knowledge, and that all information provided in this arbitration packet is complete and accurate.

This arbitration demand is made without prejudice to any other rights and remedies available at law or in equity. I reserve the right to supplement this packet and to amend my claims as discovery proceeds.

Sincerely,

${client.firstName} ${client.lastName}
Date of Birth: ${client.dateOfBirth}
SSN: ****
Current Address: ${client.currentAddress}

─────────────────────────────────────────────────────────────
ARBITRATION PACKET — CONFIDENTIAL — Prepared for AAA Arbitration
Fair Credit Reporting Act violations | FCRA §§ 611, 623, 615, 616, 617
15 U.S.C. §§ 1681i, 1681s-2, 1681m, 1681n, 1681o
Credit Wizard AI — Generated ${todayShort()}
`;

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dispatcher — generateLetter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a letter string based on the stage, hard stops, soft stops, and tradeline data.
 * Implements all hard stop gates and suppresses letters that cannot be lawfully generated.
 *
 * Hard stops:
 * - knownAccurate === true → SUPPRESS all letters
 * - specialLane === "identity_theft" + incomplete package → fall back to bureau dispute
 * - specialLane === "statutory_block" + not block eligible → fall back to identity theft lane
 * - directFurnisherSufficiencyPassed !== true → fall back to bureau dispute
 * - contradictionMetrics all zeros/empty → SUPPRESS contradiction letter
 * - premature_preclaim_tone (in remarksComments) → SUPPRESS pre-claim notice
 */
export function generateLetter(request: LetterRequest): string {
  const { tradeline, stage } = request;

  // ── Hard Stop: Known Accurate Information ─────────────────────────────────
  if (tradeline.knownAccurate === true) {
    // Do not generate any letter for this tradeline
    return "";
  }

  // ── Stage routing with hard stop overrides ─────────────────────────────────

  switch (stage) {
    case "bureau_round_1":
    case "furnisher_round_1": {
      // If statutory block lane and block eligible → identity theft block letter
      if (
        (tradeline.specialLane === "statutory_block" && isBlockEligible(tradeline)) ||
        tradeline.specialLane === "identity_theft"
      ) {
        if (identityTheftPackageComplete(tradeline.identityTheftPackage)) {
          return identityTheftBlockLetter(request);
        }
        // Fall through to bureau dispute if package incomplete
      }

      // Direct furnisher lane — only if sufficiency passed and furnisherName available
      if (
        stage === "furnisher_round_1" &&
        tradeline.directFurnisherSufficiencyPassed === true &&
        tradeline.furnisherName
      ) {
        return directFurnisherLetter(request);
      }
      // Fall back to bureau dispute
      return bureauDisputeLetter(request);
    }

    case "contradiction_round": {
      // Only fire contradiction letter if contradictionMetrics has real data
      if (hasRealContradictionData(tradeline.contradictionMetrics)) {
        return contradictionLetter(request);
      }
      // Fall back to bureau dispute
      return bureauDisputeLetter(request);
    }

    case "complaint_escalation": {
      // identity theft statutory block first
      if (
        (tradeline.specialLane === "statutory_block" || tradeline.specialLane === "identity_theft") &&
        isBlockEligible(tradeline)
      ) {
        return identityTheftBlockLetter(request);
      }
      // CFPB escalation for complaint_escalation stage
      return cfpbEscalationLetter(request);
    }

    case "pre_claim": {
      // Soft stop: suppress if premature_preclaim_tone flag set in remarksComments
      // @ts-ignore — remarksComments may contain informal soft-stop flag
      if (tradeline.remarksComments?.toLowerCase().includes("premature_preclaim_tone")) {
        return ""; // suppressed
      }
      return preClaimNotice(request);
    }

    case "arbitration_ready": {
      return arbitrationPacketCover(request);
    }

    default:
      // stage_0_intake, monitoring, litigation_referral — default to bureau dispute
      return bureauDisputeLetter(request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  bureauDisputeLetter,
  identityTheftBlockLetter,
  directFurnisherLetter,
  contradictionLetter,
  cfpbEscalationLetter,
  stateAGLetter,
  preClaimNotice,
  arbitrationPacketCover,
  hasRealContradictionData,
  identityTheftPackageComplete,
  isBlockEligible,
};
// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible export for parse-credit-report route
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use generateLetter(LetterRequest) instead.
 * This wrapper supports the legacy client+tradeline+bureau signature from the
 * parse-credit-report API route.
 */
export function generateDisputeLetter(
  client: {
    firstName: string;
    lastName: string;
    fullName?: string;
    currentAddress?: string;
    dateOfBirth?: string | null;
    ssnLast4?: string | null;
  },
  tradeline: {
    bureau?: string;
    accountNumber?: string;
    accountNumberMasked?: string;
    accountType?: string;
    category?: string;
    status?: string;
    balance?: number | null;
    creditor?: string;
    furnisherName?: string;
    originalCreditor?: string;
    collectorName?: string;
    responseDefects?: string[];
    priorEvents?: string[];
    evidenceItems?: Array<{ id: string; type: string; label: string }>;
    specialLane?: string;
    scores?: { fundingPriorityScore?: number; removabilityScore?: number; evidenceScore?: number };
    deltaTypes?: string[];
    harmEvents?: string[];
    remarksComments?: string;
    readinessSignals?: TradelineCase["readinessSignals"];
    identityTheftPackage?: TradelineCase["identityTheftPackage"];
    contradictionMetrics?: TradelineCase["contradictionMetrics"];
    targetType?: string;
    theoryPrimary?: string;
    remedyPrimary?: string;
    dateOfFirstDelinquency?: string;
    lastPaymentDate?: string;
    monthlyPayment?: number;
    pastDue?: number;
    precisePriorCraDispute?: boolean;
    directFurnisherSufficiencyPassed?: boolean;
    knownAccurate?: boolean;
    responseClass?: string;
  },
  bureau: Bureau,
): string {
  const caseFile: DisputeCase = {
    consumer: {
      fullName: client.fullName ?? `${client.firstName} ${client.lastName}`,
      currentAddress: client.currentAddress ?? "",
      dob: client.dateOfBirth ?? "",
      ssnLast4: client.ssnLast4 ?? "",
      currentState: "",
    },
    fileContext: {
      reportSource: "",
      reportPullDates: [],
      bureauReportsPresent: [],
      identityTheftFlag: false,
      fraudAlertFlag: false,
      securityFreezeFlag: false,
    },
    businessContext: {
      primaryGoal: "delete_or_correct",
    },
    caseHistory: {
      priorDisputeHistoryPresent: false,
      priorComplaintsPresent: false,
      priorArbitrationOrLitigationPresent: false,
    },
    tradelines: [],
  };

  const mappedTradeline: TradelineCase = {
    bureau: tradeline.bureau ?? bureau,
    targetType: tradeline.targetType ?? tradeline.category ?? "OTHER",
    accountNumberMasked: tradeline.accountNumberMasked ?? (tradeline.accountNumber ? `****${tradeline.accountNumber.slice(-4)}` : "****"),
    accountType: tradeline.accountType ?? tradeline.category ?? "OTHER",
    theoryPrimary: tradeline.theoryPrimary ?? "accuracy",
    remedyPrimary: tradeline.remedyPrimary ?? "deletion",
    evidenceItems: tradeline.evidenceItems ?? [],
    priorEvents: tradeline.priorEvents ?? [],
    responseDefects: (tradeline.responseDefects ?? []) as TradelineCase["responseDefects"],
    specialLane: (tradeline.specialLane as TradelineCase["specialLane"]) ?? "standard",
    scores: {
      evidenceScore: tradeline.scores?.evidenceScore ?? 0,
      removabilityScore: tradeline.scores?.removabilityScore ?? 0,
      deltaScore: 0,
      resistanceScore: 0,
      damagesScore: 0,
      arbitrationScore: 0,
      fundingPriorityScore: tradeline.scores?.fundingPriorityScore ?? 0,
    },
    furnisherName: tradeline.furnisherName ?? tradeline.creditor,
    collectorName: tradeline.collectorName,
    originalCreditor: tradeline.originalCreditor,
    status: tradeline.status,
    balance: tradeline.balance ?? undefined,
    pastDue: tradeline.pastDue,
    monthlyPayment: tradeline.monthlyPayment,
    dateOfFirstDelinquency: tradeline.dateOfFirstDelinquency,
    lastPaymentDate: tradeline.lastPaymentDate,
    remarksComments: tradeline.remarksComments,
    harmEvents: tradeline.harmEvents ?? [],
    responseClass: tradeline.responseClass as TradelineCase["responseClass"],
    precisePriorCraDispute: tradeline.precisePriorCraDispute,
    directFurnisherSufficiencyPassed: tradeline.directFurnisherSufficiencyPassed,
    knownAccurate: tradeline.knownAccurate,
    identityTheftPackage: tradeline.identityTheftPackage,
    contradictionMetrics: tradeline.contradictionMetrics,
    deltaTypes: (tradeline.deltaTypes ?? []) as TradelineCase["deltaTypes"],
    readinessSignals: tradeline.readinessSignals,
  };

  return generateLetter({
    client: {
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.fullName ?? `${client.firstName} ${client.lastName}`,
      currentAddress: client.currentAddress ?? "",
      dateOfBirth: (client.dateOfBirth ?? "") as string,
      ssnLast4: (client.ssnLast4 ?? "") as string,
    },
    tradeline: mappedTradeline,
    bureau,
    stage: "bureau_round_1",
    caseFile,
  });
}
