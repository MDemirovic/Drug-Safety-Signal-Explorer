import { ComparisonWorkspace } from "@/components/comparison/comparison-workspace";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const drugA = first(params.drugA).trim();
  const drugB = first(params.drugB).trim();

  return (
    <ComparisonWorkspace
      key={`${drugA.toLocaleLowerCase("en-US")}::${drugB.toLocaleLowerCase("en-US")}`}
      initialDrugA={drugA}
      initialDrugB={drugB}
    />
  );
}
