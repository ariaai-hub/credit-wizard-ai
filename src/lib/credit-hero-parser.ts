import type { Buffer } from "buffer";

export type Bureau = "EQUIFAX" | "EXPERIAN" | "TRANSUNION";
export type TradelineCategory = "CREDIT_CARD" | "AUTO_LOAN" | "STUDENT_LOAN" | "OTHER";
export type TradelineStatus = "GOOD" | "CLOSED" | "PAST_DUE" | "COLLECTION";

export interface Address {
  address: string;
  city: string;
  state: string;
  zip: string;
  reportedAt?: string;
}

export interface PersonalInfo {
  names: string[];
  dob: string;
  ssn: string;
  addresses: Address[];
  employments: string[];
}

export interface Score {
  bureau: Bureau;
  score: number;
  rating: string;
}

export interface Tradeline {
  creditor: string;
  accountNumber?: string;
  date: string;
  balance: number | null;
  status: TradelineStatus;
  bureau: Bureau;
  category: TradelineCategory;
}

export interface Inquiry {
  creditor: string;
  date: string;
  bureau: Bureau;
}

export interface Collection {
  creditor: string;
  collector: string;
  date: string;
  balance: number;
  bureau: Bureau;
}

export interface ParsedCreditReport {
  personalInfo: PersonalInfo;
  scores: Score[];
  tradelines: Tradeline[];
  inquiries: Inquiry[];
  collections: Collection[];
}

const CATEGORY_HEADERS: Array<[string, TradelineCategory]> = [
  ["Credit cards", "CREDIT_CARD"],
  ["Auto loans", "AUTO_LOAN"],
  ["Student loans", "STUDENT_LOAN"],
  ["Other", "OTHER"],
  ["Collections", "OTHER"],
  ["Hard inquiries", "OTHER"],
  ["Public Records", "OTHER"],
];

const BUREAU_NAMES: Record<string, Bureau> = {
  EQUIFAX: "EQUIFAX",
  Experian: "EXPERIAN",
  TRANSUNION: "TRANSUNION",
  TransUnion: "TRANSUNION",
};

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function extractBureauSection(lines: string[], startIdx: number): {
  bureau: Bureau;
  endIdx: number;
} {
  const bureauLine = cleanLine(lines[startIdx]);
  let bureau: Bureau = "EQUIFAX";
  for (const [name, b] of Object.entries(BUREAU_NAMES)) {
    if (bureauLine.includes(name)) {
      bureau = b as Bureau;
      break;
    }
  }
  // Consume lines until we hit a known category header or end
  let endIdx = startIdx + 1;
  while (endIdx < lines.length) {
    const l = cleanLine(lines[endIdx]);
    const isCategory = CATEGORY_HEADERS.some(([hdr]) =>
      l.toLowerCase().startsWith(hdr.toLowerCase()),
    );
    const isBureau = Object.keys(BUREAU_NAMES).some((bn) =>
      l.startsWith(bn) && endIdx !== startIdx,
    );
    if (isCategory || isBureau) break;
    endIdx++;
  }
  return { bureau, endIdx };
}

function parseStatus(raw: string): TradelineStatus {
  const l = raw.toLowerCase();
  if (l.includes("good standing") || l.includes("in good standing")) return "GOOD";
  if (l.includes("closed")) return "CLOSED";
  if (l.includes("past due")) return "PAST_DUE";
  if (l.includes("collection")) return "COLLECTION";
  return "GOOD";
}

