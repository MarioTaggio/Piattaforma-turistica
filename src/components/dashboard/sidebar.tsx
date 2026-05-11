import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SiteLogo } from "@/components/shared/site-logo";
import { signOut } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/dal";
import type { UserContentCounts } from "@/lib/auth/user-content";
import type { GestoreBookingsFlags } from "@/lib/auth/gestore-bookings";

import { SidebarNav, type NavItem, type NavSection } from "./sidebar-nav";
import { DownloadAppCard } from "./download-app-card";

type T = (key: string) => string;

function buildSections(
  user: SessionUser,
  counts: UserContentCounts,
  bookingsFlags: GestoreBookingsFlags,
  t: T,
): NavSection[] {
  const has = (...roles: SessionUser["roles"]) =>
    user.roles.includes("admin") || roles.some((r) => user.roles.includes(r));

  // ─────────────────────────────────────────────────────────────────────────
  // Generale (sempre visibile). Niente "Esplora il sito" qui: link al sito
  // pubblico è nel dropdown del nome utente nell'header.
  // ─────────────────────────────────────────────────────────────────────────
  const generale: NavSection = {
    items: [
      { label: t("dashboard"), href: "/dashboard", icon: "dashboard" },
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
      label: t("myTickets"),
      href: "/dashboard/biglietti",
      icon: "biglietti",
    });
  if (counts.prenotazioniBnb > 0)
    accountChildren.push({
      label: t("myStays"),
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.prenotazioniTavolo > 0)
    accountChildren.push({
      label: t("myBookings"),
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.prenotazioniVisita > 0)
    accountChildren.push({
      label: t("myVisits"),
      href: "/dashboard/prenotazioni",
      icon: "prenotazioni",
    });
  if (counts.ordiniShop > 0 || counts.ordiniRistorante > 0)
    accountChildren.push({
      label: t("myOrders"),
      href: "/dashboard/ordini",
      icon: "ordini",
    });
  if (counts.videoAcquistati > 0)
    accountChildren.push({
      label: t("myCourses"),
      href: "/dashboard/miei-video",
      icon: "corsi",
    });
  // Dedup per href (le 3 voci prenotazioni puntano tutte alla stessa pagina).
  const accountChildrenDedup = accountChildren.filter(
    (item, i, arr) => arr.findIndex((x) => x.href === item.href) === i,
  );

  const accountSection: NavSection = {
    heading: t("myAccount"),
    items: [
      {
        label: t("account"),
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
    const eventiChildren: NavItem[] = [
      { label: t("myEvents"), href: "/dashboard/eventi", icon: "eventi" },
    ];
    if (bookingsFlags.eventi)
      eventiChildren.push({
        label: t("prenotazioni"),
        href: "/dashboard/eventi",
        icon: "prenotazioni",
      });
    gestioniItems.push({
      label: t("gestioneEventi"),
      href: "/dashboard/eventi",
      icon: "eventi",
      children: eventiChildren,
    });
  }
  if (has("gestore_bnb")) {
    const bnbChildren: NavItem[] = [
      { label: t("myStructures"), href: "/dashboard/bnb", icon: "bnb" },
    ];
    if (bookingsFlags.bnb)
      bnbChildren.push({
        label: t("prenotazioni"),
        href: "/dashboard/bnb",
        icon: "prenotazioni",
      });
    gestioniItems.push({
      label: t("gestioneBnb"),
      href: "/dashboard/bnb",
      icon: "bnb",
      children: bnbChildren,
    });
  }
  if (has("gestore_ristorante")) {
    const ristChildren: NavItem[] = [
      {
        label: t("myRestaurants"),
        href: "/dashboard/ristoranti",
        icon: "ristoranti",
      },
    ];
    if (bookingsFlags.ristoranti)
      ristChildren.push({
        label: t("prenotazioni"),
        href: "/dashboard/ristoranti",
        icon: "prenotazioni",
      });
    gestioniItems.push({
      label: t("gestioneRistoranti"),
      href: "/dashboard/ristoranti",
      icon: "ristoranti",
      children: ristChildren,
    });
  }
  if (has("gestore_shop")) {
    gestioniItems.push({
      label: t("gestioneShop"),
      href: "/dashboard/shop",
      icon: "shop",
      children: [
        { label: t("myShops"), href: "/dashboard/shop", icon: "shop" },
      ],
    });
  }
  if (has("gestore_video")) {
    gestioniItems.push({
      label: t("gestioneVideo"),
      href: "/dashboard/video",
      icon: "video",
      children: [
        { label: t("myCourses"), href: "/dashboard/video", icon: "corsi" },
      ],
    });
  }
  if (has("gestore_infopoint")) {
    gestioniItems.push({
      label: t("gestioneInfopoint"),
      href: "/dashboard/infopoint",
      icon: "infopoint",
      children: [
        {
          label: t("myAttractions"),
          href: "/dashboard/infopoint",
          icon: "infopoint",
        },
      ],
    });
  }

  const gestioniSection: NavSection | null = gestioniItems.length
    ? { heading: t("management"), items: gestioniItems }
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Amministrazione (admin) — categoria singola con sub-tree
  // ─────────────────────────────────────────────────────────────────────────
  let adminSection: NavSection | null = null;
  if (user.roles.includes("admin")) {
    adminSection = {
      heading: t("administration"),
      items: [
        {
          label: t("administration"),
          href: "/dashboard/admin",
          icon: "panoramica",
          children: [
            {
              label: t("panoramica"),
              href: "/dashboard/admin",
              icon: "panoramica",
            },
            {
              label: t("utenti"),
              href: "/dashboard/admin/utenti",
              icon: "utenti",
            },
            {
              label: t("gestori"),
              href: "/dashboard/admin/gestori",
              icon: "gestori",
            },
            {
              label: t("contenuti"),
              href: "/dashboard/admin/eventi",
              icon: "panoramica",
              children: [
                {
                  label: t("eventi"),
                  href: "/dashboard/admin/eventi",
                  icon: "eventi",
                },
                { label: t("bnb"), href: "/dashboard/admin/bnb", icon: "bnb" },
                {
                  label: t("ristoranti"),
                  href: "/dashboard/admin/ristoranti",
                  icon: "ristoranti",
                },
                {
                  label: t("shop"),
                  href: "/dashboard/admin/shop",
                  icon: "shop",
                },
                {
                  label: t("video"),
                  href: "/dashboard/admin/video",
                  icon: "video",
                },
                {
                  label: t("infopoint"),
                  href: "/dashboard/admin/infopoint",
                  icon: "infopoint",
                },
              ],
            },
            {
              label: t("transazioni"),
              href: "/dashboard/admin/prenotazioni",
              icon: "ordini",
              children: [
                {
                  label: t("prenotazioni"),
                  href: "/dashboard/admin/prenotazioni",
                  icon: "prenotazioni",
                },
                {
                  label: t("ordini"),
                  href: "/dashboard/admin/ordini",
                  icon: "ordini",
                },
                {
                  label: t("biglietti"),
                  href: "/dashboard/admin/biglietti",
                  icon: "biglietti",
                },
              ],
            },
            {
              label: t("analytics"),
              href: "/dashboard/admin/analytics",
              icon: "analytics",
            },
            {
              label: t("settings"),
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

export async function Sidebar({
  user,
  counts,
  bookingsFlags,
}: {
  user: SessionUser;
  counts: UserContentCounts;
  bookingsFlags: GestoreBookingsFlags;
}) {
  const t = await getTranslations("dashboard");
  const sections = buildSections(user, counts, bookingsFlags, t);

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
            {t("logout")}
          </button>
        </form>
      </div>
    </aside>
  );
}
