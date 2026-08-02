import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { isAdminEmail } from "@/lib/auth/config";

export class AdminAccessError extends Error {
  constructor() {
    super("Administrator access is required.");
    this.name = "AdminAccessError";
  }
}

export async function requireAdminUser() {
  const { userId } = await auth();
  if (!userId) throw new AdminAccessError();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!isAdminEmail(email)) throw new AdminAccessError();
  return { userId, email: email! };
}
