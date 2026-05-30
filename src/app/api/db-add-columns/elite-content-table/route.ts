import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHEMA_SYNC_SECRET = process.env.SCHEMA_SYNC_SECRET ?? "dev-insecure-schema-sync-fallback";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret") ?? request.headers.get("x-schema-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "EliteContent" (
        "id" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "content" TEXT NOT NULL,
        "tags" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "EliteContent_pkey" PRIMARY KEY ("id")
      )
    `;
    results.push("OK: Created EliteContent table");
  } catch (err: any) {
    if (err?.message?.includes("already exists")) {
      results.push("SKIP: EliteContent table already exists");
    } else {
      results.push("ERROR: " + (err?.message ?? String(err)));
    }
  }

  return NextResponse.json({ ok: true, results });
}
