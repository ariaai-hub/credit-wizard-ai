import { notFound } from "next/navigation";
import { verifyOnboardingToken } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import OnboardingWizard from "./onboarding-wizard";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await verifyOnboardingToken(token);

  if (!payload) {
    notFound();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: payload.tenantId },
    select: { name: true, logoUrl: true },
  });

  return (
    <OnboardingWizard
      token={token}
      companyName={tenant?.name ?? "Your Company"}
      logoUrl={tenant?.logoUrl ?? null}
    />
  );
}