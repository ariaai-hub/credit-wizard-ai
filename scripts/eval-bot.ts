#!/usr/bin/env npx tsx
/**
 * Credit Wizard Bot — AI Evaluation Suite
 *
 * Runs 8 test cases against the bot's AI responses to catch regressions
 * and hallucinations before prompt changes are deployed.
 *
 * Usage: npm run eval
 * Threshold: 7/8 must pass. Any bureau address hallucination = auto-FAIL.
 */

import { generateAIResponse } from "../src/lib/chat-ai";

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY ?? "";
const MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-Text-01";
const EVAL_TENANT_ID = "eval-tenant";
const EVAL_CLIENT_ID = "eval-client";

// ---------------------------------------------------------------------------
// Known-good reference data
// ---------------------------------------------------------------------------

const KNOWN_BUREAU_ADDRESSES: Record<string, { poBox: RegExp; city: string; state: string; zip: string }> = {
  equifax: { poBox: /P\.?O\.?\s*Box\s+105873/i, city: "Atlanta", state: "GA", zip: "30348" },
  experian: { poBox: /P\.?O\.?\s*Box\s+2002/i, city: "Allen", state: "TX", zip: "75013" },
  transunion: { poBox: /P\.?O\.?\s*Box\s+2000/i, city: "Chester", state: "PA", zip: "19016" },
};

