import assert from "node:assert/strict";

async function main() {
  const { normalizeDrugName } = await import("../src/lib/rxnorm/normalize");

  const omeprazole = await normalizeDrugName("  OMEPRAZOLE ");
  assert.equal(omeprazole.source, "rxnorm");
  assert.ok(omeprazole.rxcui);
  assert.match(omeprazole.normalizedName.toLowerCase(), /omeprazole/);

  const prilosec = await normalizeDrugName("Prilosec");
  assert.equal(prilosec.source, "rxnorm");
  assert.ok(prilosec.rxcui);

  const fallback = await normalizeDrugName("Imaginary Drug 123", {
    client: {
      lookup: async () => {
        throw new Error("simulated RxNorm outage");
      },
    },
  });
  assert.equal(fallback.inputName, "Imaginary Drug 123");
  assert.equal(fallback.normalizedName, "imaginary drug 123");
  assert.match(fallback.slug, /^imaginary-drug-123-[a-f0-9]{32}$/);
  assert.equal(fallback.rxcui, null);
  assert.equal(fallback.source, "fallback");

  console.log(
    JSON.stringify({ omeprazole, prilosec, fallback }, null, 2),
  );
  console.log("RxNorm live normalization and fallback checks passed.");
}

main().catch((error: unknown) => {
  console.error("RxNorm normalization check failed.");
  console.error(error);
  process.exitCode = 1;
});
