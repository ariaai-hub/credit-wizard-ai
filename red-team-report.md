# Credit Wizard AI — Red Team Report
**Date:** 2026-06-04
**Reviewer:** Red Team Subagent
**Scope:** dispute-engine.ts, letter-generator.ts, bureau-addresses.ts, credit-hero-parser.ts

---

## CRITICAL Issues (must fix before launch)

### CRITICAL-1: Letter generator produces legally insufficient, generic dispute letters

**Severity:** CRITICAL
**File:** letter-generator.ts
**Description:** The generated letter is a template with one line of specificity: "Specifically, {reason}" where `reason` is a generic category ("account status is disputed" for GOOD, "account is past due" for PAST_DUE, etc.). This does not constitute a specific factual dispute under FCRA § 611. A consumer saying "this account is inaccurate" without identifying what specific information is inaccurate and why is a frivolous dispute. Bureaus are required to only investigate reasonably specific disputes — a form letter with generic language can be treated as frivolous and may not trigger a reinvestigation. This means the letter could be ignored or rejected, wasting the dispute opportunity.

**Attack surface:** Any consumer using the system will generate letters that don't survive FCRA scrutiny. If a bureau treats the letter as insufficient and doesn't reinvestigate, the consumer loses the § 611 window. If the letter is actually sent, the bureau may respond with "frivolous dispute" and keep the item on file.

**Recommended fix:** The letter must identify at minimum: (1) what specific data point is inaccurate (account status, payment history, balance, characterization), (2) what the consumer contends is the accurate version, and (3) a factual basis. The letter template needs to be rebuilt around specific dispute types with real content.

---

### CRITICAL-2: No furnisher letter exists — direct furnisher lane is dead code

**Severity:** CRITICAL
**File:** letter-generator.ts (absent), dispute-engine.ts
**Description:** The engine has a full `direct_furnisher_round` in the escalation options and routes to it via `furnisher_round_1` when `targetType` includes "furnisher" and `directFurnisherSufficiencyPassed === true`. The letter generator has zero furnisher-letter capability. There is no `generateFurnisherLetter()`. A consumer whose dispute requires going directly to the furnisher (as many do — FCRA § 623 direct dispute rights) will receive no letter. The route exists but the output does not.

Additionally, `evaluateTradeline()` correctly adds hard stop `direct_furnisher_lane_without_sufficiency_check` when `!directFurnisherSufficiencyPassed`, but the code **falls through to the default return** (bureau_round_1 + bureau_round escalation) instead of blocking. So even when the hard stop is present, a bureau letter is still generated instead of a hold.

**Attack surface:** A consumer with a furnisher dispute will either get no letter or get a bureau letter that goes to the wrong party. The furnisher never receives notice. The item persists.

**Recommended fix:** (1) Add `generateFurnisherDisputeLetter()` supporting FCRA § 623 direct disputes with correct furnisher addresses (requires furnisher address lookup table). (2) Fix the fallthrough: when `direct_furnisher_lane_without_sufficiency_check` is present, the default return must not be reached. Return a blocking state or monitoring state.

---

### CRITICAL-3: Identity theft statutory block under FCRA § 605B is incomplete and inoperable

