import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-page";

export default async function RegisterPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return <AuthPage mode="register" />;
}
