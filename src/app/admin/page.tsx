import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PlaceholderPage } from "@/components/placeholder-page";
import { isAdminEmail } from "@/lib/auth/config";

export default async function AdminPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/admin" });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!isAdminEmail(email)) {
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