**Severity:** CRITICAL
**File:** dispute-engine.ts, letter-generator.ts
**Description:** FCRA § 605B (15 U.S.C. § 1681c-1) creates a statutory block for identity theft information. The requirements are:
- An FTC-approved identity theft report (after 2018, must use the FTC's affidavit format)
- Two specific sworn statements: (a) the consumer didn't authorize the information, (b) the consumer didn't receive the goods/services

The engine's `identityTheftPackage` requires: `proofOfIdentity`, `identityTheftReport`, `informationIdentifiedToBeBlocked`, `consumerStatementNoRelationToTransaction`. This does NOT match § 605B:
- Missing: two separate sworn statements in the specific statutory language
- Missing: requirement that the report be FTC-approved format (not just "any report")
- Missing: the special address block (reports sent to a specific address for identity theft) must appear in the letter

Further, when `identity_theft_lane_without_required_package` hard stop is triggered, `evaluateTradeline()` **still falls through to a default return and routes to `bureau_round_1`** with `escalationOption: "bureau_round"`. The hard stop is recorded but not acted on to prevent letter generation.

**Attack surface:** A consumer who thinks they have identity theft protection and uploads a "sufficient" package gets a letter that doesn't satisfy § 605B. The item doesn't get blocked. The consumer loses the statutory right. If the letter is treated as a regular dispute, it may actually make the situation worse by alerting the furnisher to the consumer's active dispute.

**Recommended fix:** (1) Update `isIdentityTheftBlockEligible()` to require all § 605B elements. (2) Add `generateIdentityTheftBlockLetter()` with the § 605B required language and special address block. (3) Block letter generation when `identity_theft_lane_without_required_package` hard stop is present. (4) Document that an FTC-approved report is required (not just any police report or complaint).

---

### CRITICAL-4: Contradiction round detection exists but no corresponding letter type exists

**Severity:** CRITICAL
**File:** dispute-engine.ts, letter-generator.ts
**Description:** The engine routes to `contradiction_round` when `responseDefects.length > 0 || responseClass === "corrected_but_incomplete"`. The contradiction round threshold is `resistance_score >= 6 OR response_defect_count >= 1`. The system detects contradictions but has no letter type for contradiction rounds. The letter generator only produces a generic bureau dispute letter.

The contradiction scenario (e.g., Equifax deleted this account, TransUnion still shows it, and the furnisher verified it to TransUnion — a "verified_despite_cross_bureau_conflict") requires a letter that: (1) identifies the specific contradiction, (2) demands correction at all bureaus, (3) references the inconsistent response, (4) preserves the response defect for escalation. Sending a generic letter in a contradiction scenario doesn't disclose the contradiction and may allow the bureaus to re-verify without addressing the conflict.

**Attack surface:** A consumer with a verified-despite-conflict item gets a generic letter. The bureau and furnisher can re-verify without addressing the conflict. The contradiction is lost. CFPB escalation rights may be waived without proper notice of the specific contradiction.

**Recommended fix:** Add `generateContradictionLetter()` that takes the specific contradiction type and builds appropriate letter content citing the specific inconsistency. The letter must disclose what the contradiction is (e.g., "Equifax shows this account deleted, but TransUnion shows it verified — this is a cross-bureau conflict under FCRA § 611").

---

## HIGH Issues (should fix before launch)

### HIGH-1: Bureau addresses may be stale — no automated verification

**Severity:** HIGH
**File:** bureau-addresses.ts
**Description:** The three addresses in `BUREAU_ADDRESSES` have not been verified against current CFPB guidance or recent enforcement actions. Equifax's current address is listed here as `PO Box 105496, Atlanta, GA 30348-5496` — this may still be correct but has not been verified since the 2024 CFPB enforcement action against Equifax. Experian's address is listed as `PO Box 4500, Allen, TX 75013` — this is a PO Box, not a street address, and Experian has multiple dispute submission addresses including an electronic-only address. TransUnion's address is `PO Box 2000, Chester, PA 19022`.

Critically, Equifax has a separate dispute address for certain product lines and has changed addresses multiple times. If a consumer sends a dispute to a stale address, the bureau may not receive it and the dispute rights are lost.

**Attack surface:** Consumers whose letters go to outdated Equifax or Experian addresses will not receive reinvestigation. The 30-day clock under § 611 will not start. The consumer loses rights.

**Recommended fix:** Verify all three addresses against current CFPB guidance and FTC affixing-of-address records. Add a comment in the file with the date of last verification. Consider adding an electronic dispute URL as a fallback for bureaus that accept online disputes.

---

### HIGH-2: Letters cannot be submitted electronically — XML/eCRS submission not supported

**Severity:** HIGH
**File:** letter-generator.ts
**Description:** Equifax, Experian, and TransUnion all accept eCRS (electronic Consumer Dispute) submissions in XML format directly from data providers. The letter generator produces only a text letter. If a dispute is submitted by paper letter only, it takes longer, can be lost, and may not be entered into the bureaus' electronic tracking systems. This means consumers don't get automatic status updates and the dispute is harder to track for CFPB escalation.

**Attack surface:** Paper disputes take longer (35+ days vs. 30-day statutory window). If the letter arrives late, the bureau may close the dispute as untimely. The consumer loses the reinvestigation right.

**Recommended fix:** Add an eCRS XML submission capability. At minimum, add the correct XML schema output for each bureau's eCRS system. Alternatively, note in the product documentation that paper-only submissions are used and their known limitations.

---

### HIGH-3: `knownAccurate` field is never inferred — must be set explicitly or the hard stop never fires

**Severity:** HIGH
**File:** dispute-engine.ts, credit-hero-parser.ts
**Description:** The hard stop `dispute_of_known_accurate_information` only fires when `tradeline.knownAccurate === true`. This is an explicit field that must be set by the caller. The parser has no logic to infer from the credit report that an account is known-accurate (e.g., has been verified multiple times, has no dispute history, was previously marked accurate by the consumer). If a consumer uploads a credit report for an account that was already verified and marked accurate, the engine will not detect this and will generate a dispute letter anyway.

**Attack surface:** A consumer who has already resolved an account (or knows it is accurate) uploads their credit report. The engine sees the tradeline, has no `knownAccurate` flag, generates a dispute letter. The bureau re-investigates, finds the information accurate, marks it verified again. The consumer now has a verified tradeline that was previously clean. This makes the situation worse.

**Recommended fix:** The parser should infer `knownAccurate` from prior dispute history on the report (e.g., if the report shows prior disputes that were resolved or verified). Add a `priorVerifications` count and `knownAccurate` inference when an item has been verified across multiple reporting cycles without a successful dispute. Block or flag the item for human review.

---

### HIGH-4: No soft stop actually prevents letter generation — soft stops are advisory only

**Severity:** HIGH
**File:** dispute-engine.ts
**Description:** Soft stops (`DISPUTE_SOFT_STOPS` including "overbroad_omnibus_packet", "multi-theory_confusion", "emotional_language_over_factual_language") are computed and included in `TradelineEvaluation.softStops` but never used to gate letter generation. `evaluateTradeline()` returns a `TradelineEvaluation` with soft stops listed but no branch that checks them. The letter generator calls `evaluateTradeline()` and generates a letter regardless of soft stop content.

This means a tradeline flagged with "frivolous_or_irrelevant_notice" (soft stop `page_padding_without_relevance`) will still generate a letter. Sending a letter flagged as frivolous risks harming the consumer (bureau may reject the dispute as frivolous, losing rights) and could constitute unauthorized practice of law if the letter makes arguments the consumer can't support.

**Attack surface:** A consumer with a frivolous dispute (flagged in soft stops) gets a letter generated anyway. The letter goes to the bureau and is rejected as frivolous. The consumer now has a frivolous dispute on record. The item persists and the consumer has lost the § 611 window.

**Recommended fix:** Soft stops that indicate frivolous or irrelevant disputes should prevent auto-generation of a letter and flag for human review. At minimum, `page_padding_without_relevance` and `emotional_language_over_factual_language` must gate letter generation.

---

## MEDIUM Issues (fix after launch)

### MEDIUM-1: credit-hero-parser is fragile — silent data corruption on non-standard report formats

**Severity:** MEDIUM
**File:** credit-hero-parser.ts
**Description:** The parser uses regex-based line-by-line parsing with multiple `match()` calls and heuristics. If the PDF structure is non-standard (e.g., multi-column layout, unusual headers, non-English date formats, tables, merged cells), the parser will silently produce wrong data:
- `parseTradelineDate()` matches `([A-Za-z]+\s+\d{1,2},\s+\d{4})` — unusual formats fall through to `stripped.slice(0, 20)` which could be garbage
- `parseStatus()` returns "GOOD" as default — if the parser misses the status line, everything defaults to GOOD
- `parseAmount()` uses a simple regex that could match wrong fields
- Creditor name extraction removes amounts but doesn't verify the remainder is a real company name

No schema validation exists between parser output and dispute engine. A tradeline with `creditor: ""` or `balance: null` everywhere will silently pass through.

**Attack surface:** A consumer who uploads a non-standard credit report (e.g., a Veterans Affairs report, a non-MRA report, a credit report from a smaller bureau) gets completely wrong tradeline data. The dispute letter references accounts that don't exist or gets the wrong creditor name. The dispute fails or goes to the wrong party.

**Recommended fix:** Add schema validation after parsing: required fields must be non-empty, dates must be valid, status must be in the enum. Throw or flag if the report doesn't conform. Add parser confidence scores and surface them to the consumer. Log all parsing failures for review.

---

### MEDIUM-2: Parser does not detect or surface security freezes, fraud alerts, or active CFPB flags

**Severity:** MEDIUM
**File:** credit-hero-parser.ts
**Description:** The `FileContext` type has `securityFreezeFlag`, `fraudAlertFlag`, `identityTheftFlag`. The parser has zero logic to detect these from the PDF. If a consumer has a security freeze, the dispute letter will be generated as if no freeze exists. The bureau will reject the paper letter because the consumer's file is frozen and only electronic dispute channels may be available.

**Attack surface:** A consumer with a security freeze uploads their report, gets a paper dispute letter generated, sends it to the bureau, and it is rejected or lost because the file is frozen. The consumer loses the dispute opportunity.

**Recommended fix:** Add freeze and fraud alert detection in the parser (look for "security freeze", "fraud alert", "initial fraud alert", "active duty alert" in the report text). Surface these as explicit flags in `ParsedCreditReport`. If a freeze is detected, require the consumer to lift it before generating a paper dispute or generate an electronic-only dispute path.

---

### MEDIUM-3: No mechanism to handle "unknown bureau" or non-standard bureau names

**Severity:** MEDIUM
**File:** credit-hero-parser.ts
**Description:** The parser uses `BUREAU_NAMES` map with hard-coded strings ("EQUIFAX", "Experian", "TransUnion"). If the credit report uses a different bureau name or a non-standard spelling, the parser defaults to `EQUIFAX` for everything, assign all tradelines to the wrong bureau, and generate dispute letters to the wrong bureau.

**Attack surface:** A consumer with a specialized or regional credit report (e.g., a consumer reports from an employer background check system, or a non-standard format) will have all tradelines assigned to the wrong bureau. Dispute letters go to Experian for items that should go to Equifax.

**Recommended fix:** Add explicit unknown-bureau handling: if the bureau cannot be determined, flag the report as unparseable and surface an error to the consumer rather than silently defaulting to EQUIFAX. Never silently assign a bureau.

---

### MEDIUM-4: No dedup of tradelines across bureaus — duplicate items inflate dispute count

**Severity:** MEDIUM
**File:** credit-hero-parser.ts, dispute-engine.ts
**Description:** The parser produces tradelines per bureau. The dispute engine evaluates each tradeline independently. If the same account appears on all three bureaus with the same account number, three separate dispute letters are generated (one per bureau) — which is correct. But if the parser incorrectly assigns the same account to multiple bureaus or if the consumer uploads a merged report, duplicate tradelines will produce duplicate letters for the same dispute, which can be treated as duplicate disputes and rejected.

**Attack surface:** A consumer uploads a report that merges data from multiple pulls, resulting in duplicate tradelines. Three letters go out for the same item. The bureaus treat it as duplicate frivolous filings.

**Recommended fix:** Add deduplication in the dispute engine: after parsing, dedupe tradelines by (creditor + accountNumber + bureau). If a deduplicated item is flagged for dispute, generate one letter per bureau (not one per item instance).

---

### MEDIUM-5: `contradictionMetrics` in `TradelineCase` is optional and never populated by any parser

**Severity:** MEDIUM
**File:** dispute-engine.ts, credit-hero-parser.ts
**Description:** `contradictionMetrics` (crossBureauConflicts, reportVsDocumentConflicts, furnisherVsBureauConflicts, etc.) are defined as optional fields in `TradelineCase`. The credit-hero-parser has zero code that computes or populates these fields. The contradiction detection logic in `scoreConclusiveVerificationResistance()` relies on these metrics. Since they are never set, `contradictionMaturity` will always be low (based only on evidence score), and the contradiction round threshold will almost never fire correctly.

**Attack surface:** A consumer with a genuine cross-bureau contradiction (one bureau deleted, another verified) uploads their report. The parser doesn't compute the contradiction. The engine evaluates the tradeline without contradiction metrics. The contradiction round threshold never fires. A generic bureau letter is sent instead of a contradiction letter. The consumer loses the contradiction-based escalation path.

**Recommended fix:** Add contradiction detection in the parser or as a post-parse step: cross-reference tradelines across bureaus using (creditor + accountNumber pattern) to detect cross-bureau conflicts. Compute and populate `contradictionMetrics` before the dispute engine runs.

---

### MEDIUM-6: `scores` field in `TradelineCase` is populated but not validated — missing fields default to undefined

**Severity:** MEDIUM
**File:** credit-hero-parser.ts, dispute-engine.ts
**Description:** `TradelineScores` includes `evidenceScore`, `removabilityScore`, `deltaScore`, `resistanceScore`, `damagesScore`, `arbitrationScore`, `fundingPriorityScore`. The parser doesn't compute any of these (it only parses raw data). The engine uses `tradeline.scores.resistanceScore` and `tradeline.scores.fundingPriorityScore` for sorting and gating decisions. If `scores` is an empty object, `scores.fundingPriorityScore` is `undefined`, which sorts to `NaN` — unpredictable ordering.

**Attack surface:** A consumer with a perfectly valid credit report gets undefined scores. The sorting of `recommendedPacketOrder` becomes non-deterministic. Items with valid data may sort below items with undefined data. The highest-priority dispute may not be processed first.

**Recommended fix:** Validate that `scores` fields are non-null before use. If missing, assign a default value (0 for all scores). Throw if the parser failed to compute scores.

---

## Specific Test Cases That Could Break the System

### Test Case 1: Upload a credit report with no identifiable bureau name
**Input:** PDF with bureau names in a non-standard format (e.g., "EQF" or "XP"})
**Expected behavior:** Parser should reject with unknown-bureau error
**Actual behavior:** Silent default to EQUIFAX. All letters go to wrong bureau.

