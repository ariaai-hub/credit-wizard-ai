import type { ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const internalOwner = isSuperAdmin(session.email);

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { plan: true },
  });

  return (
    <div className="min-h-screen bg-[#07111f] xl:flex">
      <DashboardNav role={session.role} email={session.email} plan={tenant?.plan} internalOwner={internalOwner} isSuperAdmin={internalOwner} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
