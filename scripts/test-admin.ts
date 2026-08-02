import assert from "node:assert/strict";

import { AdminSnapshotError, deleteAdminDrugSnapshot, refreshAdminDrugSnapshot, type AdminCacheDependencies } from "../src/lib/admin/cache-admin";
import { isAdminEmail } from "../src/lib/auth/config";
import type { DrugIdentity, DrugSnapshotResult } from "../src/types/drug-snapshot";

async function main() {
const originalEmails = process.env.ADMIN_EMAILS;
process.env.ADMIN_EMAILS = "admin@example.com, SECOND@example.com ";
assert.equal(isAdminEmail("ADMIN@example.com"), true);
assert.equal(isAdminEmail("second@example.com"), true);
assert.equal(isAdminEmail("visitor@example.com"), false);

const identity: DrugIdentity = { cacheKey: "name:test-drug", normalizedName: "Test Drug", slug: "test-drug", rxcui: null, updatedAt: new Date() };
let refreshed = false;
const deleted: string[] = [];
const invalidated: string[] = [];
const dependencies: AdminCacheDependencies = {
  async getIdentity(slug) { return slug === identity.slug ? identity : null; },
  async build(name, options) {
    assert.equal(name, identity.normalizedName);
    assert.equal(options.forceRefresh, true);
    assert.equal(options.knownIdentity, identity);
    refreshed = true;
    return { slug: "resolved-drug" } as DrugSnapshotResult;
  },
  async deleteSnapshot(slug) { deleted.push(slug); return true; },
  async invalidateComparisons(slug) { invalidated.push(slug); },
};

await refreshAdminDrugSnapshot("test-drug", dependencies);
assert.equal(refreshed, true);
assert.deepEqual(deleted, ["test-drug"]);
assert.deepEqual(invalidated, ["test-drug", "resolved-drug"]);
assert.equal(await deleteAdminDrugSnapshot("test-drug", dependencies), true);
assert.deepEqual(deleted, ["test-drug", "test-drug"]);
assert.deepEqual(invalidated, ["test-drug", "resolved-drug", "test-drug"]);
const missingDeleteDependencies: AdminCacheDependencies = {
  ...dependencies,
  async deleteSnapshot() { return false; },
  async invalidateComparisons() { assert.fail("A missing snapshot must not invalidate comparisons."); },
};
assert.equal(await deleteAdminDrugSnapshot("test-drug", missingDeleteDependencies), false);
await assert.rejects(refreshAdminDrugSnapshot("../invalid", dependencies), AdminSnapshotError);
await assert.rejects(refreshAdminDrugSnapshot("missing", dependencies), AdminSnapshotError);

if (originalEmails === undefined) delete process.env.ADMIN_EMAILS;
else process.env.ADMIN_EMAILS = originalEmails;

console.log("Admin allowlist, refresh, delete, validation, and missing-identity checks passed.");
}

void main();
