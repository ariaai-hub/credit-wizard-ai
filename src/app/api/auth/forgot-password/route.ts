import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTransport, isInviteEmailConfigured } from "@/lib/invite-delivery";

const BASE_URL = process.env.APP_BASE_URL ?? "https://credit-lounge-academy.vercel.app";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email: normalizedEmail, token, expiresAt },
    });

    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
    const transport = getTransport();
    const from = process.env.SMTP_FROM;

    if (transport && from) {
      await transport.sendMail({
        from,
        to: normalizedEmail,
        subject: "Reset your password",
        text: [
          `Hi ${user.name || "there"},`,
          "",
          "We received a request to reset your password.",
          `Click the link below to set a new password. It expires in 1 hour.`,
          "",
          `${resetUrl}`,
          "",
          "If you didn't request this, you can safely ignore this email.",
          "Your password won't change unless you click the link above.",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <p>Hi <strong>${user.name || normalizedEmail}</strong>,</p>
            <p>We received a request to reset your password for your account.</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;">
                Reset my password
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">${resetUrl}</a></p>
            <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
  }
}
