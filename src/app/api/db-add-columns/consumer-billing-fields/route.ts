import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHEMA_SYNC_SECRET = process.env.SCHEMA_SYNC_SECRET ?? "kestrel-schema-sync-2026";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-schema-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statements = [
    // Tenant: stripeSubscriptionId
    `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT`,

    // Tenant: referralCode
    `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "referralCode" TEXT UNIQUE`,

    // Tenant: referredBy
    `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "referredBy" TEXT`,

    // Tenant: plan (as TEXT since enum migration is complex, handle at app level)
    `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'STARTER'`,

    // User: referralCode
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT`,

    // User: referredBy
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT`,
  ];

  const results: string[] = [];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`OK: ${sql.slice(0, 60)}...`);
    } catch (e: any) {
      if (e?.message?.includes("already exists") || e?.message?.includes("duplicate")) {
        results.push(`SKIP: ${sql.slice(0, 60)}...`);
      } else {
        results.push(`ERROR: ${sql.slice(0, 60)}... — ${e.message}`);
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}