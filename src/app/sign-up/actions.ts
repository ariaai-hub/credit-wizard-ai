"use server";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { createTenantWithOwner } from "@/lib/tenant";

export type PublicSignupState = {
  error?: string;
  checkoutUrl?: string;
};

export async function createPublicSignupAction(_: PublicSignupState, formData: FormData): Promise<PublicSignupState> {
  try {
    const companyName = String(formData.get("companyName") ?? "").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const signupMode = String(formData.get("signupMode") ?? "trial") === "paid" ? "paid" : "trial";

    const starterPriceId = STRIPE_PRICE_IDS.starter;
    if (!starterPriceId) {
      return { error: "Starter plan Stripe price is not configured yet." };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: ownerEmail },
      select: { id: true },
    });

    if (existingUser) {
      return { error: "That email already has an account. Use a different email or sign in instead." };
    }

    const { tenant } = await createTenantWithOwner(
      {
        companyName,
        ownerName,
        ownerEmail,
        ownerPhone: "",
        billingEmail: ownerEmail,
        companyPhone: "",
        planKey: "starter",
        crcConfigRef: "",
        creditProvider: "CREDIT_HERO",
        creditProviderRef: "",
        mailQueueDestination: "",
        password,
      },
      {
        initialTenantStatus: "SUSPENDED",
        initialAccessMode: "LOCKED",
        subscriptionStatus: signupMode === "trial" ? "TRIALING" : "PAST_DUE",
        skipInitialTokenAllocation: true,
        subscriptionMetadata: {
          source: "public-signup",
          signupMode,
          planKey: "starter",
        },
      },
    );

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: tenant.billingEmail,
      name: tenant.name,
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        signupMode,
      },
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeCustomerId: customer.id },
    });

    const requestHeaders = await headers();
    const origin = process.env.APP_BASE_URL ?? requestHeaders.get("origin") ?? "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      payment_method_collection: "always",
      success_url: `${origin}/sign-in?signup=success`,
      cancel_url: `${origin}/sign-up?signup=cancelled`,
      line_items: [{ price: starterPriceId, quantity: 1 }],
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        checkoutType: "subscription",
        planKey: "starter",
        signupMode,
        publicSignup: "true",
      },
      subscription_data:
        signupMode === "trial"
          ? {
              trial_period_days: 7,
              metadata: {
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                signupMode,
                publicSignup: "true",
              },
            }
          : {
              metadata: {
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                signupMode,
                publicSignup: "true",
              },
            },
    });

    if (!checkout.url) {
      return { error: "Stripe checkout did not return a URL." };
    }

    return { checkoutUrl: checkout.url };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong while opening checkout.",
    };
  }
}
