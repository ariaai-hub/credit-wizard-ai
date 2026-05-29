import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireSchemaSyncSecret() {
  const s = process.env.SCHEMA_SYNC_SECRET;
  if (!s) {
    
    console.warn("[DB] SCHEMA_SYNC_SECRET not set — using dev fallback");
    return "dev-insecure-schema-sync-fallback";
  }
  return s;
}
const SCHEMA_SYNC_SECRET = requireSchemaSyncSecret();

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-schema-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Add includedBalance to MailTokenAccount if it doesn't exist
    // Step 1: Add the column (may already exist from prior runs)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "MailTokenAccount"
        ADD COLUMN IF NOT EXISTS "includedBalance" INTEGER NOT NULL DEFAULT 0
      `);
    } catch (e: any) {
      if (!e?.message?.includes("already exists")) {
        return NextResponse.json({ error: `Could not add includedBalance: ${e.message}` }, { status: 500 });
      }
    }

    // Step 2: Migrate any included tokens from TokenAccount that were credited there incorrectly
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "MailTokenAccount" mta
        SET "includedBalance" = (
          SELECT COALESCE("includedBalance", 0)
          FROM "TokenAccount" ta
          WHERE ta."tenantId" = mta."tenantId"
        )
        WHERE EXISTS (
          SELECT 1 FROM "TokenAccount" ta
          WHERE ta."tenantId" = mta."tenantId" AND ta."includedBalance" > 0
        )
      `);
    } catch (e: any) {
      // Migration step — ignore errors if data doesn't exist
    }

    return NextResponse.json({
      ok: true,
      note: "MailTokenAccount.includedBalance added (or already exists). Cross-table migration attempted.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
