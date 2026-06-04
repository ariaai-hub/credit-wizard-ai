# Credit Repair Bot — Sprint Plan
## Dispute Engine & Letter Generator: Path to Production

---

## Current State

### dispute-engine.ts — Structural Assessment

**What works:**
- Comprehensive type system covering hard stops, soft stops, delta types, response defects, response classes, stages, special lanes, and escalation options
- `evaluateTradeline` correctly gates all 8 hard-stop conditions and routes based on response defects
- `evaluateDisputeCase` properly sorts tradelines by composite scoring (funding priority → removability → resistance → evidence → delta)
- `buildClaimReadinessMatrix` produces a solid 10-dimension readiness matrix with arbitration and litigation referral sub-checks
- `applyDeterministicProductionRules` correctly suppresses state-law output and arbitration language when prerequisites are absent
- Deterministic fallback logic (5 rules) and conflict resolution rules (4 rules) are sensible
- Lane-locking rules for statutory-block and direct-furnisher are correct

**What is broken or missing:**

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | State law library (`StateLawLibraryRecord[]`) is defined but **never populated** — zero records exist at runtime | 🔴 Critical | Every `stateLawRecord` param resolves to `null`, so `scoreStateOverlaySupport()` always returns `0`. All state-overlay logic is dead code. |
| 2 | `contradictionMetrics` on `TradelineCase` is typed but **never computed from raw data** — there is no function that takes bureau report data and populates contradiction metrics | 🔴 Critical | `scoreConclusiveVerificationResistance()` depends entirely on `tradeline.contradictionMetrics`, which will always be `{}` unless manually seeded. The main scoring driver for contradiction-round routing is non-functional. |
| 3 | Bureau/Furnisher playbooks (`BureauPlaybook`, `FurnisherPlaybook`) are defined as types but **never instantiated or looked up** at runtime | 🔴 Critical | No `playbookRegistry` exists. `applyDeterministicProductionRules` has no mechanism to fetch bureau-specific or furnisher-specific rules. The "moat layer" is entirely unimplemented. |
| 4 | `PacketOptimizationProfile` is defined but there is **no function to select or apply** an optimization profile given bureau/furnisher/state/trade-line-type context | 🟡 High | Optimization layer exists on paper; no entry point to use it. |
| 5 | `consumer.currentAddress`, `consumer.dob`, `consumer.currentState` are all set to **"Address pending structured intake" / "DOB pending structured intake" / "Unknown"** in `dispute-runtime.ts` — the state field needed for state-law library lookup is absent | 🔴 Critical | State-law library cannot function because `caseFile.consumer.currentState` is always `"Unknown"`. |
| 6 | No **contradiction detection algorithm** — there is no function that takes raw bureau report data (or data from multiple bureaus) and produces `ContradictionMetrics` | 🔴 Critical | The system can route to contradiction_round but cannot itself detect contradictions. This must be external or must be built. |

---

### letter-generator.ts — Structural Assessment

**What works:**
- Correct bureau postal addresses used (Equifax/Experian/TransUnion P.O. boxes verified)
- Single-function approach (`generateDisputeLetter`) is simple and maintainable
- Properly formats date, account reference, consumer identity block

