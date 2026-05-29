import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { markCommissionPaid } from "@/lib/affiliate";

/**
 * POST /api/admin/affiliate/payout
 *
 * Admin marks a pending commission as paid.
 * - Super admin can mark any commission as paid
 * - OWNER/ADMIN role can mark their own commissions
 *
 * Body: { commissionId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { tenantId, role } = session;

    // Only OWNER, ADMIN, or super admins can trigger payouts
    const elevatedRoles = ["OWNER", "ADMIN"];
    const isElevated = elevatedRoles.includes(role) || isSuperAdmin(session.email);

    if (!isElevated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { commissionId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { commissionId } = body;
    if (!commissionId || typeof commissionId !== "string") {
      return NextResponse.json({ error: "commissionId is required" }, { status: 400 });
    }

    const result = await markCommissionPaid(commissionId, tenantId);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Failed to process payout" }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/admin/affiliate/payout]", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
