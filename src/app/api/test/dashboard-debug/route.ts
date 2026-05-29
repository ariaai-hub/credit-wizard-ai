import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getSeatUsage } from "@/lib/tenant";
import { getIntakeOverview, getIntakeQueueSnapshot } from "@/lib/intake";
import { getTenantDisputeOverview } from "@/lib/dispute-runtime";
import { getPlanDefinition } from "@/lib/billing";

const SECRET = "kestrel-schema-sync-2026";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow passing tenantId directly for testing, otherwise use session
  let tenantId = url.searchParams.get("tenantId");
  if (!tenantId) {
    try {
      const session = await requireSession();
      tenantId = session.tenantId;
    } catch (e) {
      return NextResponse.json({ error: "Auth failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }
  const results: Record<string, unknown> = {};

  // Test 1: tenant lookup
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    results.tenant = tenant ? `OK: ${tenant.name}` : "NOT FOUND";
  } catch (e) {
    results.tenant = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 2: user lookup
  try {
    const user = await prisma.user.findFirst({ where: { tenantId } });
    results.userCount = user ? `OK: ${user.email}` : "NONE";
  } catch (e) {
    results.userCount = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 3: clients
  try {
    const count = await prisma.client.count({ where: { tenantId } });
    results.clients = `OK: ${count} clients`;
  } catch (e) {
    results.clients = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 4: subscription
  try {
    const sub = await prisma.billingSubscription.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    results.subscription = sub ? `OK: ${sub.status} / plan: ${sub.planKey}` : "NONE";
  } catch (e) {
    results.subscription = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 5: seat usage
  try {
    const seatUsage = await getSeatUsage(tenantId);
    results.seatUsage = `OK: ${JSON.stringify(seatUsage)}`;
  } catch (e) {
    results.seatUsage = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 6: intake overview
  try {
    const overview = await getIntakeOverview(tenantId);
    results.intakeOverview = `OK: ${overview.totalClients} clients, ${overview.totalSubmissions} submissions`;
  } catch (e) {
    results.intakeOverview = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 7: queue snapshot
  try {
    const queue = await getIntakeQueueSnapshot(tenantId);
    results.queue = `OK: ${queue.length} records`;
  } catch (e) {
    results.queue = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 8: dispute overview
  try {
    const dispute = await getTenantDisputeOverview(tenantId);
    results.disputeOverview = `OK: ${JSON.stringify(dispute)}`;
  } catch (e) {
    results.disputeOverview = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 9: token account
  try {
    const ta = await prisma.tokenAccount.findUnique({ where: { tenantId } });
    results.tokenAccount = ta ? `OK: balance ${ta.includedBalance}` : "NOT FOUND";
  } catch (e) {
    results.tokenAccount = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ tenantId, results });
}
