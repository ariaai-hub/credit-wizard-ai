import { Client, IntakeSubmission, Prisma, Tenant } from "@prisma/client";
import { z } from "zod";

type CrcResolvedConfig = {
  source: "default_env" | "config_map";
  reference: string;
  insertRecordUrl: string;
  apiAuthKey: string;
  secretKey: string;
  recordType: string;
  liveMode: boolean;
  timeoutMs: number;
};

type CrcClientUpdate = {
  crcClientId?: string;
};

type CrcSyncResult =
  | {
      status: "skipped";
      reason: string;
      clientUpdate?: CrcClientUpdate;
      parsedResponse?: Prisma.InputJsonValue;
    }
  | {
      status: "ready";
      mode: "dry_run" | "live";
      requestPreview: {
        insertRecordUrl: string;
        recordType: string;
        xmlData: string;
      };
      responsePreview?: string;
      parsedResponse?: Prisma.InputJsonValue;
      clientUpdate?: CrcClientUpdate;
    };

const crcConfigSchema = z.object({
  apiAuthKey: z.string().min(1),
  secretKey: z.string().min(1),
  insertRecordUrl: z.string().url().default("https://app.creditrepaircloud.com/webapi/insertrecords"),
  recordType: z.string().default("lead"),
  liveMode: z.boolean().default(false),
  timeoutMs: z.number().int().positive().default(15000),
});

const crcConfigMapSchema = z.record(z.string(), crcConfigSchema);

export function getCrcRuntimeStatus(crcConfigRef?: string | null) {
  if (!crcConfigRef) {
    return {
      status: "missing_config" as const,
      detail: "No CRC config ref is set on the tenant.",
      liveMode: false,
    };
  }

  const config = resolveCrcConfig(crcConfigRef);
  if (!config) {
    return {
      status: "ref_only" as const,
      detail: `CRC config ref "${crcConfigRef}" is set, but no matching runtime credentials were found.`,
      liveMode: false,
    };
  }

  return {
    status: "ready" as const,
    detail: `${config.liveMode ? "Live" : "Dry-run"} CRC client is ready from ${config.source}.`,
    liveMode: config.liveMode,
    reference: config.reference,
    insertRecordUrl: config.insertRecordUrl,
    recordType: config.recordType,
  };
}

