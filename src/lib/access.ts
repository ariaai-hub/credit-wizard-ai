export const DEFAULT_ROLES = [
  "OWNER",
  "ADMIN",
  "SUPPORT",
  "MAIL_TEAM",
  "ANALYST",
] as const;

export const CREDIT_REPORT_PROVIDER_OPTIONS = [
  "CREDIT_HERO",
  "IDENTITYIQ",
] as const;

export const TENANT_ACCESS_STATES = {
  ACTIVE: "READ_WRITE",
  GRACE: "READ_ONLY",
  SUSPENDED: "LOCKED",
} as const;
