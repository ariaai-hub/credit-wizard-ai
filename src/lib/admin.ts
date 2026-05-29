// Hardcoded super admin — only Shomari
const DEV_SUPER_ADMINS = [
  "akhdarbusiness@gmail.com",
];

const SUPER_ADMIN_EMAILS = (
  (process.env.SUPER_ADMIN_EMAILS ?? "") +
  "," +
  (process.env.SUPER_ADMIN_EMAIL ?? "") +
  "," +
  (process.env.SUPER_ADMIN_EMAIL2 ?? "") +
  "," +
  DEV_SUPER_ADMINS.join(",")
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdmin(email: string) {
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
