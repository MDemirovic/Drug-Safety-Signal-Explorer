import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const {
    getDrugLabel,
    getSeriousnessBreakdown,
    getSeriousnessCounts,
    getTopReactions,
    getYearlyTrend,
  } = await import("../src/lib/openfda/client");

  const drugName = process.argv[2]?.trim() || "omeprazole";
  const currentYear = new Date().getUTCFullYear();
  const fromYear = Math.max(2004, currentYear - 4);

  console.log(`Checking live openFDA aggregates for ${drugName}...`);

  const [topReactions, seriousness, breakdown, yearlyTrend, label] =
    await Promise.all([
      getTopReactions(drugName, 10),
      getSeriousnessCounts(drugName),
      getSeriousnessBreakdown(drugName),
      getYearlyTrend(drugName, fromYear, currentYear),
      getDrugLabel(drugName),
    ]);

  if (topReactions.length === 0 || seriousness.total === 0) {
    throw new Error(`No aggregate FAERS data was returned for ${drugName}.`);
  }

  console.log(
    JSON.stringify(
      {
        drugName,
        topReactions,
        seriousness,
        seriousnessBreakdown: breakdown,
        yearlyTrend,
        label: label
          ? {
              effectiveTime: label.effectiveTime,
              brandNames: label.brandNames,
              genericNames: label.genericNames,
              hasBoxedWarning: label.boxedWarning.length > 0,
              warningSectionCount: label.warnings.length,
            }
          : null,
      },
      null,
      2,
    ),
  );
  console.log("openFDA live aggregate check passed.");
}

main().catch((error: unknown) => {
  console.error("openFDA live aggregate check failed.");
  console.error(error);
  process.exitCode = 1;
});

