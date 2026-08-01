import assert from "node:assert/strict";

async function main() {
  const [{ countResponseSchema }, clientModule, queryModule] = await Promise.all([
    import("../src/lib/openfda/parsers"),
    import("../src/lib/openfda/client"),
    import("../src/lib/openfda/queries"),
  ]);

  const { createOpenFdaClient, OpenFdaError } = clientModule;
  const requestLogs: Array<Record<string, unknown>> = [];
  const requestedUrls: string[] = [];
  let calls = 0;
  process.env.OPENFDA_API_KEY = "test-secret-key";

  const retryingClient = createOpenFdaClient({
    retries: 1,
    sleep: async () => undefined,
    logger: async (entry) => {
      requestLogs.push(entry);
    },
    fetcher: (async (input) => {
      calls += 1;
      requestedUrls.push(String(input));
      if (calls === 1) {
        return new Response(
          JSON.stringify({ error: { message: "temporarily unavailable" } }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ results: [{ term: 1, count: 42 }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch,
  });

  const response = await retryingClient.request(
    "/drug/event.json",
    { search: 'patient.drug.medicinalproduct:"omeprazole"', count: "serious" },
    countResponseSchema,
  );

  assert.equal(response.results[0]?.count, 42);
  assert.equal(calls, 2, "transient errors should be retried once");
  assert.deepEqual(
    requestLogs.map((entry) => entry.outcome),
    ["error", "success"],
  );
  assert.ok(requestedUrls.every((url) => url.includes("test-secret-key")));
  assert.ok(
    requestLogs.every((entry) => !JSON.stringify(entry).includes("test-secret-key")),
    "request logs must never contain the API key",
  );

  const timeoutLogs: Array<Record<string, unknown>> = [];
  const timeoutClient = createOpenFdaClient({
    retries: 0,
    timeoutMs: 5,
    logger: async (entry) => {
      timeoutLogs.push(entry);
    },
    fetcher: ((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })) as typeof fetch,
  });

  await assert.rejects(
    timeoutClient.request(
      "/drug/event.json",
      { count: "serious" },
      countResponseSchema,
    ),
    (error: unknown) =>
      error instanceof OpenFdaError && error.code === "TIMEOUT",
  );
  assert.equal(timeoutLogs.length, 1);
  assert.equal(timeoutLogs[0]?.errorCode, "TIMEOUT");

  const loggerFailureClient = createOpenFdaClient({
    retries: 0,
    logger: async () => {
      throw new Error("simulated logger outage");
    },
    fetcher: (async () =>
      new Response(JSON.stringify({ results: [{ term: 1, count: 7 }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch,
  });
  const responseDespiteLoggerFailure = await loggerFailureClient.request(
    "/drug/event.json",
    { count: "serious" },
    countResponseSchema,
  );
  assert.equal(
    responseDespiteLoggerFailure.results[0]?.count,
    7,
    "telemetry failures must not mask a successful openFDA response",
  );

  const query = queryModule.buildDrugEventSearch('  test "drug"  ');
  assert.match(query, / OR /);
  assert.match(query, /test \\"drug\\"/);
  assert.equal(queryModule.receivedDateClause(2024), "receivedate:[20240101 TO 20241231]");
  assert.throws(() => queryModule.buildDrugEventSearch("   "), /required/);

  console.log("openFDA client retry, timeout, logging, and query checks passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
