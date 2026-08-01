import { DrugDashboard } from "@/components/drug-dashboard/drug-dashboard";

export default async function DrugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DrugDashboard slug={decodeURIComponent(slug)} />;
}
