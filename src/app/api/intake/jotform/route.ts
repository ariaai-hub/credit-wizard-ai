import { NextResponse } from "next/server";

import { processIntakeWebhook } from "@/lib/intake";

function isAuthorized(request: Request) {
  const expected = process.env.INTAKE_WEBHOOK_SECRET;
  if (!expected) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-webhook-secret");
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook request." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await processIntakeWebhook(body);

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      tenantId: result.tenant.id,
      clientId: result.client.id,
      intakeSubmissionId: result.intakeSubmission.id,
      lifecycleStage: result.client.lifecycleStage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown intake webhook error.",
      },
      { status: 400 },
    );
  }
}
