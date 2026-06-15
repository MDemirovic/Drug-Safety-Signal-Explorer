import { redirect } from "next/navigation";

import { PlaceholderPage } from "@/components/placeholder-page";
import { isAdminEmail } from "@/lib/auth/config";
import { getCurrentSession } from "@/lib/auth/session";

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?next=/admin");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return (
    <PlaceholderPage
      eyebrow="Administration"
      title="Cache and logs control room."
      description="The admin route exists now as a stable placeholder. Access controls, cached snapshot inspection, refresh tools, and request logs will be added in their planned phases."
      status="Admin tools arrive in Phase 12"
      privatePreview
    />
  );
}
