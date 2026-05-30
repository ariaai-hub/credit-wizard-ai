import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHEMA_SYNC_SECRET = process.env.SCHEMA_SYNC_SECRET ?? "dev-insecure-schema-sync-fallback";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret") ?? request.headers.get("x-schema-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // 1. Create Plan enum
  try {
    await prisma.$executeRaw`DO $$ BEGIN CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'ELITE'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
    results.push("OK: Created Plan enum");
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      results.push("SKIP: Plan enum already exists");
    } else {
      results.push("ERROR Plan enum: " + err?.message);
    }
  }

  // 2. Add plan column to Tenant if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "plan" "Plan" DEFAULT 'STARTER'`;
    results.push("OK: Added plan column to Tenant");
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      results.push("SKIP: plan column already exists on Tenant");
    } else {
      results.push("ERROR plan column: " + err?.message);
    }
  }

  // 3. Create SubscriptionStatus enum if not exists
  try {
    await prisma.$executeRaw`DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE', 'PAUSED', 'CANCELLED', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
    results.push("OK: Created SubscriptionStatus enum");
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      results.push("SKIP: SubscriptionStatus enum already exists");
    } else {
      results.push("ERROR SubscriptionStatus enum: " + err?.message);
    }
  }

  // 4. Add subscriptionStatus column to Tenant if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" DEFAULT 'TRIALING'`;
    results.push("OK: Added subscriptionStatus column to Tenant");
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      results.push("SKIP: subscriptionStatus column already exists");
    } else {
      results.push("ERROR subscriptionStatus: " + err?.message);
    }
  }

  // 5. Add stripeCustomerId if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`;
    results.push("OK: Added stripeCustomerId to Tenant");
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("duplicate")) {
      results.push("SKIP: stripeCustomerId already exists");
    } else {
      results.push("ERROR stripeCustomerId: " + err?.message);
    }
  }

  return NextResponse.json({ ok: true, results });
}