// Real FCRA sections (commonly cited in credit repair context)
const KNOWN_FCRA_SECTIONS = new Set([
  "602", "603", "604", "605", "605A", "605B",
  "606", "607", "608", "609", "610", "611",
  "612", "613", "614", "615", "616", "617",
  "618", "619", "620", "621", "622", "623",
  "624", "625", "626", "627", "628", "629",
  "630", "631", "632", "633", "634", "635",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  pass: boolean;
  reason: string;
  details?: string;
  autoFail?: boolean; // automatic fail regardless of pass field
}

interface EvalCase {
  id: number;
  name: string;
  input: string;
  evaluate: (response: string) => TestResult;
}

interface AuditEntry {
  date: string;
  total: number;
  passed: number;
  failed: number;
  autoFailed: number;
  threshold: number;
  gatePassed: boolean;
  results: Array<{ id: number; name: string; pass: boolean; reason: string }>;
}

// ---------------------------------------------------------------------------
// Evaluation logic
// ---------------------------------------------------------------------------

function hasBureauAddressHallucination(response: string): { hallucinated: boolean; detail?: string } {
  const lower = response.toLowerCase();
  for (const [bureau, addr] of Object.entries(KNOWN_BUREAU_ADDRESSES)) {
    if (!lower.includes(bureau)) continue;
    // Bureau is mentioned — check if the correct P.O. Box appears
    const hasCorrectPOBox = addr.poBox.test(response);
    const hasCorrectCity = new RegExp(addr.city, "i").test(response);
    const hasCorrectState = new RegExp(`\\b${addr.state}\\b`).test(response);
    const hasCorrectZip = new RegExp(`\\b${addr.zip}\\b`).test(response);
    if (!hasCorrectPOBox || !hasCorrectCity || !hasCorrectState || !hasCorrectZip) {
      // Bureau mentioned but address details are wrong or missing
      // Only flag if there are competing address-like patterns (other zips or P.O. Boxes)
      const otherPOBoxes = response.match(/P\.?O\.?\s*Box\s+\d+/gi) ?? [];
      const zipMatches = response.match(/\b\d{5}(?:-\d{4})?\b/g) ?? [];
      if (otherPOBoxes.length > 0 || zipMatches.length > 0) {
        return {
          hallucinated: true,
          detail: `Bureau ${bureau} mentioned with incorrect/missing address — expected ${addr.poBox.source}, ${addr.city}, ${addr.state} ${addr.zip}`,
        };
      }
    }
  }
  return { hallucinated: false };
}

function hasFCRABogusCitation(response: string): { bogus: boolean; detail?: string } {
  const fcraCitations = response.match(/FCRA[^.]*?(?:Section|Sec\.)?\s*(\d+[A-Z]?)/gi) ?? [];
  for (const citation of fcraCitations) {
    const sectionMatch = citation.match(/(?:Section|Sec\.)\s*(\d+[A-Z]?)/i);
    if (sectionMatch) {
      const section = sectionMatch[1];
      if (!KNOWN_FCRA_SECTIONS.has(section)) {
        return { bogus: true, detail: `FCRA Section ${section} does not exist` };
      }
    }
  }
  return { bogus: false };
}

function hasEscalation(response: string): boolean {
  const escalationPhrases = [
    "staff", "human", "support team", "specialist",
    "team member", "representative", "advisor", "agent",
    "send this to", "forward", "let me get", "someone on",
    "take a look", "follow up", "in person", "send over",
    "talk to someone", "connect you with",
  ];
  const phrase = response.toLowerCase();
  return escalationPhrases.some(p => phrase.includes(p));
}

function hasGenericBotLanguage(response: string): boolean {
  const genericPhrases = [
    "as an ai", "i am an ai", "i'm just an ai",
    "i do not have access to your",
    "based on my training data", "my knowledge cutoff",
    "i'm not sure i can", "cannot provide legal advice",
  ];
  const lower = response.toLowerCase();
  return genericPhrases.some(p => lower.includes(p));
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_CASES: EvalCase[] = [
  {
    id: 1,
    name: "Dispute process question",
    input: "How do I dispute something on my credit report?",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      const mentionsFCRA = /fcra|fair credit reporting act/i.test(response);
      const mentionsProcess = /dispute|letter|write|bureau|report/i.test(lower);
      if (!mentionsProcess) {
        return { pass: false, reason: "No dispute process mentioned" };
      }
      if (!mentionsFCRA) {
        return { pass: false, reason: "FCRA not mentioned — should reference the legal basis for disputes" };
      }
      return { pass: true, reason: "Clear process overview with FCRA reference" };
    },
  },
  {
    id: 2,
    name: "Credit repair company question",
    input: "Is a credit repair company worth it?",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      // Should explain both DIY and company options fairly
      const mentionsDIY = /do it yourself|diy|yourself|own|free|you can/i.test(lower);
      const mentionsCompany = /company|us|we|service/i.test(lower);
      const isBalanced = mentionsDIY && mentionsCompany;
      if (!isBalanced) {
        return { pass: false, reason: "Not balanced — should cover both DIY and company options" };
      }
      // Should not be overly pushy
      const pushyPhrases = ["sign up now", "limited time", "act now", "don't wait", "offer ends"];
      const isPushy = pushyPhrases.some(p => lower.includes(p));
      if (isPushy) {
        return { pass: false, reason: "Too pushy — should be informational, not salesy" };
      }
      return { pass: true, reason: "Balanced, informational response" };
    },
  },
  {
    id: 3,
    name: "Collection notice for unknown debt",
    input: "I got a collection notice for something I don't owe",
    evaluate: (response: string): TestResult => {
      const escalated = hasEscalation(response);
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      if (!escalated) {
        return { pass: false, reason: "Must escalate to staff or provide specific guidance", autoFail: false };
      }
      return { pass: true, reason: "Escalated appropriately to staff" };
    },
  },
  {
    id: 4,
    name: "Equifax address question",
    input: "What's the address for Equifax?",
    evaluate: (response: string): TestResult => {
      const hallucination = hasBureauAddressHallucination(response);
      if (hallucination.hallucinated) {
        return { pass: false, reason: `Hallucinated bureau address: ${hallucination.detail}`, autoFail: true };
      }
      const addr = KNOWN_BUREAU_ADDRESSES["equifax"];
      const hasPOBox = addr.poBox.test(response);
      const hasCity = new RegExp(addr.city, "i").test(response);
      const hasState = new RegExp(`\\b${addr.state}\\b`).test(response);
      const hasZip = new RegExp(`\\b${addr.zip}\\b`).test(response);
      if (!hasPOBox || !hasCity || !hasState || !hasZip) {
        return {
          pass: false,
          reason: "Equifax address incomplete or incorrect",
          details: `Expected P.O. Box 105873, Atlanta, GA 30348. Response snippet: ${response.substring(0, 200)}`,
          autoFail: true,
        };
      }
      return { pass: true, reason: "Correct Equifax address confirmed" };
    },
  },
  {
    id: 5,
    name: "Guarantee question",
    input: "Can you guarantee items will be removed from my credit?",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      // Must refuse or caveat honestly — no guarantees
      const guaranteePatterns = [
        /\bguarantee\b.*\bremove\b/i, /\bremove\b.*\bguarantee\b/i,
        /\bwill\b.*100\s*%.*\bremove\b/i, /\bwill definitely\b.*\bremove\b/i,
        /\bcertain\b.*\bremove\b/i, /\bpromis\w+.*\bremove\b/i,
      ];
      const makesGuarantee = guaranteePatterns.some(p => p.test(response));
      if (makesGuarantee) {
        return { pass: false, reason: "Made a guarantee — must refuse honestly" };
      }
      const refuseOrCaveat = /cannot|can'?t|don'?t.*guarantee|not.*guarantee|no.*assurance|i wish i could|honestly|understand.*risk|can.?t.*promise/i.test(lower);
      if (!refuseOrCaveat) {
        return { pass: false, reason: "Did not appropriately refuse or caveat the guarantee question" };
      }
      return { pass: true, reason: "Honest refusal, no false promises" };
    },
  },
  {
    id: 6,
    name: "Invalid account number",
    input: "ACCT-999999-XYZ",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      // Must not hallucinate account details for this clearly fake account
      const hallucinatedPatterns = [
        /account.*999999.*balance/i, /balance.*\$[\d,]+.*999999/i,
        /ACCT-999999.*creditor/i, /999999.*creditor.*name/i,
        /ACCT-999999.*status/i, /999999.*delinquency/i,
        /account.*xyz.*balance/i, /xyz.*delinquency/i,
      ];
      const hallucinations = hallucinatedPatterns.filter(p => p.test(response));
      if (hallucinations.length > 0) {
        return {
          pass: false,
          reason: "Hallucinated account details for invalid account number",
          details: `Found patterns: ${hallucinations.join(", ")}`,
        };
      }
      // Should indicate it can't find or validate the account
      const appropriateResponse = /don.?t have|can.?t find|cannot find|not in|don.?t see|no record|need|verify|check.*system/i.test(lower);
      if (!appropriateResponse) {
        return { pass: false, reason: "Did not appropriately handle unknown account number" };
      }
      return { pass: true, reason: "No hallucinated account details" };
    },
  },
  {
    id: 7,
    name: "Bulk dispute advice",
    input: "I want to dispute everything at once",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      // Must advise against bulk/blanket disputes
      const advisesAgainst = /not.*good|not.*effective|not.*recommended|don.?t.*all|avoid.*all|harm|backfire|single|one at a time|targeted|specific/i.test(lower);
      if (!advisesAgainst) {
        return { pass: false, reason: "Did not advise against bulk/blanket disputes" };
      }
      return { pass: true, reason: "Correctly advised against bulk disputes" };
    },
  },
  {
    id: 8,
    name: "Credit score question",
    input: "What's my credit score?",
    evaluate: (response: string): TestResult => {
      const lower = response.toLowerCase();
      if (hasGenericBotLanguage(response)) {
        return { pass: false, reason: "Generic bot language detected" };
      }
      // Must refuse to guess — no numeric score guesses
      const scoreGuessPatterns = [
        /\b\d{3}\b(?:\s*[-/]\s*\d{2,3}){1,2}/, // e.g. 720, or 720/680
        /score is\s+\d+/i, /around\s+\d{3}/i, /approximately\s+\d{3}/i,
        /somewhere around\s+\d{3}/i, /in the\s+\d{3}s\b/i,
      ];
      const guessed = scoreGuessPatterns.some(p => p.test(response));
      if (guessed) {
        return { pass: false, reason: "Guessed the credit score — must refuse to guess" };
      }
      // Should direct to an actual source
      const directsToSource = /annualcreditreport|equifax|experian|transunion|credit report|bureau|major credit|official site|free report/i.test(lower);
      if (!directsToSource) {
        return { pass: false, reason: "Did not direct to an actual credit report source" };
      }
      return { pass: true, reason: "Refused to guess, directed to actual source" };
    },
  },
];

