import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHEMA_SYNC_SECRET = process.env.SCHEMA_SYNC_SECRET ?? "dev-insecure-schema-sync-fallback";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret") ?? request.headers.get("x-schema-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // 1. Add affiliateBalance to Tenant if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "affiliateBalance" INTEGER NOT NULL DEFAULT 0`;
    results.push("OK: Added affiliateBalance to Tenant");
  } catch (err: any) {
    if (err?.message?.includes("already exists")) {
      results.push("SKIP: affiliateBalance column already exists");
    } else {
      results.push("ERROR affiliateBalance: " + (err?.message ?? String(err)));
    }
  }

  // 2. Create ReferralCommission table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ReferralCommission" (
        "id" TEXT NOT NULL,
        "referrerTenantId" TEXT NOT NULL,
        "referredTenantId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "payoutId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "payoutAt" TIMESTAMP(3),
        CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ReferralCommission_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE Cascade,
        CONSTRAINT "ReferralCommission_referredTenantId_fkey" FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE Cascade
      )
    `;
    results.push("OK: Created ReferralCommission table");
  } catch (err: any) {
    if (err?.message?.includes("already exists")) {
      results.push("SKIP: ReferralCommission table already exists");
    } else {
      results.push("ERROR ReferralCommission: " + (err?.message ?? String(err)));
    }
  }

  return NextResponse.json({ ok: true, results });
}
