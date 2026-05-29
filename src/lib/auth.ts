import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { isSuperAdmin } from "@/lib/admin";

const SESSION_COOKIE = "crb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production. Current value is undefined.");
    }
    // Fallback ONLY in non-production — do not use in production
    console.warn("[AUTH] SESSION_SECRET not set. Using insecure dev fallback. Set SESSION_SECRET in production.");
    return new TextEncoder().encode("dev-insecure-fallback-do-not-use-in-prod");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function setSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify<SessionPayload>(token, getSessionSecret());
    return verified.payload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (!isSuperAdmin(session.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