**What is broken or missing:**

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 7 | **Only one letter type exists** — the basic FCRA § 611 bureau dispute letter | 🔴 Critical | There is no identity theft statutory block letter, no direct furnisher letter, no contradiction letter, no escalation/complaint letter, no pre-claim notice, no arbitration packet cover letter, no litigation referral letter. |
| 8 | The letter is **legally thin** — it cites "FCRA § 611" generically but does not: (a) cite the specific reinvestigation deadline (30 days), (b) cite 15 U.S.C. § 1681i(a)(1), (c) include the specific deletion standard if verification fails, (d) include a verification of dispute notice to the furnisher, (e) include an exhibit list | 🟡 High | A credit repair professional would immediately notice the letter lacks specificity. |
| 9 | **No identity theft / statutory block letter** — FCRA § 605B requires a specific letter format and may require attachments (ID theft report, identity theft affidavit, consumer statement) | 🔴 Critical | When `specialLane === "identity_theft"` or `"statutory_block"`, the system cannot generate the correct letter. |
| 10 | **No direct furnisher dispute letter** — FCRA § 1681i(a)(2) requires sending disputes directly to the furnisher when the consumer disputes with the bureau; the current letter only addresses the bureau | 🟡 High | The system routes to `furnisher_round_1` but has no letter for it. |
| 11 | **No contradiction letter** — a letter used when cross-bureau conflicts or bureau-vs-document conflicts are the primary dispute theory is entirely absent | 🟡 High | The contradiction round exists in the engine but has no letter template. |
| 12 | **No exhibit injection** — the letter references "supporting documentation" but has no mechanism to attach or list specific exhibits (ID theft report, police report, payment receipts, etc.) | 🟡 High | Exhibit list is a standard professional expectation. |
| 13 | **No consumer signature block** — the letter ends with name only; a proper dispute letter needs a signature line, declaration under penalty of perjury language (standard in credit disputes), and a method to verify identity | 🟡 High | Professional standard expectation; some bureaus expect it. |
| 14 | Letter output is plain text rendered as HTML (`<pre>` tag) — **not a real PDF**, just a printable HTML document served with `Content-Type: application/pdf` | 🟡 Medium | This technically misrepresents the content type. The browser may reject or warn. |
| 15 | **No state-law overlay in letters** — even if the state law library were populated, the letter generator has no mechanism to inject state-specific statutory language or remedies | 🟡 Medium | State-specific language (e.g., California Civil Code § 1785.16) would strengthen letters considerably. |

---

## Critical Gaps Summary

| Priority | Gap ID | Area | Description |
|----------|--------|------|-------------|
| P0 | G-1 | Engine | State law library is empty — state overlay is always 0 |
| P0 | G-2 | Engine | contradictionMetrics never computed — contradiction routing non-functional |
| P0 | G-6 | Engine | No contradiction detection algorithm exists |
| P0 | G-5 | Engine | consumer.currentState always "Unknown" — state-law lookup blocked |
| P0 | G-7 | Letters | Only one letter type exists — most dispute paths have no letter |
| P0 | G-9 | Letters | No identity theft / statutory block letter |
| P1 | G-3 | Engine | Bureau/Furnisher playbooks never instantiated |
| P1 | G-10 | Letters | No direct furnisher letter |
| P1 | G-11 | Letters | No contradiction letter |
| P1 | G-8 | Letters | Letter is legally thin — lacks specific statutory citations and exhibit list |
| P2 | G-4 | Engine | Packet optimization profile selection not implemented |
| P2 | G-12 | Letters | No exhibit injection |
| P2 | G-13 | Letters | No consumer signature block / perjury declaration |
| P2 | G-15 | Letters | No state-law overlay injection in letters |
| P3 | G-14 | Letters | HTML mislabeled as PDF |

---

## Dependency Map — What Blocks What

```
P0 UNBLOCKING (letters can't go out without these)

[Data Ingestion Layer]
  → If no structured tradeline data exists in DB → engine can't score anything
  → If consumer state not captured → state law library can't work

[G-5] consumer.currentState populated
  └── blocks → [G-1] state law library lookups (useless without consumer state)

[G-1] state law library needs data + consumer state
  └── blocks → [G-15] state-law overlay in letters

[G-6] contradiction detection algorithm
  └── blocks → [G-2] contradictionMetrics population (metrics come from detection)
  └── blocks → [G-11] contradiction letter content

[G-2] contradictionMetrics populated
  └── enables → contradiction-round routing (scoreConclusiveVerificationResistance works)
  └── enables → contradiction letter (content from metrics)

[G-3] Bureau/Furnisher playbook registry
  └── not blocking core routing, but needed for production-quality routing

[G-7] letter-generator — multiple letter types
  └── blocked by nothing technically, but needs to know which lane triggered
  └── blocked by nothing, but needs context from engine (specialLane, responseDefects, etc.)

[G-9] identity theft statutory block letter
  └── blocked by nothing, can be built independently
  └── needed for statutory_block and identity_theft lanes

[G-10] direct furnisher letter
  └── blocked by nothing, can be built independently
  └── needed for furnisher_round_1

[G-11] contradiction letter
  └── blocked by [G-6] and [G-2]
```

