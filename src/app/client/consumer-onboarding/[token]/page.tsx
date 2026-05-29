import { notFound } from "next/navigation";
import { verifyOnboardingToken } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import ConsumerOnboardingWizard from "./consumer-onboarding-wizard";

export default async function ConsumerOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await verifyOnboardingToken(token);

  if (!payload) {
    notFound();
  }

  const client = await prisma.client.findUnique({
    where: { id: payload.clientId },
    select: { firstName: true, lastName: true },
  });

  return (
    <ConsumerOnboardingWizard
      token={token}
      clientId={payload.clientId}
      clientName={client ? `${client.firstName} ${client.lastName}` : "Your Account"}
    />
  );
}
