import { Client } from "@prisma/client";

import { getProviderAffiliateLink } from "@/lib/credit-provider";

const FOLLOW_UP_SCHEDULE_HOURS = [24, 72, 168] as const;

export type ProviderSignupFollowUpDecision = {
  due: boolean;
  level: 0 | 1 | 2 | 3;
  label: string;
  recommendedChannel: "sms" | "email" | "manual";
  nextTouchAt: Date | null;
};

export function getClientProviderSignupContext({
  provider,
  tenantName,
  client,
  followUpLevel = 0,
}: {
  provider: string;
  tenantName: string;
  client: Pick<Client, "firstName" | "lastName" | "email" | "phone" | "creditProviderSignupUrl">;
  followUpLevel?: 0 | 1 | 2 | 3;
}) {
  const signupUrl = client.creditProviderSignupUrl ?? getProviderAffiliateLink(provider) ?? "";
  const firstName = client.firstName?.trim() || "there";
  const providerLabel = formatProviderLabel(provider);
  const clientName = `${client.firstName} ${client.lastName}`.trim();
  const messageTone =
    followUpLevel === 0
      ? `${tenantName} needs you to complete your ${providerLabel} signup so we can move your file forward.`
      : followUpLevel === 1
        ? `${tenantName} is following up because we still need your ${providerLabel} signup completed to keep your file moving.`
        : followUpLevel === 2
          ? `${tenantName} still needs your ${providerLabel} signup completed. This is holding up the next step in your file.`
          : `${tenantName} still cannot move forward until your ${providerLabel} signup is completed.`;

  const closeLine =
    followUpLevel >= 2
      ? "Please complete it and reply back today so we can continue."
      : "Once you finish, reply back so we can continue the next step.";

  const emailSubject =
    followUpLevel === 0
      ? `${tenantName}: complete your ${providerLabel} signup`
      : `${tenantName}: reminder to complete your ${providerLabel} signup`;
  const emailText = [
    `Hi ${firstName},`,
    "",
    messageTone,
    "",
    signupUrl ? `Complete it here: ${signupUrl}` : "Your signup link will be provided by the team.",
    "",
    closeLine,
  ].join("\n");

  const smsText = signupUrl
    ? `${tenantName}: ${followUpLevel === 0 ? "complete" : "reminder to complete"} your ${providerLabel} signup here so we can keep your file moving: ${signupUrl} Reply once done.`
    : `${tenantName}: ${followUpLevel === 0 ? "complete" : "reminder to complete"} your ${providerLabel} signup so we can keep your file moving. Reply once done.`;

  const mailtoHref = client.email
    ? `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailText)}`
    : null;

  const smsHref = client.phone
    ? `sms:${encodeURIComponent(client.phone)}?body=${encodeURIComponent(smsText)}`
    : null;

  return {
    providerLabel,
    signupUrl,
    clientName,
    emailSubject,
    emailText,
    smsText,
    mailtoHref,
    smsHref,
  };
}

export function getProviderSignupFollowUpDecision({
  status,
  lastTouchedAt,
  hasEmail,
  hasPhone,
}: {
  status: string;
  lastTouchedAt?: Date | null;
  hasEmail: boolean;
  hasPhone: boolean;
}): ProviderSignupFollowUpDecision {
  if (["SIGNUP_COMPLETED", "SYNCED", "FAILED"].includes(status)) {
    return {
      due: false,
      level: 0,
      label: status === "FAILED" ? "fix needed" : "complete",
      recommendedChannel: hasPhone ? "sms" : hasEmail ? "email" : "manual",
      nextTouchAt: null,
    };
  }

  const now = Date.now();
  const baseTime = lastTouchedAt?.getTime() ?? now;
  const hoursSince = (now - baseTime) / (1000 * 60 * 60);
  let level: 0 | 1 | 2 | 3 = 0;

  if (hoursSince >= FOLLOW_UP_SCHEDULE_HOURS[2]) {
    level = 3;
  } else if (hoursSince >= FOLLOW_UP_SCHEDULE_HOURS[1]) {
    level = 2;
  } else if (hoursSince >= FOLLOW_UP_SCHEDULE_HOURS[0]) {
    level = 1;
  }

  const due = !lastTouchedAt || level > 0 || status === "SIGNUP_LINK_READY";
  let nextTouchAt: Date | null;

  if (!lastTouchedAt) {
    nextTouchAt = new Date();
  } else if (level >= 3) {
    nextTouchAt = null;
  } else {
    const nextHours = level === 0 ? FOLLOW_UP_SCHEDULE_HOURS[0] : level === 1 ? FOLLOW_UP_SCHEDULE_HOURS[1] : FOLLOW_UP_SCHEDULE_HOURS[2];
    nextTouchAt = new Date(baseTime + nextHours * 60 * 60 * 1000);
  }

  return {
    due,
    level,
    label:
      level === 0
        ? "initial send"
        : level === 1
          ? "24h reminder"
          : level === 2
            ? "72h reminder"
            : "7d final follow-up",
    recommendedChannel: hasPhone ? "sms" : hasEmail ? "email" : "manual",
    nextTouchAt,
  };
}

export function formatProviderLabel(provider: string) {
  if (provider === "CREDIT_HERO") {
    return "Credit Hero";
  }

  if (provider === "IDENTITYIQ") {
    return "IdentityIQ";
  }

  return provider.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
