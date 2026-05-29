import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_SECRETS = [
  "kestrel-test-seed-2026",
  "kestrel-schema-sync-2026",
  "kestrel-cron-2026",
];

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret");
  if (!ALLOWED_SECRETS.includes(secret || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const cols = [
    { name: "aiScore", def: "INTEGER" },
    { name: "wasEscalated", def: "BOOLEAN DEFAULT FALSE" },
    { name: "responseTimeMs", def: "INTEGER" },
    { name: "feedbackRating", def: "INTEGER" },
    { name: "clientFeedback", def: "TEXT" },
  ];

  for (const col of cols) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.def}`
      );
      results.push(`OK: ${col.name}`);
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
        results.push(`SKIP: ${col.name} already exists`);
      } else {
        results.push(`NOTE: ${col.name} — ${e.message}`);
      }
    }
  }

  return NextResponse.json({ results });
}
