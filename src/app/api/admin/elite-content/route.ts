import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";

const eliteContentSchema = z.object({
  category: z.enum(["email-sequences", "social-swipe", "referral-templates", "lead-magnets", "compliance-kit", "ad-copy"]),
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  tags: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin(email: string) {
  if (!isSuperAdmin(email)) throw new Error("Forbidden");
}

// GET — list all content
export async function GET() {
  try {
    const session = await requireSession();
    await requireAdmin(session.email);
    const items = await prisma.eliteContent.findMany({
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// POST — create new content
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await requireAdmin(session.email);
    const body = await request.json();
    const parsed = eliteContentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data.", details: parsed.error.flatten() }, { status: 400 });
    const item = await prisma.eliteContent.create({ data: parsed.data });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update content
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    await requireAdmin(session.email);
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const parsed = eliteContentSchema.partial().safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
    const item = await prisma.eliteContent.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Not found or update failed." }, { status: 404 });
  }
}

// DELETE — remove content
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    await requireAdmin(session.email);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    await prisma.eliteContent.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
