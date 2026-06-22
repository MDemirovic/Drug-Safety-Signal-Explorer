import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/login(.*)",
    "/register(.*)",
    "/account(.*)",
    "/dashboard(.*)",
    "/admin(.*)",
    "/(api|trpc)(.*)",
  ],
};
