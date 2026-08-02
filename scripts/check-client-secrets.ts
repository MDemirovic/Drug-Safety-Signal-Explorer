import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const staticRoot = join(process.cwd(), ".next", "static");
const serverOnlyKeys = [
  "MONGODB_URI",
  "CLERK_SECRET_KEY",
  "ADMIN_EMAILS",
  "MISTRAL_API_KEY",
  "OPENFDA_API_KEY",
] as const;
const configuredSecrets = serverOnlyKeys
  .map((key) => process.env[key]?.trim())
  .filter((value): value is string => Boolean(value && value.length >= 8));
const credentialShapes = [
  /mongodb(?:\+srv)?:\/\//i,
  /sk_(?:live|test)_[A-Za-z0-9_-]{8,}/,
];

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return files.flat();
}

async function main() {
  for (const path of await filesUnder(staticRoot)) {
    const content = await readFile(path, "utf8");
    if (configuredSecrets.some((secret) => content.includes(secret)) || credentialShapes.some((pattern) => pattern.test(content))) {
      throw new Error(`Potential server credential found in client asset: ${path.slice(staticRoot.length + 1)}`);
    }
  }

  console.log("Client asset secret scan passed.");
}

void main();