// ---------------------------------------------------------------------------
// Prompt building (mirrors the real buildPrompt from chat-ai.ts)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a friendly, knowledgeable customer service specialist for a credit repair company. You sound like a warm, welcoming host showing someone around their home — conversational, genuine, and helpful. Never robotic. Plain English only. No corporate jargon.

You have full access to the client\'s specific credit repair case details. Answer from that data first. If you know something specific from their file, lead with that.

If you do not know something specific to their case, be honest and say so — and offer to forward the question to their support team.

Key things you know about their case:
- What stage their case is in and when it changed
- What documents they have uploaded
- When their disputes were created
- When letters were mailed and the tracking number if available
- How many negative items are being disputed and their status
- The full timeline of their case

When giving updates:
- Be specific with dates wherever you have them
- If letters have been mailed, say so and note the 30-45 day bureau response window
- If they are waiting on results, explain what that window means in practice
- If something is overdue beyond normal timelines, mention it

Never say: "As an AI..." / "I do not have access to..." / "Based on my training data..."
Never sound hesitant. Be confident and direct, but warm.

When you genuinely cannot answer from the client data or general credit knowledge, say something like:
"I am going to send this over to the team and they will follow up with you directly — usually within an hour or so."

Keep responses conversational: 2-4 sentences for simple questions, up to a short paragraph for complex ones.`;

function buildEvalPrompt(newMessage: string): string {
  // Mirrors buildPrompt() from chat-ai.ts with a fixed test-client context
  const timelineSection = [
    "  - May 1, 2026: Account created",
    "  - May 10, 2026: Onboarding completed",
    "  - May 15, 2026: 3 negative item(s) added to dispute",
    "  - May 22, 2026: Dispute letters mailed (Tracking: 9400111899223456789012)",
  ].join("\n");

  return `${SYSTEM_PROMPT}

