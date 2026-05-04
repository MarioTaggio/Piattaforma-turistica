import { LogOut } from "lucide-react";

import { SiteLogo } from "@/components/shared/site-logo";
import { signOut } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/dal";
import type { UserContentCounts } from "@/lib/auth/user-content";

import { SidebarNav, type NavItem, type NavSection } from "./sidebar-nav";
import { DownloadAppCard } from "./download-app-card";

function buildSections(
  user: SessionUser,
  counts: UserContentCounts,
): NavSection[] {
  const has = (...roles: SessionUser["roles"]) =>
    user.roles.includes("admin") || roles.some((r) => user.roles.includes(r));

  // ─────────────────────────────────────────────────────────────────────────
  // Generale (sempre visibile). Niente "Esplora il sito" qui: link al sito
  // pubblico è nel dropdown del nome utente nell'header.
  // ─────────────────────────────────────────────────────────────────────────
  const generale: NavSection = {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    ],
  };

  // ─────────────────────────────────────────────────────────────────────────
  // "Il mio account" — visibile a CHIUNQUE abbia contenuti utente, anche
  // admin e gestori. Profilo NON è qui: accessibile solo dal dropdown del
  // nome utente nell'header (richiesta esplicita per ridurre rumore sidebar).
  // ─────────────────────────────────────────────────────────────────────────
  const accountChildren: NavItem[] = [];
  if (counts.biglietti > 0)
    accountChildren.push({
      label: "I miei biglietti",
      href: "/dashboard/biglietti",
      icon: "biglietti",
    });
  if (counts.prenotazioniBnb > 0)
    accountChildren.push({
      label: "I miei soggiorni",
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.prenotazioniTavolo > 0)
    accountChildren.push({
      label: "Le mie prenotazioni",
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.prenotazioniVisita > 0)
    accountChildren.push({
      label: "Le mie visite",
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.ordiniShop > 0 || counts.ordiniRistorante > 0)
    accountChildren.push({
      label: "I miei ordini",
      href: "/dashboard/ordini",
      icon: "ordini",
    });
  if (counts.videoAcquistati > 0)
    accountChildren.push({
      label: "I miei corsi",
      href: "/dashboard/miei-video",
      icon: "corsi",
    });
  // Dedup per href (le 3 voci prenotazioni puntano tutte alla stessa pagina).
  const accountChildrenDedup = accountChildren.filter(
    (item, i, arr) => arr.findIndex((x) => x.href === item.href) === i,
  );

  const accountSection: NavSection = {
    heading: "Il mio account",
    items: [
      {
        label: "Account",
        href: "/dashboard/profilo",
        icon: "profilo",
        children: accountChildrenDedup,
      },
    ],
  };

  // ─────────────────────────────────────────────────────────────────────────
  // "Le tue gestioni" (un'entry per ruolo gestore)
  // ─────────────────────────────────────────────────────────────────────────
  const gestioniItems: NavItem[] = [];
  if (has("gestore_eventi")) {
    gestioniItems.push({
      label: "Gestione Eventi",
      href: "/dashboard/eventi",
      icon: "eventi",
      children: [
        { label: "I miei eventi", href: "/dashboard/eventi", icon: "eventi" },
      ],
    });
  }
  if (has("gestore_bnb")) {
    gestioniItems.push({
      label: "Gestione B&B",
      href: "/dashboard/bnb",
      icon: "bnb",
      children: [
        { label: "Le mie strutture", href: "/dashboard/bnb", icon: "bnb" },
      ],
    });
  }
  if (has("gestore_ristorante")) {
    gestioniItems.push({
      label: "Gestione Ristoranti",
      href: "/dashboard/ristoranti",
      icon: "ristoranti",
      children: [
        {
          label: "I miei ristoranti",
          href: "/dashboard/ristoranti",
          icon: "ristoranti",
        },
      ],
    });
  }
  if (has("gestore_shop")) {
    gestioniItems.push({
      label: "Gestione Shop",
      href: "/dashboard/shop",
      icon: "shop",
      children: [
        { label: "I miei shop", href: "/dashboard/shop", icon: "shop" },
      ],
    });
  }
  if (has("gestore_video")) {
    gestioniItems.push({
      label: "Gestione Video",
      href: "/dashboard/video",
      icon: "video",
      children: [
        { label: "I miei corsi", href: "/dashboard/video", icon: "corsi" },
      ],
    });
  }
  if (has("gestore_infopoint")) {
    gestioniItems.push({
      label: "Gestione Infopoint",
      href: "/dashboard/infopoint",
      icon: "infopoint",
      children: [
        {
          label: "Le mie attrazioni",
          href: "/dashboard/infopoint",
          icon: "infopoint",
        },
      ],
    });
  }

  const gestioniSection: NavSection | null = gestioniItems.length
    ? { heading: "Le tue gestioni", items: gestioniItems }
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Amministrazione (admin) — categoria singola con sub-tree
  // ─────────────────────────────────────────────────────────────────────────
  let adminSection: NavSection | null = null;
  if (user.roles.includes("admin")) {
    adminSection = {
      heading: "Amministrazione",
      items: [
        {
          label: "Amministrazione",
          href: "/dashboard/admin",
          icon: "panoramica",
          children: [
            {
              label: "Panoramica",
              href: "/dashboard/admin",
              icon: "panoramica",
            },
            {
              label: "Utenti",
              href: "/dashboard/admin/utenti",
              icon: "utenti",
            },
            {
              label: "Gestori",
              href: "/dashboard/admin/gestori",
              icon: "gestori",
            },
            {
              label: "Contenuti",
              href: "/dashboard/admin/eventi",
              icon: "panoramica",
              children: [
                {
                  label: "Eventi",
                  href: "/dashboard/admin/eventi",
                  icon: "eventi",
                },
                { label: "B&B", href: "/dashboard/admin/bnb", icon: "bnb" },
                {
                  label: "Ristoranti",
                  href: "/dashboard/admin/ristoranti",
                  icon: "ristoranti",
                },
                {
                  label: "Shop",
                  href: "/dashboard/admin/shop",
                  icon: "shop",
                },
                {
                  label: "Video",
                  href: "/dashboard/admin/video",
                  icon: "video",
                },
                {
                  label: "Infopoint",
                  href: "/dashboard/admin/infopoint",
                  icon: "infopoint",
                },
              ],
            },
            {
              label: "Transazioni",
              href: "/dashboard/admin/prenotazioni",
              icon: "ordini",
              children: [
                {
                  label: "Prenotazioni",
                  href: "/dashboard/admin/prenotazioni",
                  icon: "prenotazioni",
                },
                {
                  label: "Ordini",
                  href: "/dashboard/admin/ordini",
                  icon: "ordini",
                },
                {
                  label: "Biglietti",
                  href: "/dashboard/admin/biglietti",
                  icon: "biglietti",
                },
              ],
            },
            {
              label: "Analytics",
              href: "/dashboard/admin/analytics",
              icon: "analytics",
            },
            {
              label: "Impostazioni",
              href: "/dashboard/admin/impostazioni",
              icon: "impostazioni",
            },
          ],
        },
      ],
    };
  }

  return [
    generale,
    accountSection,
    ...(gestioniSection ? [gestioniSection] : []),
    ...(adminSection ? [adminSection] : []),
  ];
}

export function Sidebar({
  user,
  counts,
}: {
  user: SessionUser;
  counts: UserContentCounts;
}) {
  const sections = buildSections(user, counts);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 lg:flex">
      <div className="px-1">
        <SiteLogo />
      </div>

      <div className="mt-8 flex-1 overflow-y-auto pr-1">
        <SidebarNav sections={sections} />
      </div>

      <div className="mt-6 space-y-3">
        <DownloadAppCard />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4 text-muted-foreground" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