function parseAmount(raw: string): number | null {
  const m = raw.replace(/[$,]/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function parseTradelineDate(raw: string): string {
  // e.g. "Mar 1, 2026" or "March 1, 2026" or "Mar 1, 2026 – $1,070.00"
  const stripped = raw.replace(/^[\s—\-–]+/, "").trim();
  const dateMatch = stripped.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
  return dateMatch ? dateMatch[1] : stripped.slice(0, 20);
}

function parseTradeline(lines: string[], startIdx: number, bureau: Bureau, category: TradelineCategory): {
  tradeline: Tradeline;
  endIdx: number;
} | null {
  const raw = cleanLine(lines[startIdx]);
  if (!raw || raw.length < 3) return null;

  // Skip pure numeric scores or headers
  if (/^(EQUIFAX|EXPERIAN|TRANSUNION)$/i.test(raw)) return null;
  if (/^\d{3}\s+(POOR|FAIR|GOOD|EXCELLENT)$/i.test(raw)) return null;
  if (/^View Report/i.test(raw)) return null;
  if (/^(My Credit Reports|Total accounts|Open accounts|Closed accounts|Bureau|Score)$/i.test(raw)) return null;
  if (/^(Clean slate|No public records)/i.test(raw)) return null;

  // Typical format: "Mar 1, 2026  Creditor Name  $1,070.00  In good standing"
  // Or: "Mar 27, 2026  JEFFCAPSYS  $1,897.00  Collections"
  // Amount may be absent for closed accounts with $0 balance
  const amountMatch = raw.match(/\$?([\d,]+\.?\d*)/);
  const amount = amountMatch ? parseAmount(amountMatch[1]) : null;

  let creditor = raw;
  let dateStr = "";
  let statusRaw = "";

  // Try to extract date at start: "Mar 1, 2026"
  const datePrefixMatch = raw.match(/^([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+(.+)/);
  if (datePrefixMatch) {
    dateStr = datePrefixMatch[1];
    creditor = datePrefixMatch[2].trim();
  }

  // Try to extract status at end
  const statusMatch = creditor.match(/\b(In good standing|Closed|Past due|Collections?)\s*$/i);
  if (statusMatch) {
    statusRaw = statusMatch[1];
    creditor = creditor.slice(0, statusMatch.index).trim();
  }

  // Remove amount from creditor string
  if (amount !== null) {
    creditor = creditor.replace(/\$[\d,]+\.?\d*/, "").replace(/[\d,]+\.?\d*$/, "").trim();
  }

  if (!creditor || creditor.length < 2) return null;

  // Determine category from creditor name patterns
  let finalCategory = category;
  if (category === "OTHER") {
    const cl = creditor.toLowerCase();
    if (cl.includes("collection") || cl.includes("nv funding") || cl.includes("jeff") || cl.includes("capital")) {
      finalCategory = "OTHER"; // stays OTHER but status can be COLLECTION
    }
  }

  // Parse amount from raw if we haven't found it yet
  let finalAmount = amount;
  if (finalAmount === null) {
    const am = raw.match(/\$?([\d,]+\.?\d*)/);
    if (am) finalAmount = parseAmount(am[1]);
  }

  const status: TradelineStatus = parseStatus(statusRaw);

  return {
    tradeline: {
      creditor,
      date: dateStr,
      balance: finalAmount,
      status,
      bureau,
      category: finalCategory,
    },
    endIdx: startIdx + 1,
  };
}

function parseScoreFromLine(line: string): { bureau: Bureau; score: number; rating: string } | null {
  const clean = cleanLine(line);
  for (const [name, bureau] of Object.entries(BUREAU_NAMES)) {
    if (clean.includes(name)) {
      const scoreMatch = clean.match(/(\d{3})\s+(POOR|FAIR|GOOD|EXCELLENT)/i);
      if (scoreMatch) {
        return { bureau: bureau as Bureau, score: parseInt(scoreMatch[1]), rating: scoreMatch[2].toUpperCase() };
      }
      // Try just 3 digits after bureau name
      const justScore = clean.match(new RegExp(name + "\\s*(\\d{3})"));
      if (justScore) {
        return { bureau: bureau as Bureau, score: parseInt(justScore[1]), rating: "" };
      }
    }
  }
  return null;
}

export async function parseCreditHeroPdf(buffer: Buffer): Promise<ParsedCreditReport> {
  // Dynamic import to avoid SSR issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const text = data.text;

  const lines = text.split("\n").map(cleanLine).filter(Boolean);

  const personalInfo: PersonalInfo = {
    names: [],
    dob: "",
    ssn: "",
    addresses: [],
    employments: [],
  };

  const scores: Score[] = [];
  const tradelines: Tradeline[] = [];
  const inquiries: Inquiry[] = [];
  const collections: Collection[] = [];

  // Parse DOB
  const dobMatch = text.match(/DOB[:\s]*(\d{4}-\d{2}-\d{2})/);
  if (dobMatch) personalInfo.dob = dobMatch[1];

  // Parse SSN
  const ssnMatch = text.match(/SSN[:\s]*.*?(\d{3}-\d{2}-(\d{4}|\*+))/) || text.match(/(\d{3}-\d{2}-\d{4})/);
  if (ssnMatch) personalInfo.ssn = ssnMatch[1];

  // Parse names (Reported names section)
  const namesSection = text.match(/Reported names?[:\s]*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  if (namesSection) {
    const nameLines = namesSection[0].split("\n").map(cleanLine).filter(l => l.length > 2);
    personalInfo.names = nameLines.slice(1).filter(l => !/^(DOB|SSN|Employment|Address|Bureau)/i.test(l));
  }

  // Parse scores — look for bureau + 3-digit score patterns
  let currentBureau: Bureau = "EQUIFAX";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const sc = parseScoreFromLine(l);
    if (sc) {
      scores.push(sc);
      currentBureau = sc.bureau;
    }
  }

  // Parse account sections by category headers
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];

    // Detect bureau
    if (l.includes("EQUIFAX") || l.includes("Experian") || l.includes("TransUnion") || l.includes("TRANSUNION")) {
      for (const [name, bureau] of Object.entries(BUREAU_NAMES)) {
        if (l.includes(name)) {
          currentBureau = bureau as Bureau;
          break;
        }
      }
    }

    // Detect category headers
    let matchedCategory: TradelineCategory | null = null;
    for (const [hdr, cat] of CATEGORY_HEADERS) {
      if (l.toLowerCase().startsWith(hdr.toLowerCase())) {
        matchedCategory = cat;
        break;
      }
    }

    if (matchedCategory) {
      i++;
      // Consume lines under this category as tradelines
      while (i < lines.length) {
        const nextLine = lines[i];
        // Stop at next category or bureau
        const isNextCategory = CATEGORY_HEADERS.some(([hdr]) =>
          nextLine.toLowerCase().startsWith(hdr.toLowerCase()),
        );
        const isBureau = Object.keys(BUREAU_NAMES).some((bn) =>
          nextLine.startsWith(bn) && !nextLine.match(/\d{3}/),
        );
        if (isNextCategory || isBureau) break;

        const result = parseTradeline(lines, i, currentBureau, matchedCategory);
        if (result) {
          const tl = result.tradeline;
          if (tl.status === "COLLECTION") {
            collections.push({
              creditor: tl.creditor,
              collector: tl.creditor,
              date: tl.date,
              balance: tl.balance ?? 0,
              bureau: tl.bureau,
            });
          }
          tradelines.push(tl);
          i = result.endIdx;
        } else {
          i++;
        }
      }
      continue;
    }

    // Detect Hard Inquiries section
    if (l.toLowerCase().includes("hard inquiry")) {
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const isCategory = CATEGORY_HEADERS.some(([hdr]) =>
          nextLine.toLowerCase().startsWith(hdr.toLowerCase()),
        );
        if (isCategory) break;

        const cleaned = cleanLine(nextLine);
        if (cleaned.length > 4) {
          const dateMatch = cleaned.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
          if (dateMatch) {
            inquiries.push({
              creditor: cleaned.replace(dateMatch[1], "").replace(/[\s—\-–]+$/, "").trim(),
              date: dateMatch[1],
              bureau: currentBureau,
            });
          }
        }
        i++;
      }
      continue;
    }

    i++;
  }

  return { personalInfo, scores, tradelines, inquiries, collections };
}