import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireSyncSecret() {
  const s = process.env.SCHEMA_SYNC_SECRET;
  if (!s) {
    
    console.warn("[DB] SCHEMA_SYNC_SECRET not set — using dev fallback");
    return "dev-insecure-sync-fallback";
  }
  return s;
}
const SYNC_SECRET = requireSyncSecret();

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: string[] = [];

    // Add primaryColor to Tenant if missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#2563eb'`);
      results.push("OK: added primaryColor");
    } catch (e) {
      results.push(`SKIP/ERR primaryColor: ${(e instanceof Error ? e.message : String(e)).substring(0, 100)}`);
    }

    // Add accentColor to Tenant if missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#0ea5e9'`);
      results.push("OK: added accentColor");
    } catch (e) {
      results.push(`SKIP/ERR accentColor: ${(e instanceof Error ? e.message : String(e)).substring(0, 100)}`);
    }

    // Add defaultMailType to Tenant if missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "defaultMailType" TEXT NOT NULL DEFAULT 'REGULAR'`);
      results.push("OK: added defaultMailType");
    } catch (e) {
      results.push(`SKIP/ERR defaultMailType: ${(e instanceof Error ? e.message : String(e)).substring(0, 100)}`);
    }

    // Add creditReportUrl to Client if missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "creditReportUrl" TEXT`);
      results.push("OK: added creditReportUrl to Client");
    } catch (e) {
      results.push(`SKIP/ERR creditReportUrl: ${(e instanceof Error ? e.message : String(e)).substring(0, 100)}`);
    }

    // Create MailTokenAccount table if not exists
    try {
      await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TABLE "MailTokenAccount" ("id" TEXT NOT NULL DEFAULT cuid(), "tenantId" TEXT NOT NULL, "purchasedBalance" INTEGER NOT NULL DEFAULT 0, "usedBalance" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MailTokenAccount_pkey" PRIMARY KEY ("id"), CONSTRAINT "MailTokenAccount_tenantId_key" UNIQUE ("tenantId")); EXCEPTION WHEN others THEN RAISE NOTICE 'Table already exists'; END $$`);
      results.push("OK: created MailTokenAccount table");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("notice")) {
        results.push("SKIP: MailTokenAccount already exists");
      } else {
        results.push(`ERR MailTokenAccount: ${msg.substring(0, 100)}`);
      }
    }

    // Add MAIL_SENT to ClientLifecycleStage enum if not exists
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "ClientLifecycleStage" ADD VALUE IF NOT EXISTS 'MAIL_SENT'`);
      results.push("OK: added MAIL_SENT to ClientLifecycleStage");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        results.push("SKIP: MAIL_SENT already in enum");
      } else {
        results.push(`ERR MAIL_SENT: ${msg.substring(0, 100)}`);
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: "Schema sync failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