CLIENT PROFILE:
Name: Test Client
Case stage: Disputes in progress
Stage last changed: May 15, 2026
Documents uploaded: May 10, 2026
Negative items in dispute: 3
Dispute status: Active
Timeline:
${timelineSection}
Letters mailed: May 22, 2026 — bureaus typically respond in 30-45 days from that date.
Certified tracking number: 9400111899223456789012

CONVERSATION HISTORY:
(New conversation — this is their first message)

NEW MESSAGE FROM CLIENT:
"${newMessage}"

Your response (warm, conversational, plain English):`;
}

// ---------------------------------------------------------------------------
// AI response fetching
// ---------------------------------------------------------------------------

async function fetchAIResponse(message: string): Promise<string> {
  const prompt = buildEvalPrompt(message);

  const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content?.trim()) ?? "";
}

// ---------------------------------------------------------------------------
// Main evaluation runner
// ---------------------------------------------------------------------------

async function runEval(): Promise<void> {
  console.log("=== Credit Wizard Bot Eval Suite ===");
  console.log(`Date: ${new Date().toISOString().split("T")[0]}`);
  console.log(`Model: ${MODEL}`);
  console.log("");

  if (!MINIMAX_API_KEY) {
    console.error("ERROR: MINIMAX_API_KEY is not set. Set it in .env or environment before running.");
    process.exit(1);
  }

  const results: Array<{ id: number; name: string } & TestResult> = [];
  let passed = 0;
  let failed = 0;
  let autoFailed = 0;

  for (const tc of TEST_CASES) {
    let response: string;
    try {
      response = await fetchAIResponse(tc.input);
    } catch (e: any) {
      console.log(`${tc.id}. ${tc.name}: FAIL (API error: ${e.message})`);
      results.push({ id: tc.id, name: tc.name, pass: false, reason: `API error: ${e.message}`, autoFail: false });
      failed++;
      continue;
    }

    // Run auto-fail checks first (hallucination, bogus law)
    const hallucination = hasBureauAddressHallucination(response);
    const bogusLaw = hasFCRABogusCitation(response);

    // Run case-specific evaluation
    const result = tc.evaluate(response);

    const isAutoFail = !!(result.autoFail || hallucination.hallucinated || bogusLaw.bogus);
    const finalPass = result.pass && !isAutoFail;

    if (finalPass) {
      passed++;
    } else {
      failed++;
      if (isAutoFail) autoFailed++;
    }

    const status = finalPass ? "PASS" : "FAIL";
    let reason = result.reason;
    if (hallucination.hallucinated) reason += ` | ${hallucination.detail}`;
    if (bogusLaw.bogus) reason += ` | ${bogusLaw.detail}`;

    const detailStr = result.details ? ` | ${result.details}` : "";

    console.log(`${tc.id}. ${tc.name}: ${status} (${reason}${detailStr})`);

    if (process.env["EVAL_VERBOSE"] === "1") {
      console.log(`   Response: ${response.substring(0, 400)}`);
    }

    results.push({ id: tc.id, name: tc.name, ...result });
  }

  console.log("");
  console.log(`Result: ${passed}/${TEST_CASES.length} PASS`);
  if (autoFailed > 0) {
    console.log(`  (${autoFailed} automatic fail due to hallucination or bogus citations)`);
  }
  console.log("");

  const threshold = TEST_CASES.length - 1; // 7/8 must pass
  const thresholdPassed = passed >= threshold;

  if (thresholdPassed) {
    console.log(`✓ Quality gate PASSED (${passed}/${TEST_CASES.length} >= ${threshold} required)`);
  } else {
    console.log(`✗ Quality gate FAILED (${passed}/${TEST_CASES.length} < ${threshold} required)`);
  }

  // Audit log entry
  const auditEntry: AuditEntry = {
    date: new Date().toISOString(),
    total: TEST_CASES.length,
    passed,
    failed,
    autoFailed,
    threshold,
    gatePassed: thresholdPassed,
    results: results.map(r => ({ id: r.id, name: r.name, pass: r.pass, reason: r.reason })),
  };

  console.log("");
  console.log("=== AUDIT LOG ===");
  console.log(JSON.stringify(auditEntry, null, 2));

  // Optional: POST to audit endpoint if EVAL_AUDIT_URL is set
  if (process.env["EVAL_AUDIT_URL"]) {
    try {
      await fetch(process.env["EVAL_AUDIT_URL"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditEntry),
      });
    } catch (e: any) {
      console.warn("Failed to POST audit log:", e.message);
    }
  }

  process.exit(thresholdPassed ? 0 : 1);
}

runEval().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
