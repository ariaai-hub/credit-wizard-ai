import { Client, Prisma, Tenant } from "@prisma/client";
import { z } from "zod";

export type CreditProviderRuntimeStatus = {
  status: "missing_config" | "ref_only" | "ready";
  detail: string;
  liveMode: boolean;
  provider?: string;
  reference?: string;
  endpointUrl?: string;
  method?: string;
  affiliateLink?: string;
};

type ProviderResolvedConfig = {
  source: "default_env" | "config_map";
  provider: string;
  reference: string;
  endpointUrl: string;
  method: "POST" | "PUT";
  authType: "bearer" | "basic" | "header" | "none";
  authToken?: string;
  username?: string;
  password?: string;
  headerName?: string;
  recordType: string;
  affiliateLink?: string;
  liveMode: boolean;
  timeoutMs: number;
};

type CreditProviderSyncResult =
  | {
      status: "skipped";
      reason: string;
      clientUpdate?: ProviderClientUpdate;
    }
  | {
      status: "ready";
      mode: "dry_run" | "live";
      requestPreview: {
        endpointUrl: string;
        method: string;
        provider: string;
        recordType: string;
        headers: Record<string, string>;
        payload: Prisma.InputJsonObject;
        affiliateLink?: string;
      };
      responsePreview?: string;
      clientUpdate: ProviderClientUpdate;
    };

type ProviderClientUpdate = {
  creditProviderStatus: "SIGNUP_LINK_READY" | "SYNCED" | "FAILED";
  creditProviderExternalId?: string;
  creditProviderSignupUrl?: string;
  creditProviderLastSyncedAt?: Date;
  creditProviderLastError?: string | null;
  creditProviderLastResponseJson?: Prisma.InputJsonValue;
};

const providerConfigSchema = z.object({
  endpointUrl: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  authType: z.enum(["bearer", "basic", "header", "none"]).default("bearer"),
  authToken: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  headerName: z.string().optional(),
  recordType: z.string().default("client_sync"),
  affiliateLink: z.string().url().optional(),
  liveMode: z.boolean().default(false),
  timeoutMs: z.number().int().positive().default(15000),
});

const providerConfigMapSchema = z.record(z.string(), providerConfigSchema);

export function getCreditProviderRuntimeStatus({
  provider,
  creditProviderRef,
}: {
  provider: string;
  creditProviderRef?: string | null;
}): CreditProviderRuntimeStatus {
  const providerAffiliateLink = getProviderAffiliateLink(provider);

  if (!creditProviderRef) {
    return {
      status: "missing_config",
      detail: "No credit provider ref is set on the tenant.",
      liveMode: false,
      provider,
      affiliateLink: providerAffiliateLink,
    };
  }

  const config = resolveProviderConfig({ provider, creditProviderRef });
  if (!config) {
    return {
      status: "ref_only",
      detail: `Credit provider ref \"${creditProviderRef}\" is set, but no matching runtime credentials were found.`,
      liveMode: false,
      provider,
      reference: creditProviderRef,
      affiliateLink: providerAffiliateLink,
    };
  }

  return {
    status: "ready",
    detail: `${config.liveMode ? "Live" : "Dry-run"} ${provider} client is ready from ${config.source}.`,
    liveMode: config.liveMode,
    provider,
    reference: creditProviderRef,
    endpointUrl: config.endpointUrl,
    method: config.method,
    affiliateLink: config.affiliateLink ?? providerAffiliateLink,
  };
}

