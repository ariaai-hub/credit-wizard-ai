import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";
import { getClientProviderSignupContext } from "@/lib/provider-signup";

function getInviteBaseUrl() {
  return (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isInviteEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM,
  );
}

export function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !process.env.SMTP_FROM) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function isSmsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

async function sendSms({ to, body }: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("SMS transport is not configured.");
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const payload = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Twilio returned ${response.status}: ${responseText.slice(0, 400)}`);
  }

  return responseText;
}

export async function sendClientProviderSignupEmail({
  tenantId,
  clientId,
  actorUserId,
}: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
}) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
    },
    include: {
      tenant: true,
    },
  });

  if (!client) {
    throw new Error("Client not found for provider signup delivery.");
  }

  if (!client.email) {
    throw new Error("Client does not have an email address.");
  }

  const transport = getTransport();
  const from = process.env.SMTP_FROM;
  const template = getClientProviderSignupContext({
    provider: client.tenant.creditProvider,
    tenantName: client.tenant.name,
    client,
  });

  if (!template.signupUrl) {
    throw new Error("No provider signup URL is available for this client.");
  }

  if (!transport || !from) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_DELIVERY_SKIPPED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          email: client.email,
          provider: client.tenant.creditProvider,
        },
        outputSnapshotJson: {
          reason: "SMTP not configured",
          signupUrl: template.signupUrl,
        },
      },
    });

    return {
      status: "skipped" as const,
      reason: "SMTP not configured",
    };
  }

  try {
    await transport.sendMail({
      from,
      to: client.email,
      subject: template.emailSubject,
      text: template.emailText,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${escapeHtml(client.firstName || "there")},</p>
          <p>${escapeHtml(client.tenant.name)} needs you to complete your <strong>${escapeHtml(template.providerLabel)}</strong> signup so we can move your file forward.</p>
          <p>
            <a href="${template.signupUrl}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;">
              Complete signup
            </a>
          </p>
          <p>Or use this link directly:<br /><a href="${template.signupUrl}">${template.signupUrl}</a></p>
          <p>Once you finish, reply back so we can continue the next step.</p>
        </div>
      `,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_DELIVERY_SENT",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          email: client.email,
          provider: client.tenant.creditProvider,
        },
        outputSnapshotJson: {
          delivery: "email",
          signupUrl: template.signupUrl,
        },
      },
    });

    return {
      status: "sent" as const,
      signupUrl: template.signupUrl,
    };
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_DELIVERY_FAILED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          email: client.email,
          provider: client.tenant.creditProvider,
        },
        outputSnapshotJson: {
          error: error instanceof Error ? error.message : "Unknown delivery failure",
          signupUrl: template.signupUrl,
        },
      },
    });

    throw error;
  }
}

export async function sendClientProviderSignupSms({
  tenantId,
  clientId,
  actorUserId,
  followUpLevel = 0,
}: {
  tenantId: string;
  clientId: string;
  actorUserId: string;
  followUpLevel?: 0 | 1 | 2 | 3;
}) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
    },
    include: {
      tenant: true,
    },
  });

  if (!client) {
    throw new Error("Client not found for provider signup SMS delivery.");
  }

  if (!client.phone) {
    throw new Error("Client does not have a phone number.");
  }

  const template = getClientProviderSignupContext({
    provider: client.tenant.creditProvider,
    tenantName: client.tenant.name,
    client,
    followUpLevel,
  });

  if (!template.signupUrl) {
    throw new Error("No provider signup URL is available for this client.");
  }

  if (!isSmsConfigured()) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_SMS_SKIPPED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          phone: client.phone,
          provider: client.tenant.creditProvider,
          followUpLevel,
        },
        outputSnapshotJson: {
          reason: "SMS not configured",
          signupUrl: template.signupUrl,
        },
      },
    });

    return {
      status: "skipped" as const,
      reason: "SMS not configured",
    };
  }

  try {
    const responseText = await sendSms({
      to: client.phone,
      body: template.smsText,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_SMS_SENT",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          phone: client.phone,
          provider: client.tenant.creditProvider,
          followUpLevel,
        },
        outputSnapshotJson: {
          delivery: "sms",
          signupUrl: template.signupUrl,
          responsePreview: responseText.slice(0, 400),
        },
      },
    });

    return {
      status: "sent" as const,
      signupUrl: template.signupUrl,
    };
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "CLIENT_PROVIDER_SIGNUP_SMS_FAILED",
        referenceType: "client",
        referenceId: client.id,
        inputSnapshotJson: {
          phone: client.phone,
          provider: client.tenant.creditProvider,
          followUpLevel,
        },
        outputSnapshotJson: {
          error: error instanceof Error ? error.message : "Unknown SMS delivery failure",
          signupUrl: template.signupUrl,
        },
      },
    });

    throw error;
  }
}

