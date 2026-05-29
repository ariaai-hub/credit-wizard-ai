import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId query param required" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address: true,
      city: true,
      clientState: true,
      zip: true,
      disputeCases: {
        select: {
          id: true,
          status: true,
          tradelines: {
            select: {
              id: true,
              bureau: true,
              furnisherName: true,
              accountType: true,
              accountNumberMasked: true,
              balance: true,
              letterText: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, client });
}
