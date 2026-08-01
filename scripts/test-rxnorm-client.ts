import assert from "node:assert/strict";

async function main() {
  const [{ createRxNormClient }, { drugNameToSlug, normalizeDrugName }] = await Promise.all([
    import("../src/lib/rxnorm/client"),
    import("../src/lib/rxnorm/normalize"),
  ]);

  let attempts = 0;
  const paths: string[] = [];
  const client = createRxNormClient({
    retries: 1,
    sleep: async () => undefined,
    fetcher: (async (input) => {
      attempts += 1;
      const url = new URL(String(input));
      paths.push(`${url.pathname}${url.search}`);

      if (attempts === 1) {
        return new Response("temporary", { status: 503 });
      }

      if (url.pathname.endsWith("/rxcui.json")) {
        return Response.json({ idGroup: { rxnormId: ["7646"] } });
      }

      return Response.json({
        properties: { rxcui: "7646", name: "omeprazole", tty: "IN" },
      });
    }) as typeof fetch,
  });

  const result = await normalizeDrugName("  Omeprazole ", { client });
  assert.equal(attempts, 3);
  assert.equal(result.rxcui, "7646");
  assert.equal(result.slug, "omeprazole");
  assert.match(paths[0] ?? "", /search=2/);

  const noMatchClient = createRxNormClient({
    retries: 0,
    fetcher: (async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/rxcui.json")) {
        return Response.json({ idGroup: { rxnormId: [] } });
      }
      return Response.json({ approximateGroup: { candidate: [] } });
    }) as typeof fetch,
  });
  const fallback = await normalizeDrugName("  UNKNOWN   Product  ", {
    client: noMatchClient,
  });
  assert.equal(fallback.source, "fallback");
  assert.equal(fallback.normalizedName, "unknown product");
  assert.match(fallback.slug, /^unknown-product-[a-f0-9]{32}$/);

  const approximatePaths: string[] = [];
  const approximateClient = createRxNormClient({
    retries: 0,
    fetcher: (async (input) => {
      const url = new URL(String(input));
      approximatePaths.push(url.pathname);
      if (url.pathname.endsWith("/rxcui.json")) {
        return Response.json({ idGroup: { rxnormId: [] } });
      }
      if (url.pathname.endsWith("/approximateTerm.json")) {
        return Response.json({
          approximateGroup: {
            candidate: [
              {
                rxcui: "203345",
                name: "Prilosec",
                rank: "1",
                score: "11.2",
                source: "RXNORM",
              },
            ],
          },
        });
      }
      return Response.json({
        properties: { rxcui: "203345", name: "Prilosec", tty: "BN" },
      });
    }) as typeof fetch,
  });
  const approximate = await normalizeDrugName("Prilosac", {
    client: approximateClient,
  });
  assert.equal(approximate.rxcui, "203345");
  assert.equal(approximate.normalizedName, "Prilosec");
  assert.deepEqual(approximatePaths, [
    "/REST/rxcui.json",
    "/REST/approximateTerm.json",
    "/REST/rxcui/203345/properties.json",
  ]);

  const timeoutClient = createRxNormClient({
    retries: 0,
    timeoutMs: 5,
    fetcher: ((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })) as typeof fetch,
  });
  const timeoutFallback = await normalizeDrugName("Delayed Drug", {
    client: timeoutClient,
  });
  assert.equal(timeoutFallback.source, "fallback");
  assert.match(timeoutFallback.slug, /^delayed-drug-[a-f0-9]{32}$/);

  assert.notEqual(
    drugNameToSlug("drug name"),
    drugNameToSlug("drug-name"),
  );
  assert.notEqual(drugNameToSlug("café"), drugNameToSlug("cafe"));

  const unicodeSlugA = drugNameToSlug("Ж");
  const unicodeSlugB = drugNameToSlug("中");
  assert.notEqual(unicodeSlugA, unicodeSlugB);
  assert.match(unicodeSlugA, /^drug-[a-f0-9]{32}$/);
  const longSlugA = drugNameToSlug("a".repeat(120));
  const longSlugB = drugNameToSlug(`${"a".repeat(119)}b`);
  assert.notEqual(longSlugA, longSlugB);
  assert.ok(longSlugA.length <= 100);

  console.log(
    "RxNorm retry, timeout, exact/approximate match, and fallback checks passed.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
