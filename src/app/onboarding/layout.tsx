import type { ReactNode } from "react";

import { SiteLogo } from "@/components/shared/site-logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <SiteLogo />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">{children}</main>
    </div>
  );
}
