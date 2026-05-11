import Link from "next/link";
import { LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getSessionUser } from "@/lib/auth/dal";
import { SiteLogo } from "@/components/shared/site-logo";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";

import { MobileMenu } from "./mobile-menu";
import { CartLink } from "./cart-link";
import { NAV_LINKS } from "./nav-links";
import { UserMenu } from "./user-menu";

export async function SiteNavbar() {
  const user = await getSessionUser();
  const t = await getTranslations("nav");

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
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="full" align="right" />
          <CartLink />
          {user ? (
            <UserMenu
              user={{
                email: user.email,
                nome: user.nome,
                cognome: user.cognome,
                avatar_url: user.avatar_url,
              }}
            />
          ) : (
            <Button
              size="sm"
              className="hidden rounded-xl bg-brand-600 hover:bg-brand-700 sm:inline-flex"
              render={<Link href="/login" />}
            >
              <LogIn className="mr-1.5 size-4" />
              {t("login")}
            </Button>
          )}
          <MobileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
