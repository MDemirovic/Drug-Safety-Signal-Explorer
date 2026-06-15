import { redirect } from "next/navigation";

import { PlaceholderPage } from "@/components/placeholder-page";
import { getCurrentSession } from "@/lib/auth/session";

export default async function SavedReportsPage() {
  if (!(await getCurrentSession())) {
    redirect("/login?next=/dashboard/saved-reports");
  }

  return (
    <PlaceholderPage
      eyebrow="Saved reports"
      title="Your saved signal reports will live here."
      description="Saving and managing drug signal reports will be implemented in Phase 08."
      status="Saved reports arrive in Phase 08"
      privatePreview
    />
  );
}