---

## Recommended Order of Work

### Phase 0 — Unblock the Engine (Days 1–3)

**Goal:** Make the dispute engine produce real output instead of all-zeros.

1. **Fix consumer state capture** (`dispute-runtime.ts`)
   - `consumer.currentState` must come from real client data (`client.state` or `client.addressState`)
   - Trivial fix but unlocks everything downstream

2. **Build contradiction detection** (new module: `src/lib/contradiction-detector.ts`)
   - Input: raw bureau report data (or multiple bureau reports)
   - Output: `ContradictionMetrics` object
   - Logic: compare account balances, payment histories, status, ownership across bureaus
   - Cross-bureau conflict = same account reported differently
   - Report-vs-document conflict = bureau data contradicts attached exhibit
   - This is the hardest algorithmic piece — build a deterministic rule set first

3. **Populate contradictionMetrics** in `dispute-runtime.ts` after parsing
   - Call contradiction detector when tradelines are created/updated

### Phase 1 — Letter Generator Baseline (Days 3–7)

**Goal:** Replace the single placeholder letter with all required letter types.

1. **Identity theft / statutory block letter** (FCRA § 605B)
   - Must reference identity theft report, block request, consumer statement
   - Must NOT be sent through the same channel as regular disputes

2. **Direct furnisher letter** (FCRA § 1681i(a)(2))
   - Uses furnisher designated address (not bureau address)
   - Separate from bureau letter
   - Must reference the account specifically

3. **Contradiction letter**
   - Pulls contradiction metrics into the letter body
   - Lists specific conflicts (e.g., "Equifax reports $1,200 balance; Experian reports $0")
   - References cross-bureau conflict evidence

4. **Escalation letters** (CFPB complaint, state AG complaint, pre-claim notice)
   - These can use a shared template with different subject/address blocks
   - CFPB: CFPB headquarters address
   - State AG: state-specific AG office address

5. **Fix letter legal content**
   - Replace generic "FCRA § 611" with specific subsection citations
   - Add 30-day reinvestigation deadline citation (15 U.S.C. § 1681i(a)(1))
   - Add deletion standard if unverifiable (15 U.S.C. § 1681i(a)(5)(B))
   - Add exhibit list section
   - Add signature block with declaration under penalty of perjury

6. **Fix PDF rendering**
   - Generate actual PDF using a library (e.g., `pdfkit`, `@react-pdf/renderer`) or use a proper HTML-to-PDF approach

### Phase 2 — State Law Library (Days 7–12)

**Goal:** Enable state-specific statutory language in letters.

1. **Build state law library data** (`src/data/state-law-library.ts`)
   - At minimum: California, Texas, Florida, New York (highest volume states)
   - Each record: statute citation, applicable party, elements, remedies, trigger conditions
   - Focus on FCRA-state-overlay laws (some states provide additional rights beyond FCRA)

2. **Build state-law lookup function** in `dispute-engine.ts`
   - Input: consumer state + dispute type + applicable party
   - Output: `StateLawLibraryRecord | null`

3. **Inject state-law overlay into letters**
   - After all letter types exist, add state-specific paragraph blocks

### Phase 3 — Playbook & Optimization (Days 12–18)

**Goal:** Production-quality routing and output.

1. **Build bureau playbook registry** (`src/data/bureau-playbooks.ts`)
   - Key data per bureau: response time patterns, most effective contradiction types, page length tolerance, frivolous sensitivity
   - Start with publicly known bureau behavior patterns

