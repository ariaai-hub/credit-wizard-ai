/**
 * Stripe webhook handler — Credit Wizard AI B2C (consumer) platform.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY          — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET     — Stripe webhook signing secret
 *   STRIPE_PRICE_STARTER      — Price ID for Starter ($9.99/mo)
 *   STRIPE_PRICE_PRO          — Price ID for Pro ($59.99/mo)
 *   STRIPE_PRICE_ELITE        — Price ID for Elite ($129.99/mo)
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

/** Map a Stripe price ID to a consumer plan key. Falls back to null. */
async function resolvePlanFromPriceId(priceId: string): Promise<"STARTER" | "PRO" | "ELITE" | null> {
  if (priceId === STRIPE_PRICE_IDS.starter) return "STARTER";
  if (priceId === STRIPE_PRICE_IDS.pro) return "PRO";
  if (priceId === STRIPE_PRICE_IDS.elite) return "ELITE";
  return null;
}

/** Resolve plan from checkout session metadata planKey or by looking up the subscription price. */
async function resolvePlanFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<"STARTER" | "PRO" | "ELITE" | null> {
  const metaPlan = session.metadata?.plan as "STARTER" | "PRO" | "ELITE" | undefined;
  if (metaPlan && ["STARTER", "PRO", "ELITE"].includes(metaPlan)) {
    return metaPlan;
  }

  if (session.mode === "subscription" && typeof session.subscription === "string") {
    const sub = await stripe.subscriptions.retrieve(session.subscription, {
      expand: ["items.data.price"],
    });
    const priceId = sub.items.data[0]?.price?.id;
    if (priceId) {
      return resolvePlanFromPriceId(priceId);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    await handleStripeEvent(event, stripe);

    return NextResponse.json({
      ok: true,
      received: event.type,
      note: "Webhook received and processed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Stripe webhook error.",
      },
      { status: 400 },
    );
  }
}

// ---------------------------------------------------------------------------
// Event dispatcher
// ---------------------------------------------------------------------------

async function handleStripeEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, stripe);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Fall through to the original B2B handler logic in handleLegacyStripeEvent
      await handleLegacyStripeEvent(event, stripe);
  }
}

