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
    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "GRACE"] } },
      select: { id: true, name: true },
    });

    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const existing = await prisma.mailTokenAccount.findUnique({
        where: { tenantId: tenant.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.mailTokenAccount.create({
        data: {
          tenantId: tenant.id,
          includedBalance: 0,
          purchasedBalance: 0,
          usedBalance: 0,
        },
      });
      created++;
    }

    return NextResponse.json({
      ok: true,
      tenantsChecked: tenants.length,
      created,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
