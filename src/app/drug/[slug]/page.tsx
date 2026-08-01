import { DrugDashboard } from "@/components/drug-dashboard/drug-dashboard";

export default async function DrugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return <DrugDashboard key={decodedSlug} slug={decodedSlug} />;
}
