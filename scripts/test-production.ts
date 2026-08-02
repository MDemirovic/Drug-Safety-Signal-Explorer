import assert from "node:assert/strict";

import { z } from "zod";

import { comparisonSearchSchema, savedReportIdSchema, snapshotErrorResponse } from "../src/lib/analytics/snapshot-api";
import { GET as healthCheck } from "../src/app/api/health/route";
import { EnvironmentValidationError, readAdminEnv, readDeploymentEnv, readMongoEnv, readOpenFdaEnv } from "../src/lib/env/server";

async function main() {
const valid = {
  MONGODB_URI: "mongodb+srv://user:password@example.mongodb.net/",
  MONGODB_DB: "drug_safety_signal_explorer",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  CLERK_SECRET_KEY: "sk_test_example",
  ADMIN_EMAILS: " Admin@example.com,second@example.com ",
  MISTRAL_API_KEY: "mistral-secret",
  OPENFDA_API_KEY: "",
};

const parsed = readDeploymentEnv(valid);
assert.deepEqual(parsed.ADMIN_EMAILS, ["admin@example.com", "second@example.com"]);
assert.equal(parsed.OPENFDA_API_KEY, undefined);
assert.equal(readMongoEnv(valid).MONGODB_DB, valid.MONGODB_DB);
assert.deepEqual(readAdminEnv(valid).ADMIN_EMAILS, parsed.ADMIN_EMAILS);
assert.equal(readOpenFdaEnv(valid).OPENFDA_API_KEY, undefined);
assert.throws(() => readDeploymentEnv({ ...valid, MONGODB_URI: "https://example.com" }), EnvironmentValidationError);
assert.throws(() => readDeploymentEnv({ ...valid, ADMIN_EMAILS: "not-an-email" }), EnvironmentValidationError);
assert.throws(() => readDeploymentEnv({ ...valid, MISTRAL_API_KEY: "" }), EnvironmentValidationError);
let configurationError: unknown;
try {
  readMongoEnv({});
} catch (error) {
  configurationError = error;
}
const previousConsoleError = console.error;
console.error = () => undefined;
const configurationResponse = snapshotErrorResponse(configurationError);
console.error = previousConsoleError;
assert.equal(configurationResponse.status, 503);
assert.deepEqual(await configurationResponse.json(), { error: "The drug snapshot could not be prepared right now." });

assert.deepEqual(comparisonSearchSchema.parse({ drugA: "  Aspirin ", drugB: "Ibuprofen" }), {
  drugA: "Aspirin",
  drugB: "Ibuprofen",
});
assert.deepEqual(comparisonSearchSchema.parse({ drugA: "aspirin", drugB: "ASPIRIN" }), {
  drugA: "aspirin",
  drugB: "ASPIRIN",
});
assert.equal(savedReportIdSchema.parse("507f1f77bcf86cd799439011"), "507f1f77bcf86cd799439011");
assert.throws(() => savedReportIdSchema.parse("not-an-object-id"), z.ZodError);

const previousMongoUri = process.env.MONGODB_URI;
const previousMongoDb = process.env.MONGODB_DB;
delete process.env.MONGODB_URI;
delete process.env.MONGODB_DB;
console.error = () => undefined;
const unavailableHealth = await healthCheck();
console.error = previousConsoleError;
if (previousMongoUri === undefined) delete process.env.MONGODB_URI;
else process.env.MONGODB_URI = previousMongoUri;
if (previousMongoDb === undefined) delete process.env.MONGODB_DB;
else process.env.MONGODB_DB = previousMongoDb;
assert.equal(unavailableHealth.status, 503);
assert.deepEqual(await unavailableHealth.json(), { status: "unavailable" });
assert.equal(unavailableHealth.headers.get("Cache-Control"), "no-store");

console.log("Environment and public API boundary validation checks passed.");
}

void main();
