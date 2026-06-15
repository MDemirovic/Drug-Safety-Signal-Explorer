import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-page";
import { getCurrentSession } from "@/lib/auth/session";

export default async function RegisterPage() {
  if (await getCurrentSession()) {
    redirect("/");
  }

  return <AuthPage mode="register" />;
}
