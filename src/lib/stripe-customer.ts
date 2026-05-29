import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

type StripeTenantCustomerInput = {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  stripeCustomerId: string | null;
};

function isMissingCustomerError(error: unknown) {
  return error instanceof Error && /no such customer/i.test(error.message);
}

export async function ensureStripeCustomerId(tenant: StripeTenantCustomerInput) {
  const stripe = getStripe();

  if (tenant.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(tenant.stripeCustomerId);
      if (!("deleted" in existingCustomer && existingCustomer.deleted)) {
        return tenant.stripeCustomerId;
      }
    } catch (error) {
      if (!isMissingCustomerError(error)) {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create({
    email: tenant.billingEmail,
    name: tenant.name,
    metadata: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
