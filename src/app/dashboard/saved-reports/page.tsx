import { auth } from "@clerk/nextjs/server";

import { PlaceholderPage } from "@/components/placeholder-page";

export default async function SavedReportsPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({
      returnBackUrl: "/dashboard/saved-reports",
    });
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