// ---------------------------------------------------------------------------
// B2C consumer handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  // Only handle B2C public signups — identified by publicSignup=true metadata
  const isPublicSignup = session.metadata?.publicSignup === "true" || session.metadata?.signupSource === "public-signup-consumer";
  if (!isPublicSignup) return;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!stripeCustomerId) return;

  // Find the consumer tenant by stripeCustomerId first, fallback to email
  let tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: { id: true, referredBy: true },
  });

      if (!tenant) {
        // Fallback: look up by email from Stripe customer record
        try {
          const customer = await stripe.customers.retrieve(stripeCustomerId);
          if (!("deleted" in customer) && customer.email) {
            tenant = await prisma.tenant.findFirst({
              where: { billingEmail: { equals: customer.email, mode: "insensitive" } },
              select: { id: true, referredBy: true },
            });
          }
        } catch {
          // Ignore Stripe lookup failures
        }
      }

  if (!tenant) return;

  // Resolve the plan
  const plan = await resolvePlanFromSession(stripe, session);

  // Update tenant with subscription info and plan
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      ...(plan ? { plan } : {}),
      status: "ACTIVE",
      accessMode: "READ_WRITE",
    },
  });

  // Guard duplicate audit logs for the same checkout session
  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      tenantId: tenant.id,
      eventType: "B2C_SUBSCRIPTION_ACTIVATED",
      referenceType: "stripe_checkout_session",
      referenceId: session.id,
    },
    select: { id: true },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "system",
        eventType: "B2C_SUBSCRIPTION_ACTIVATED",
        referenceType: "stripe_checkout_session",
        referenceId: session.id,
        inputSnapshotJson: {
          stripeCustomerId,
          stripeSubscriptionId,
          plan,
          mode: session.mode,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        },
      },
    });
  }

  // Credit affiliate referrer if this tenant was referred
  if (plan && tenant.referredBy) {
    // Look up referrer by their referral code
    const referrer = await prisma.tenant.findUnique({
      where: { referralCode: tenant.referredBy },
      select: { id: true, plan: true },
    });

    if (referrer && (referrer.plan === "PRO" || referrer.plan === "ELITE")) {
      // Dynamically import to avoid circular deps and keep webhook cold-start fast
      const { creditAffiliateCommission } = await import("@/lib/affiliate");
      const credited = await creditAffiliateCommission(referrer.id, tenant.id, plan);
      if (credited.success) {
        await prisma.auditLog.create({
          data: {
            tenantId: referrer.id,
            actorType: "system",
            eventType: "B2C_REFERRAL_COMMISSION_CREDITED",
            referenceType: "referral_commission",
            referenceId: credited.commissionId,
            inputSnapshotJson: {
              commissionId: credited.commissionId,
              amountCents: credited.amountCents,
              referredTenantId: tenant.id,
              plan,
            },
          },
        });
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, stripe: Stripe) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  if (!stripeCustomerId) return;

  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: { id: true, stripeSubscriptionId: true },
  });

  if (!tenant || tenant.stripeSubscriptionId !== subscription.id) return;

  // Resolve new plan from subscription price
  let plan: "STARTER" | "PRO" | "ELITE" | null = null;
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    plan = await resolvePlanFromPriceId(priceId);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(plan ? { plan } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "system",
      eventType: "B2C_SUBSCRIPTION_UPDATED",
      referenceType: "stripe_subscription",
      referenceId: subscription.id,
      inputSnapshotJson: {
        status: subscription.status,
        plan,
        priceId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  if (!stripeCustomerId) return;

  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: { id: true, stripeSubscriptionId: true },
  });

  if (!tenant || tenant.stripeSubscriptionId !== subscription.id) return;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      stripeSubscriptionId: null,
      plan: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "system",
      eventType: "B2C_SUBSCRIPTION_CANCELLED",
      referenceType: "stripe_subscription",
      referenceId: subscription.id,
      inputSnapshotJson: {
        previousStatus: subscription.status,
      },
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  if (!stripeCustomerId) return;

  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (!tenant) return;

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "system",
      eventType: "B2C_PAYMENT_FAILED",
      referenceType: "stripe_invoice",
      referenceId: invoice.id,
      inputSnapshotJson: {
        amountDueCents: invoice.amount_due,
        currency: invoice.currency,
        invoiceNumber: invoice.number,
        attemptCount: invoice.attempt_count,
        errorMessage: (invoice as { error_message?: string | null }).error_message,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Legacy B2B / existing store handlers (all other event types)
// ---------------------------------------------------------------------------

async function handleLegacyStripeEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const tenantId = session.metadata?.tenantId;
      if (!tenantId) return;

      const existingAudit = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          eventType: "STRIPE_CHECKOUT_COMPLETED",
          referenceType: "stripe_checkout_session",
          referenceId: session.id,
        },
        select: { id: true },
      });

      if (existingAudit) return;

      // Token pack one-time payment logic (existing B2B flow)
      if (session.mode === "payment" && session.payment_status === "paid") {
        const { TOKEN_PACKS } = await import("@/lib/billing");
        const tokenPackSize = Number(session.metadata?.tokenPack ?? 0);
        const tokenPack = TOKEN_PACKS.find((pack) => pack.tokens === tokenPackSize);

        if (tokenPack) {
          await prisma.mailTokenAccount.upsert({
            where: { tenantId },
            update: { purchasedBalance: { increment: tokenPack.tokens } },
            create: { tenantId, purchasedBalance: tokenPack.tokens },
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          actorType: "system",
          eventType: "STRIPE_CHECKOUT_COMPLETED",
          referenceType: "stripe_checkout_session",
          referenceId: session.id,
          inputSnapshotJson: {
            mode: session.mode,
            customerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
            subscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
            setupIntentId:
              typeof session.setup_intent === "string"
                ? session.setup_intent
                : session.setup_intent?.id ?? null,
            paymentStatus: session.payment_status,
            amountTotalCents: session.amount_total,
            amountSubtotalCents: session.amount_subtotal,
            currency: session.currency,
            metadata: session.metadata,
          },
        },
      });

      // Payment method setup flow (existing B2B flow)
      if (
        session.mode === "setup" &&
        typeof session.customer === "string" &&
        typeof session.setup_intent === "string"
      ) {
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

        if (paymentMethodId) {
          await stripe.customers.update(session.customer, {
            invoice_settings: { default_payment_method: paymentMethodId },
          });

          await prisma.auditLog.create({
            data: {
              tenantId,
              actorType: "system",
              eventType: "STRIPE_PAYMENT_METHOD_UPDATED",
              referenceType: "stripe_customer",
              referenceId: session.customer,
              inputSnapshotJson: { paymentMethodId, setupIntentId: session.setup_intent },
            },
          });
        }
      }

      // Subscription checkout (existing B2B flow)
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        const isPublicSignup = session.metadata?.publicSignup === "true" || session.metadata?.signupSource === "public-signup-consumer";

        if (isPublicSignup) {
          const subscriptionRecord = await prisma.billingSubscription.findFirst({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            select: { includedTokenAllowance: true },
          });

          const includedAllowance = subscriptionRecord?.includedTokenAllowance ?? 0;

          if (includedAllowance > 0) {
            await prisma.mailTokenAccount.upsert({
              where: { tenantId },
              update: { includedBalance: { increment: includedAllowance } },
              create: { tenantId, includedBalance: includedAllowance },
            });
          }

          await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: "ACTIVE", accessMode: "READ_WRITE" },
          });
        }

        await prisma.billingSubscription.updateMany({
          where: { tenantId },
          data: {
            providerSubscriptionId: session.subscription,
            status: session.metadata?.signupMode === "trial" ? "TRIALING" : "ACTIVE",
          },
        });
      }

      return;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const tenantId = session.metadata?.tenantId;
      if (!tenantId) return;

      await prisma.auditLog.create({
        data: {
          tenantId,
          actorType: "system",
          eventType: "STRIPE_CHECKOUT_EXPIRED",
          referenceType: "stripe_checkout_session",
          referenceId: session.id,
          inputSnapshotJson: {
            mode: session.mode,
            metadata: session.metadata,
          },
        },
      });
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const existingSubscription = await prisma.billingSubscription.findFirst({
        where: { providerSubscriptionId: subscription.id },
        select: { tenantId: true },
      });

      await prisma.billingSubscription.updateMany({
        where: { providerSubscriptionId: subscription.id },
        data: {
          status: mapStripeSubscriptionStatus(subscription.status),
          currentPeriodStart: subscription.items.data[0]?.current_period_start
            ? new Date(subscription.items.data[0].current_period_start * 1000)
            : undefined,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000)
            : undefined,
        },
      });

      if (existingSubscription?.tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId: existingSubscription.tenantId,
            actorType: "system",
            eventType: "STRIPE_SUBSCRIPTION_SYNCED",
            referenceType: "stripe_subscription",
            referenceId: subscription.id,
            inputSnapshotJson: {
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          },
        });
      }
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const invoiceCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      const tenantId =
        (invoice.metadata?.tenantId as string) ??
        (await prisma.tenant
          .findFirst({
            where: { stripeCustomerId: invoiceCustomerId },
            select: { id: true },
          })
          .then((t) => t?.id));

      if (!tenantId) return;

      const existingAudit = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          eventType: "STRIPE_INVOICE_PAID",
          referenceType: "stripe_invoice",
          referenceId: invoice.id,
        },
        select: { id: true },
      });

      if (existingAudit) return;

      await prisma.auditLog.create({
        data: {
          tenantId,
          actorType: "system",
          eventType: "STRIPE_INVOICE_PAID",
          referenceType: "stripe_invoice",
          referenceId: invoice.id,
          inputSnapshotJson: {
            amountPaidCents: invoice.amount_paid,
            currency: invoice.currency,
            customerId: invoiceCustomerId,
            metadata: invoice.metadata,
          },
        },
      });

      return;
    }

    default:
      return;
  }
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return "ACTIVE" as const;
    case "trialing":
      return "TRIALING" as const;
    case "past_due":
      return "PAST_DUE" as const;
    case "paused":
      return "PAUSED" as const;
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED" as const;
    default:
      return "GRACE" as const;
  }
}
