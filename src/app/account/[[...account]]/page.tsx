import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function AccountPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/account" });
  }

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="page-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mb-8">
          <p className="eyebrow">Account & security</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
            Manage your profile and password.
          </h1>
        </div>
        <UserProfile
          routing="path"
          path="/account"
          appearance={{
            variables: {
              colorPrimary: "#0da691",
              colorForeground: "#263653",
              colorBackground: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-dm-sans), sans-serif",
            },
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full border border-[var(--line)] shadow-none",
              navbarButton: "text-[var(--text)]",
              profileSectionPrimaryButton: "text-[var(--signal-dark)]",
            },
          }}
        />
      </div>
    </main>
  );
}