2. **Build furnisher playbook registry** (`src/data/furnisher-playbooks.ts`)
   - Key data per major furnisher: responsiveness, common weak response patterns, best exhibits by account type

3. **Build packet optimization profile selector**
   - Given bureau + furnisher + state + tradeline type → select PacketOptimizationProfile
   - Drive letter length, exhibit ordering, section ordering

### Phase 4 — Hardening (Days 18–22)

1. **Unit tests for dispute-engine** — test each hard stop, soft stop, stage transition, suppression flag
2. **Unit tests for letter-generator** — test each letter type renders correct content
3. **Integration test** — full flow: intake → engine scoring → letter generation
4. **Audit logging review** — ensure every engine run and letter generation is tracked

---

## What Blocks What (detailed)

```
[Consumer state capture] ──unblocks──► [State law library lookup]
                                        │
[Contradiction detector] ──unblocks──► [contradictionMetrics population]
          │                              │
          │                   [Contradiction-round routing works]
          │                              │
          │                   [Contradiction letter content available]
          │                              │
          └──unblocks──► [G-11 contradiction letter]

[State law library populated] ──unblocks──► [State-law overlay in all letters]

[Bureau/Furnisher playbooks] ──unblocks──► [Production-quality routing decisions]

[All letter types built] ──unblocks──► [Full dispute lifecycle coverage]

Letter types needed per lane:
  bureau_round_1        → basic bureau dispute letter (exists, needs fixing)
  furnisher_round_1     → direct furnisher letter (missing)
  contradiction_round    → contradiction letter (missing)
  complaint_escalation   → CFPB / state AG letter (missing)
  pre_claim             → pre-claim notice letter (missing)
  arbitration_ready     → arbitration packet cover letter (missing)
  litigation_referral    → litigation referral letter (missing)
  statutory_block       → identity theft statutory block letter (missing)
  identity_theft        → identity theft letter (missing)
```

---

## Severity Ratings Summary

| ID | Gap | Severity | Fix Effort |
|----|-----|----------|-----------|
| G-5 | consumer.currentState always "Unknown" | P0 🔴 | < 1 hr |
| G-6 | No contradiction detection algorithm | P0 🔴 | 2–3 days |
| G-2 | contradictionMetrics never computed | P0 🔴 | 1 day |
| G-1 | State law library empty | P0 🔴 | 2–3 days (seed data) |
| G-7 | Only one letter type exists | P0 🔴 | 3–5 days |
| G-9 | No identity theft statutory block letter | P0 🔴 | 1–2 days |
| G-3 | Playbooks never instantiated | P1 🟡 | 2–3 days |
| G-10 | No direct furnisher letter | P1 🟡 | 1–2 days |
| G-11 | No contradiction letter | P1 🟡 | 1 day (after G-6) |
| G-8 | Letter legally thin | P1 🟡 | 1 day |
| G-4 | Packet optimization not implemented | P2 🟠 | 2 days |
| G-12 | No exhibit injection | P2 🟠 | 1 day |
| G-13 | No consumer signature block | P2 🟠 | < 1 day |
| G-15 | No state-law overlay in letters | P2 🟠 | 1 day (after G-1) |
| G-14 | HTML mislabeled as PDF | P3 🔵 | 2–4 hrs |

---

## Sprint Summary

**Phase 0 (Days 1–3):** Unblock the engine — fix consumer state, build contradiction detector, populate contradictionMetrics.

**Phase 1 (Days 3–7):** Letter generator overhaul — build all 9 required letter types, fix legal content, fix PDF rendering.

**Phase 2 (Days 7–12):** State law library — seed data for high-volume states, lookup function, letter injection.

**Phase 3 (Days 12–18):** Playbook registry and packet optimization — bureau/furnisher data + profile selection.

**Phase 4 (Days 18–22):** Hardening — tests, integration, audit logging.