export async function sendStaffInvitationEmail({
  tenantId,
  invitationId,
  invitedByUserId,
}: {
  tenantId: string;
  invitationId: string;
  invitedByUserId: string;
}) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
    include: {
      tenant: true,
      invitedByUser: true,
    },
  });

  if (!invitation || invitation.tenantId !== tenantId) {
    throw new Error("Invitation not found for delivery.");
  }

  if (invitation.status !== "PENDING") {
    throw new Error("Only pending invitations can be delivered.");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId: invitedByUserId,
        eventType: "STAFF_INVITATION_DELIVERY_SKIPPED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: invitation.email,
          role: invitation.role,
        },
        outputSnapshotJson: {
          reason: "Invitation expired before delivery",
        },
      },
    });

    return {
      status: "skipped" as const,
      reason: "Invitation expired before delivery",
      inviteUrl: null,
    };
  }

  const inviteUrl = `${getInviteBaseUrl()}/invite/${invitation.token}`;
  const from = process.env.SMTP_FROM;
  const transport = getTransport();

  if (!transport || !from) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId: invitedByUserId,
        eventType: "STAFF_INVITATION_DELIVERY_SKIPPED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: invitation.email,
          role: invitation.role,
        },
        outputSnapshotJson: {
          reason: "SMTP not configured",
          inviteUrl,
        },
      },
    });

    return {
      status: "skipped" as const,
      reason: "SMTP not configured",
      inviteUrl,
    };
  }

  const invitedByName = invitation.invitedByUser?.name || invitation.tenant.ownerName || invitation.tenant.name;
  const recipientName = invitation.name || invitation.email;

  try {
    await transport.sendMail({
      from,
      to: invitation.email,
      subject: `You have been invited to ${invitation.tenant.name}`,
      text: [
        `Hi ${recipientName},`,
        "",
        `${invitedByName} invited you to join ${invitation.tenant.name}.`,
        `Role: ${invitation.role}`,
        "",
        `Accept your invite here: ${inviteUrl}`,
        `This invite expires on ${invitation.expiresAt.toLocaleString()}.`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p><strong>${escapeHtml(invitedByName)}</strong> invited you to join <strong>${escapeHtml(invitation.tenant.name)}</strong>.</p>
          <p>Role: <strong>${escapeHtml(invitation.role)}</strong></p>
          <p>
            <a href="${inviteUrl}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;">
              Accept invitation
            </a>
          </p>
          <p>Or use this link directly:<br /><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p>This invite expires on ${escapeHtml(invitation.expiresAt.toLocaleString())}.</p>
        </div>
      `,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId: invitedByUserId,
        eventType: "STAFF_INVITATION_DELIVERY_SENT",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: invitation.email,
          role: invitation.role,
        },
        outputSnapshotJson: {
          delivery: "email",
          inviteUrl,
        },
      },
    });

    return {
      status: "sent" as const,
      inviteUrl,
    };
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId: invitedByUserId,
        eventType: "STAFF_INVITATION_DELIVERY_FAILED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: invitation.email,
          role: invitation.role,
        },
        outputSnapshotJson: {
          inviteUrl,
          error: error instanceof Error ? error.message : "Unknown delivery failure",
        },
      },
    });

    throw error;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
