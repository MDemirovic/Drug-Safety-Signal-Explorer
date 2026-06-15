import "server-only";

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured. Add it to your local environment file before using authentication.`,
    );
  }

  return value;
}

export function getBetterAuthSecret() {
  const secret = getRequiredEnvironmentVariable("BETTER_AUTH_SECRET");

  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

export function getBetterAuthUrl() {
  const value = getRequiredEnvironmentVariable("BETTER_AUTH_URL");
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }

  return url.toString().replace(/\/$/, "");
}

export function getAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && getAdminEmails().has(email.trim().toLowerCase()));
}
