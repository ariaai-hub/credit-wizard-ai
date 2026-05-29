import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, message: "Token is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Find valid token
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ ok: false, message: "This reset link has expired or is invalid. Please request a new one." }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return NextResponse.json({ ok: false, message: "Account not found." }, { status: 404 });
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Consume token
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ ok: true, message: "Your password has been updated. You can now sign in." });
  } catch (err) {
    return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
  }
}
