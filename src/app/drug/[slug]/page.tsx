import { PlaceholderPage } from "@/components/placeholder-page";

export default async function DrugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drugName = decodeURIComponent(slug).replaceAll("-", " ");

  return (
    <PlaceholderPage
      eyebrow="Drug signal dashboard"
      title={`A careful look at ${drugName}`}
      description="This route is ready for the future drug snapshot dashboard. A later phase will connect aggregated FAERS report counts, reported reactions, seriousness outcomes, time trends, and FDA label context."
      status="Live data arrives in Phase 07"
      showLimitations
    />
  );
}
