import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClientPortalAccessToken } from "@/lib/client-access";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("token");

  if (!accessToken) {
    return NextResponse.json({ error: "Token required" }, { status: 401 });
  }

  const payload = await verifyClientPortalAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        tenantId: payload.tenantId,
        clientId: payload.clientId,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        status: true,
        createdAt: true,
        sentAt: true,
      },
    });

    return NextResponse.json({ ok: true, messages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
