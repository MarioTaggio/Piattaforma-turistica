import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/dal";
import { SiteLogo } from "@/components/shared/site-logo";
import { Toaster } from "@/components/ui/sonner";

// Auth pages — bounce already-authenticated users to /dashboard.
// Warm gradient background, centered card, mobile-first.
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-white to-emerald-50">
      {/* Decorative blurred blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <SiteLogo />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:pt-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <Toaster richColors position="top-center" />
    </div>
  );
}