export async function syncClientToCrc({
  tenant,
  client,
  latestSubmission,
}: {
  tenant: Pick<Tenant, "crcConfigRef" | "slug" | "name">;
  client: Pick<Client, "id" | "firstName" | "lastName" | "email" | "phone" | "lifecycleStage" | "createdAt">;
  latestSubmission?: Pick<IntakeSubmission, "id" | "source" | "externalSubmissionId"> | null;
}): Promise<CrcSyncResult> {
  if (!tenant.crcConfigRef) {
    return {
      status: "skipped",
      reason: "Missing CRC config reference.",
    };
  }

  const config = resolveCrcConfig(tenant.crcConfigRef);
  if (!config) {
    return {
      status: "skipped",
      reason: `No runtime CRC credentials found for config ref "${tenant.crcConfigRef}".`,
    };
  }

  const xmlData = buildInsertRecordXml({
    recordType: config.recordType,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email ?? undefined,
    phoneMobile: normalizeDigits(client.phone),
    memo: [
      `tenant=${tenant.slug}`,
      `clientId=${client.id}`,
      `lifecycleStage=${client.lifecycleStage}`,
      `latestSubmission=${latestSubmission?.externalSubmissionId ?? latestSubmission?.id ?? "none"}`,
    ].join(" | "),
  });

  const requestPreview = {
    insertRecordUrl: config.insertRecordUrl,
    recordType: config.recordType,
    xmlData,
  };

  if (!config.liveMode) {
    return {
      status: "ready",
      mode: "dry_run",
      requestPreview,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body = new URLSearchParams({
      apiauthkey: config.apiAuthKey,
      secretkey: config.secretKey,
      type: config.recordType,
      xmlData,
    });

    const response = await fetch(config.insertRecordUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`CRC returned ${response.status}: ${responseText.slice(0, 500)}`);
    }

    const parsedResponse = parseCrcResponse(responseText);

    return {
      status: "ready",
      mode: "live",
      requestPreview,
      responsePreview: responseText.slice(0, 1000),
      parsedResponse: parsedResponse.parsedResponse,
      clientUpdate: parsedResponse.crcClientId ? { crcClientId: parsedResponse.crcClientId } : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveCrcConfig(crcConfigRef: string): CrcResolvedConfig | null {
  const configMap = parseCrcConfigMap();
  const mapped = configMap?.[crcConfigRef];

  if (mapped) {
    return {
      ...mapped,
      source: "config_map",
      reference: crcConfigRef,
    };
  }

  const defaultEnv = resolveDefaultEnvConfig();
  if (defaultEnv && crcConfigRef === "default") {
    return {
      ...defaultEnv,
      source: "default_env",
      reference: "default",
    };
  }

  return defaultEnv
    ? {
        ...defaultEnv,
        source: "default_env",
        reference: crcConfigRef,
      }
    : null;
}

function resolveDefaultEnvConfig() {
  const apiAuthKey = process.env.CRC_API_AUTH_KEY;
  const secretKey = process.env.CRC_SECRET_KEY;

  if (!apiAuthKey || !secretKey) {
    return null;
  }

  return crcConfigSchema.parse({
    apiAuthKey,
    secretKey,
    insertRecordUrl: process.env.CRC_INSERT_RECORD_URL,
    recordType: process.env.CRC_RECORD_TYPE,
    liveMode: process.env.CRC_LIVE_MODE === "true",
    timeoutMs: process.env.CRC_TIMEOUT_MS ? Number(process.env.CRC_TIMEOUT_MS) : undefined,
  });
}

function parseCrcConfigMap() {
  const raw = process.env.CRC_CONFIGS_JSON;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return crcConfigMapSchema.parse(parsed);
  } catch {
    return null;
  }
}

function buildInsertRecordXml({
  recordType,
  firstName,
  lastName,
  email,
  phoneMobile,
  memo,
}: {
  recordType: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneMobile?: string;
  memo?: string;
}) {
  const fields = [
    xmlTag("type", recordType),
    xmlTag("firstname", firstName),
    xmlTag("lastname", lastName),
    email ? xmlTag("email", email) : "",
    phoneMobile ? xmlTag("phone_mobile", phoneMobile) : "",
    memo ? xmlTag("memo", memo) : "",
  ]
    .filter(Boolean)
    .join("");

  return `<${recordType}>${fields}</${recordType}>`;
}

function xmlTag(name: string, value: string) {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeDigits(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  return digits || undefined;
}

function parseCrcResponse(responseText: string) {
  const parsedJson = parseJsonValue(responseText);
  const crcClientId =
    extractFirstPrimitive(parsedJson, [["id"], ["recordId"], ["leadId"], ["clientId"], ["data", "id"], ["result", "id"]]) ??
    extractFirstXmlTag(responseText, ["id", "leadid", "clientid", "recordid", "contactid"]);
  const status =
    extractFirstPrimitive(parsedJson, [["status"], ["message"], ["result", "status"], ["data", "status"]]) ??
    extractFirstXmlTag(responseText, ["status", "message", "result"]);

  return {
    crcClientId: crcClientId ?? undefined,
    parsedResponse:
      parsedJson ??
      ({
        rawResponse: responseText.slice(0, 1000),
        inferredCrcClientId: crcClientId ?? null,
        inferredStatus: status ?? null,
      } satisfies Prisma.InputJsonValue),
  };
}

function parseJsonValue(responseText: string): Prisma.InputJsonValue | null {
  try {
    return JSON.parse(responseText) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

function extractFirstPrimitive(source: Prisma.InputJsonValue | null, paths: string[][]): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const path of paths) {
    let current: Prisma.InputJsonValue | undefined = source;

    for (const key of path) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = undefined;
        break;
      }

      const currentObject = current as Prisma.InputJsonObject;
      if (!(key in currentObject)) {
        current = undefined;
        break;
      }

      current = currentObject[key] as Prisma.InputJsonValue;
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (typeof current === "number" && Number.isFinite(current)) {
      return String(current);
    }
  }

  return null;
}

function extractFirstXmlTag(responseText: string, tags: string[]) {
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = responseText.match(regex);
    const value = match?.[1]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}
