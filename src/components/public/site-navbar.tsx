import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";

import { getSessionUser } from "@/lib/auth/dal";
import { SiteLogo } from "@/components/shared/site-logo";
import { Button } from "@/components/ui/button";

import { MobileMenu } from "./mobile-menu";
import { CartLink } from "./cart-link";
import { NAV_LINKS } from "./nav-links";

export async function SiteNavbar() {
  const user = await getSessionUser();
  const initials = user
    ? ((user.nome ?? user.email)[0] ?? "?").toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <SiteLogo />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/80 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartLink />
          {user ? (
            <Button
              size="sm"
              className="hidden rounded-xl bg-brand-600 hover:bg-brand-700 sm:inline-flex"
              render={<Link href="/dashboard" />}
            >
              <LayoutDashboard className="mr-1.5 size-4" />
              Dashboard
            </Button>
          ) : (
            <Button
              size="sm"
              className="hidden rounded-xl bg-brand-600 hover:bg-brand-700 sm:inline-flex"
              render={<Link href="/login" />}
            >
              <LogIn className="mr-1.5 size-4" />
              Accedi
            </Button>
          )}
          {user && (
            <Link
              href="/dashboard"
              aria-label="Area personale"
              className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
            >
              {initials}
            </Link>
          )}
          <MobileMenu loggedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
