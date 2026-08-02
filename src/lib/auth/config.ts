import "server-only";

import { readAdminEnv } from "@/lib/env/server";

export function getAdminEmails() {
  return new Set(readAdminEnv().ADMIN_EMAILS);
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && getAdminEmails().has(email.trim().toLowerCase()));
}