### Test Case 2: Tradeline with account status GOOD but no actual inaccuracy
**Input:** A consumer who has a legitimately reported GOOD account and disputes it
**Expected behavior:** Hard stop fires. No letter generated. Consumer told item is accurate.
**Actual behavior:** `knownAccurate` is not set. Hard stop doesn't fire. Generic letter generated. Bureau re-verifies. Item stays or gets re-verified as accurate.

### Test Case 3: Identity theft package with only a police report (not FTC-approved format)
**Input:** `identityTheftPackage` = { proofOfIdentity: true, identityTheftReport: true (police report), informationIdentifiedToBeBlocked: true, consumerStatementNoRelationToTransaction: true }
**Expected behavior:** Block eligibility = false. Hard stop fires. No letter generated.
**Actual behavior:** `isIdentityTheftBlockEligible()` returns true (police report satisfies "identityTheftReport: true"). Letter generated that doesn't satisfy § 605B. Item not blocked.

### Test Case 4: Cross-bureau contradiction — Equifax deleted, TransUnion verified
**Input:** Report showing the same account deleted on Equifax, verified on TransUnion
**Expected behavior:** `crossBureauConflicts = 1`. Contradiction round fires. Contradiction letter generated citing the conflict.
**Actual behavior:** `contradictionMetrics` never populated. `contradictionMaturity = 0`. Generic bureau letter sent. Contradiction not disclosed.

