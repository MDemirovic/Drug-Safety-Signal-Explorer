import "server-only";

import { z } from "zod";

const requiredValue = z.string().trim().min(1);
const optionalSecret = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  requiredValue.optional(),
);
const mongoUri = requiredValue.refine(
  (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
  "Must be a MongoDB connection string.",
);
const databaseName = requiredValue.regex(/^[A-Za-z0-9_-]+$/, "Contains unsupported characters.");
const adminEmails = requiredValue.transform((value, context) => {
  const emails = value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const parsed = z.array(z.email()).min(1).safeParse(emails);
  if (!parsed.success) {
    context.addIssue({ code: "custom", message: "Must contain at least one valid email address." });
    return z.NEVER;
  }
  return parsed.data;
});

export const deploymentEnvSchema = z.object({
  MONGODB_URI: mongoUri,
  MONGODB_DB: databaseName,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requiredValue,
  CLERK_SECRET_KEY: requiredValue,
  ADMIN_EMAILS: adminEmails,
  MISTRAL_API_KEY: requiredValue,
  OPENFDA_API_KEY: optionalSecret,
});

const mongoEnvSchema = deploymentEnvSchema.pick({ MONGODB_URI: true, MONGODB_DB: true });
const adminEnvSchema = deploymentEnvSchema.pick({ ADMIN_EMAILS: true });
const mistralEnvSchema = deploymentEnvSchema.pick({ MISTRAL_API_KEY: true });
const openFdaEnvSchema = deploymentEnvSchema.pick({ OPENFDA_API_KEY: true });

type EnvSource = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  readonly fields: string[];

  constructor(error: z.ZodError) {
    super("Server environment configuration is invalid.", { cause: error });
    this.name = "EnvironmentValidationError";
    this.fields = [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "environment")))];
  }
}

function parseEnvironment<T>(schema: z.ZodType<T>, source: EnvSource) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) throw new EnvironmentValidationError(parsed.error);
  return parsed.data;
}

export function readDeploymentEnv(source: EnvSource = process.env) {
  return parseEnvironment(deploymentEnvSchema, source);
}

export function readMongoEnv(source: EnvSource = process.env) {
  return parseEnvironment(mongoEnvSchema, source);
}

export function readAdminEnv(source: EnvSource = process.env) {
  return parseEnvironment(adminEnvSchema, source);
}

export function readMistralEnv(source: EnvSource = process.env) {
  return parseEnvironment(mistralEnvSchema, source);
}

export function readOpenFdaEnv(source: EnvSource = process.env) {
  return parseEnvironment(openFdaEnvSchema, source);
}
