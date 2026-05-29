/**
 * Vercel environment variables required:
 *
 * STRIPE_SECRET_KEY          = sk_live_...
 * STRIPE_PRICE_STARTER       = price_xxx   (Stripe Price ID for Starter $9.99/mo)
 * STRIPE_PRICE_PRO           = price_xxx   (Stripe Price ID for Pro $59.99/mo)
 * STRIPE_PRICE_ELITE         = price_xxx   (Stripe Price ID for Elite $129.99/mo)
 * STRIPE_WEBHOOK_SECRET      = whsec_...
 * APP_BASE_URL               = https://yourdomain.com
 */

import { NextResponse } from "next/server";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createTenantWithOwner } from "@/lib/tenant";

type PublicSignupRequest = {
  name?: string;
  email?: string;
  password?: string;
  plan?: "starter" | "pro" | "elite";
  referralCode?: string;
};

function getBaseUrl(request: Request) {
  const envBaseUrl = process.env.APP_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const originHeader = request.headers.get("origin")?.trim();
  if (originHeader) {
    return originHeader.replace(/\/$/, "");
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  elite: process.env.STRIPE_PRICE_ELITE,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublicSignupRequest;

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const plan = body.plan === "pro" || body.plan === "elite" ? body.plan : "starter";
    const referralCode = String(body.referralCode ?? "").trim();

    // Validate price ID for plan
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: `${plan} plan is not configured. Set STRIPE_PRICE_${plan.toUpperCase()} in your environment.` },
        { status: 400 },
      );
    }

    // Check for existing user (consumer — not B2B company owner)
    const existingUser = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "That email already has an account. Use a different email or sign in instead." },
        { status: 409 },
      );
    }

    // Generate referral code from the future tenant ID (slug-like)
    // We'll create the tenant first with a placeholder, then update with real code
    const tempSlug = `consumer-${email.split("@")[0]?.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now()}`;

    // Create consumer tenant and owner
    // Note: planKey uses B2B plan keys internally; the actual consumer plan (starter/pro/elite)
    // is stored in metadata and resolved by the Stripe webhook handler.
    const { tenant } = await createTenantWithOwner(
      {
        companyName: name, // consumer's full name as the "company"
        ownerName: name,
        ownerEmail: email,
        ownerPhone: "",
        billingEmail: email,
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
        subscriptionStatus: "TRIALING",
        skipInitialTokenAllocation: true,
        subscriptionMetadata: {
          source: "public-signup-consumer",
          consumerPlan: plan, // store actual consumer plan in metadata
        },
      },
    );

    // Build referral code from tenant slug
    const tenantReferralCode = tenant.slug.slice(-8).toUpperCase();

    // Update tenant with referral info
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        referredBy: referralCode || null,
      },
    });

    const stripe = getStripe();

    // Create Stripe customer with email-first approach
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        plan,
        signupSource: "public-signup-consumer",
        referralCode: referralCode || "",
        referredBy: referralCode || "",
      },
    });

    // Update tenant with Stripe customer ID
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeCustomerId: customer.id },
    });

    const baseUrl = getBaseUrl(request);

    // Create Stripe Checkout session
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      customer_email: undefined, // customer already created, use ID
      payment_method_collection: "always",
      success_url: `${baseUrl}/sign-in?signup=success`,
      cancel_url: `${baseUrl}/get-started/sign-up?signup=cancelled`,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        checkoutType: "subscription",
        plan,
        signupSource: "public-signup-consumer",
        referredBy: referralCode || "",
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          plan,
          signupSource: "public-signup-consumer",
          referralCode: tenantReferralCode,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ ok: false, error: "Stripe checkout did not return a URL." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: checkout.url, sessionId: checkout.id });
  } catch (error) {
    if (isRedirectError(error)) {
      const redirectUrl = getURLFromRedirectError(error);
      if (redirectUrl) {
        return NextResponse.json({ ok: true, url: redirectUrl, mode: "redirect" });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong while opening checkout.",
      },
      { status: 500 },
    );
  }
}