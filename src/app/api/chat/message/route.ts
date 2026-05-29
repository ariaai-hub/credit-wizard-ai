import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClientPortalAccessToken } from "@/lib/client-access";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  // Accept token as bearer token (client portal) or query param
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const accessToken = queryToken || token;

  const payload = await verifyClientPortalAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    // Store the client's message
    const message = await prisma.chatMessage.create({
      data: {
        tenantId: payload.tenantId,
        clientId: payload.clientId,
        role: "CLIENT",
        content: content.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
