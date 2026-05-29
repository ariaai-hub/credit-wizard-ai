/**
 * DB Migration: Add letter download counter fields to Tenant model.
 * Run once via GET — safe to call multiple times (idempotent via try/catch).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`
      ALTER TABLE "Tenant"
      ADD COLUMN IF NOT EXISTS "letterDownloadsThisMonth" INTEGER NOT NULL DEFAULT 0;
    `;
  } catch {
    // Column may already exist — safe to ignore
  }

  try {
    await prisma.$queryRaw`
      ALTER TABLE "Tenant"
      ADD COLUMN IF NOT EXISTS "lastDownloadMonth" TEXT;
    `;
  } catch {
    // Column may already exist — safe to ignore
  }

  return NextResponse.json({
    ok: true,
    message: "Letter download counter columns added to Tenant (or already exist).",
  });
}