### Test Case 5: Direct furnisher lane with sufficiency check not passed
**Input:** Tradeline with `targetType: "furnisher"` and `directFurnisherSufficiencyPassed: false`
**Expected behavior:** Hard stop fires. No letter generated. Item held for address verification.
**Actual behavior:** Hard stop recorded. Code falls through to default return. `bureau_round_1` + `bureau_round` set. Letter generated to the wrong party (bureau instead of furnisher).

### Test Case 6: Parser outputs empty creditor name
**Input:** PDF with a creditor name that doesn't parse (e.g., a special character in the name, merged cells)
**Expected behavior:** Validation catches empty creditor. Error surfaced to consumer.
**Actual behavior:** `creditor = ""`. Letter generated with empty creditor field. Bureau may reject as incomplete.

### Test Case 7: Consumer uploads report with a security freeze active
**Input:** Report showing "Security Freeze" flag
**Expected behavior:** Parser detects freeze. Electronic-only dispute path used.
**Actual behavior:** Freeze not detected. Paper letter generated. Bureau rejects because file is frozen.

### Test Case 8: Dispute letter sent for an account that was already verified multiple times
**Input:** Report showing account verified 3 times in a row by bureau
**Expected behavior:** `knownAccurate` inferred from prior verification history. Hard stop fires.
**Actual behavior:** No inference logic. `knownAccurate` not set. Frivolous letter generated. Consumer now has a verified item that was previously clean.

