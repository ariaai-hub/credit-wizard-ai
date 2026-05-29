import { NextResponse } from "next/server";

import { runProviderSignupFollowUps } from "@/lib/provider-followups";

function isAuthorized(request: Request) {
  const expected = process.env.FOLLOWUP_AUTOMATION_SECRET;
  if (!expected) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : request.headers.get("x-automation-secret");

  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      tenantId?: string;
      actorUserId?: string;
      dryRun?: boolean;
    };

    if (!body.tenantId || !body.actorUserId) {
      return NextResponse.json({ error: "tenantId and actorUserId are required." }, { status: 400 });
    }

    const result = await runProviderSignupFollowUps({
      tenantId: body.tenantId,
      actorUserId: body.actorUserId,
      dryRun: body.dryRun ?? true,
      actorType: "AUTOMATION",
      trigger: "automation_api",
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown follow-up automation error.",
      },
      { status: 500 },
    );
  }
}