export async function syncClientToCreditProvider({
  tenant,
  client,
}: {
  tenant: Pick<Tenant, "creditProvider" | "creditProviderRef" | "slug">;
  client: Pick<Client, "id" | "firstName" | "lastName" | "email" | "phone" | "lifecycleStage" | "createdAt">;
}): Promise<CreditProviderSyncResult> {
  const providerAffiliateLink = getProviderAffiliateLink(tenant.creditProvider);

  if (!tenant.creditProviderRef) {
    return {
      status: "skipped",
      reason: "Missing credit provider reference.",
      clientUpdate: providerAffiliateLink
        ? {
            creditProviderStatus: "SIGNUP_LINK_READY",
            creditProviderSignupUrl: providerAffiliateLink,
            creditProviderLastError: null,
            creditProviderLastResponseJson: {
              mode: "affiliate_only",
              reason: "Missing credit provider reference.",
              affiliateLink: providerAffiliateLink,
            },
          }
        : undefined,
    };
  }

  const config = resolveProviderConfig({
    provider: tenant.creditProvider,
    creditProviderRef: tenant.creditProviderRef,
  });

  if (!config) {
    return {
      status: "skipped",
      reason: `No runtime credentials found for ${tenant.creditProvider} ref \"${tenant.creditProviderRef}\".`,
      clientUpdate: providerAffiliateLink
        ? {
            creditProviderStatus: "SIGNUP_LINK_READY",
            creditProviderSignupUrl: providerAffiliateLink,
            creditProviderLastError: null,
            creditProviderLastResponseJson: {
              mode: "affiliate_only",
              reason: `No runtime credentials found for ${tenant.creditProvider} ref \"${tenant.creditProviderRef}\".`,
              affiliateLink: providerAffiliateLink,
            },
          }
        : undefined,
    };
  }

  const payload = buildProviderPayload({
    provider: tenant.creditProvider,
    recordType: config.recordType,
    tenantSlug: tenant.slug,
    client,
  });

  const headers = buildHeaders(config);

  const requestPreview = {
    endpointUrl: config.endpointUrl,
    method: config.method,
    provider: tenant.creditProvider,
    recordType: config.recordType,
    headers,
    payload,
    affiliateLink: config.affiliateLink,
  };

  if (!config.liveMode) {
    return {
      status: "ready",
      mode: "dry_run",
      requestPreview,
      clientUpdate: {
        creditProviderStatus: config.affiliateLink ? "SIGNUP_LINK_READY" : "SYNCED",
        creditProviderSignupUrl: config.affiliateLink,
        creditProviderLastError: null,
        creditProviderLastResponseJson: {
          mode: "dry_run",
          affiliateLink: config.affiliateLink ?? null,
          endpointUrl: config.endpointUrl,
          provider: tenant.creditProvider,
        },
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.endpointUrl, {
      method: config.method,
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`${tenant.creditProvider} returned ${response.status}: ${responseText.slice(0, 500)}`);
    }

    const clientUpdate = buildProviderClientUpdate({
      provider: tenant.creditProvider,
      responseText,
      affiliateLink: config.affiliateLink,
    });

    return {
      status: "ready",
      mode: "live",
      requestPreview,
      responsePreview: responseText.slice(0, 1000),
      clientUpdate,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProviderConfig({
  provider,
  creditProviderRef,
}: {
  provider: string;
  creditProviderRef: string;
}): ProviderResolvedConfig | null {
  const configMap = parseProviderConfigMap();
  const mapped = configMap?.[creditProviderRef];

  if (mapped) {
    return {
      ...mapped,
      source: "config_map",
      provider,
      reference: creditProviderRef,
    };
  }

  const defaultEnv = resolveDefaultProviderEnv(provider);
  if (!defaultEnv) {
    return null;
  }

  return {
    ...defaultEnv,
    source: "default_env",
    provider,
    reference: creditProviderRef,
  };
}

function resolveDefaultProviderEnv(provider: string) {
  const normalized = provider.toUpperCase();
  const prefix = normalized === "CREDIT_HERO" ? "CREDIT_HERO" : normalized === "IDENTITYIQ" ? "IDENTITYIQ" : normalized;
  const endpointUrl = process.env[`${prefix}_API_URL`];

  if (!endpointUrl) {
    return null;
  }

  return providerConfigSchema.parse({
    endpointUrl,
    method: process.env[`${prefix}_API_METHOD`],
    authType: process.env[`${prefix}_AUTH_TYPE`],
    authToken: process.env[`${prefix}_API_TOKEN`],
    username: process.env[`${prefix}_API_USERNAME`],
    password: process.env[`${prefix}_API_PASSWORD`],
    headerName: process.env[`${prefix}_AUTH_HEADER`],
    recordType: process.env[`${prefix}_RECORD_TYPE`],
    affiliateLink: process.env[`${prefix}_AFFILIATE_LINK`],
    liveMode: process.env[`${prefix}_LIVE_MODE`] === "true",
    timeoutMs: process.env[`${prefix}_TIMEOUT_MS`] ? Number(process.env[`${prefix}_TIMEOUT_MS`]) : undefined,
  });
}

export function getProviderAffiliateLink(provider: string) {
  const normalized = provider.toUpperCase();
  const prefix = normalized === "CREDIT_HERO" ? "CREDIT_HERO" : normalized === "IDENTITYIQ" ? "IDENTITYIQ" : normalized;
  return process.env[`${prefix}_AFFILIATE_LINK`] || undefined;
}

function buildProviderClientUpdate({
  provider,
  responseText,
  affiliateLink,
}: {
  provider: string;
  responseText: string;
  affiliateLink?: string;
}): ProviderClientUpdate {
  const parsedJson = parseJsonObject(responseText);
  const externalId = extractFirstPrimitive(parsedJson, [
    ["id"],
    ["data", "id"],
    ["data", "user", "id"],
    ["data", "customer", "id"],
    ["result", "id"],
    ["result", "userId"],
    ["memberId"],
    ["customerId"],
    ["userId"],
    ["applicantId"],
    ["member", "id"],
    ["user", "id"],
    provider === "CREDIT_HERO" ? ["creditHeroId"] : ["identityIqId"],
  ]) ?? extractExternalIdFromText(responseText);
  const signupUrl =
    extractFirstPrimitive(parsedJson, [["signupUrl"], ["signupURL"], ["redirectUrl"], ["redirectURL"], ["url"], ["data", "url"], ["data", "signupUrl"], ["result", "url"]]) ??
    extractUrlFromText(responseText) ??
    affiliateLink;
  const responseStatus =
    extractFirstPrimitive(parsedJson, [["status"], ["result", "status"], ["data", "status"], ["message"], ["error"], ["detail"]]) ??
    inferStatusFromText(responseText) ??
    undefined;
  const successFlag = extractFirstBoolean(parsedJson, [["success"], ["ok"], ["data", "success"], ["result", "success"]]);
  const resolvedStatus =
    successFlag === false || responseStatus?.toLowerCase().includes("fail")
      ? "FAILED"
      : externalId
        ? "SYNCED"
        : signupUrl
          ? "SIGNUP_LINK_READY"
          : "SYNCED";

  return {
    creditProviderStatus: resolvedStatus,
    creditProviderExternalId: externalId,
    creditProviderSignupUrl: signupUrl,
    creditProviderLastSyncedAt: new Date(),
    creditProviderLastError: resolvedStatus === "FAILED" ? responseStatus ?? responseText.slice(0, 300) : null,
    creditProviderLastResponseJson:
      parsedJson ?? {
        rawResponse: responseText.slice(0, 1000),
        affiliateLink: affiliateLink ?? null,
        inferredStatus: resolvedStatus,
      },
  };
}

function parseJsonObject(responseText: string): Prisma.InputJsonObject | null {
  try {
    const parsed = JSON.parse(responseText) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Prisma.InputJsonObject;
    }
  } catch {
    return null;
  }

  return null;
}

function extractFirstPrimitive(source: Prisma.InputJsonObject | null, paths: string[][]): string | undefined {
  if (!source) {
    return undefined;
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

  return undefined;
}

function extractFirstBoolean(source: Prisma.InputJsonObject | null, paths: string[][]): boolean | undefined {
  if (!source) {
    return undefined;
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

    if (typeof current === "boolean") {
      return current;
    }
  }

  return undefined;
}

function extractUrlFromText(responseText: string) {
  const match = responseText.match(/https?:\/\/[^\s"'<>]+/i);
  return match?.[0];
}

function extractExternalIdFromText(responseText: string) {
  const patterns = [
    /(?:external[_\s-]?id|client[_\s-]?id|customer[_\s-]?id|member[_\s-]?id|user[_\s-]?id|applicant[_\s-]?id)[:=\s"']+([A-Za-z0-9_-]+)/i,
    /\bID[:#\s]+([A-Za-z0-9_-]{4,})/i,
  ];

  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

function inferStatusFromText(responseText: string) {
  const normalized = responseText.toLowerCase();

  if (normalized.includes("error") || normalized.includes("failed") || normalized.includes("invalid")) {
    return "failed";
  }

  if (normalized.includes("success") || normalized.includes("created") || normalized.includes("complete")) {
    return "success";
  }

  return undefined;
}

function parseProviderConfigMap() {
  const raw = process.env.CREDIT_PROVIDER_CONFIGS_JSON;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return providerConfigMapSchema.parse(parsed);
  } catch {
    return null;
  }
}

function buildHeaders(config: ProviderResolvedConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.authType === "bearer" && config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  if (config.authType === "basic" && config.username && config.password) {
    headers.Authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
  }

  if (config.authType === "header" && config.headerName && config.authToken) {
    headers[config.headerName] = config.authToken;
  }

  return headers;
}

function buildProviderPayload({
  provider,
  recordType,
  tenantSlug,
  client,
}: {
  provider: string;
  recordType: string;
  tenantSlug: string;
  client: Pick<Client, "id" | "firstName" | "lastName" | "email" | "phone" | "lifecycleStage" | "createdAt">;
}) {
  const basePayload: Prisma.InputJsonObject = {
    recordType,
    tenantSlug,
    externalClientId: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    lifecycleStage: client.lifecycleStage,
    createdAt: client.createdAt.toISOString(),
  };

  if (provider === "CREDIT_HERO") {
    return {
      ...basePayload,
      product: "credit_hero",
      contact: {
        email: client.email,
        mobile: client.phone,
      },
    };
  }

  if (provider === "IDENTITYIQ") {
    return {
      ...basePayload,
      product: "identityiq",
      applicant: {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
      },
    };
  }

  return basePayload;
}