### Test Case 9: Multiple identical tradelines across bureaus due to report merging
**Input:** Report with duplicate tradelines for same account same bureau (parsing artifact)
**Expected behavior:** Deduplication. One letter per bureau.
**Actual behavior:** Three identical letters sent. Bureau flags as duplicate frivolous.

### Test Case 10: Very long creditor name (>100 characters) in PDF
**Input:** Corporate merger name that is 150 characters long
**Expected behavior:** Truncation to reasonable length in letter.
**Actual behavior:** Letter template may overflow or produce malformed output.

---

## Summary Table

| ID | Severity | Category | Issue |
|---|---|---|---|
| CRITICAL-1 | CRITICAL | Legal sufficiency | Generic letter fails FCRA § 611 specificity requirement |
| CRITICAL-2 | CRITICAL | Bureau compliance | No furnisher letter — direct lane is dead code |
| CRITICAL-3 | CRITICAL | Identity theft | § 605B block incomplete, hard stop doesn't act |
| CRITICAL-4 | CRITICAL | Contradiction round | Detection exists, letter type doesn't |
| HIGH-1 | HIGH | Bureau compliance | Bureau addresses unverified, may be stale |
| HIGH-2 | HIGH | Legal sufficiency | No eCRS XML support — paper-only submissions |
| HIGH-3 | HIGH | Consumer harm | `knownAccurate` never inferred — frivolous disputes |
| HIGH-4 | HIGH | Consumer harm | Soft stops don't gate letter generation |
| MEDIUM-1 | MEDIUM | Data handling | Parser silent corruption on non-standard formats |
| MEDIUM-2 | MEDIUM | Data handling | Security freeze/fraud alert not detected |
| MEDIUM-3 | MEDIUM | Data handling | Unknown bureau silently defaults to EQUIFAX |
| MEDIUM-4 | MEDIUM | Data handling | No dedup of duplicate tradelines |
| MEDIUM-5 | MEDIUM | Contradiction round | `contradictionMetrics` never populated |
| MEDIUM-6 | MEDIUM | Data handling | `scores` defaults to undefined — non-deterministic sorting |