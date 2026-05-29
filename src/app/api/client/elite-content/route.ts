import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — return Elite content for the authenticated user's plan
// Only ELITE plan users can access this
export async function GET() {
  try {
    const session = await requireSession();
    const { tenantId } = session;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (tenant?.plan !== "ELITE") {
      return NextResponse.json({ error: "Elite plan required." }, { status: 403 });
    }

    const items = await prisma.eliteContent.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });

    // Group by category
    const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    return NextResponse.json({ items, grouped }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/client/elite-content]", message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
