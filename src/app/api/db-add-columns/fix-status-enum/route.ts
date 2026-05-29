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

  // Fix status column: drop default → alter type → re-add default
  const steps = [
    `ALTER TABLE "ChatMessage" ALTER COLUMN "status" DROP DEFAULT`,
    `ALTER TABLE "ChatMessage" ALTER COLUMN "status" TYPE "ChatMessageStatus" USING "status"::text::"ChatMessageStatus"`,
    `ALTER TABLE "ChatMessage" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
  ];

  for (const sql of steps) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql.slice(0, 60)}...`);
    } catch (err: any) {
      results.push(`NOTE: ${err.message.slice(0, 100)}`);
    }
  }

  return NextResponse.json({ results });
}
