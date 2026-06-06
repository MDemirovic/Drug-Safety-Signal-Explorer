import { PlaceholderPage } from "@/components/placeholder-page";

export default function ComparePage() {
  return (
    <PlaceholderPage
      eyebrow="Drug comparison"
      title="Compare reported signals with context."
      description="The comparison workspace will place two aggregated drug snapshots side by side, including overlapping reported reactions and trend views. It will never claim that raw report counts prove one drug is safer."
      status="Comparison arrives in Phase 10"
      showLimitations
    />
  );
}
