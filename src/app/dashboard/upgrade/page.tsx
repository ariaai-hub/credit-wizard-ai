import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpgradePageClient } from "./upgrade-client";

export default async function UpgradePage() {
  const session = await requireSession();

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { plan: true, name: true },
  });

  const currentPlan = (tenant?.plan ?? "STARTER") as "STARTER" | "PRO" | "ELITE";

  return <UpgradePageClient currentPlan={currentPlan} tenantName={tenant?.name ?? ""} />;
}
