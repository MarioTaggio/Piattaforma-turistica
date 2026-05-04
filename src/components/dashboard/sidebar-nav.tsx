"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Compass,
  GraduationCap,
  Hotel,
  Landmark,
  LayoutDashboard,
  Mail,
  PlayCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  UserCircle,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  esplora: Compass,
  eventi: CalendarDays,
  bnb: Hotel,
  ristoranti: UtensilsCrossed,
  video: PlayCircle,
  infopoint: Landmark,
  utenti: Users,
  biglietti: Ticket,
  prenotazioni: ClipboardList,
  ordini: ShoppingBag,
  corsi: GraduationCap,
  impostazioni: Settings,
  profilo: UserCircle,
  panoramica: ShieldCheck,
  gestori: UserCog,
  shop: Store,
  analytics: BarChart3,
  comunicazioni: Mail,
} as const;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  badge?: number;
  children?: NavItem[];
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          {section.heading && (
            <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {section.heading}
            </h3>
          )}
          {section.items.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} depth={0} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function isActiveHref(href: string, pathname: string) {
  // /dashboard e /dashboard/admin sono link panoramica: highlight solo su match esatto.
  const exactOnly = href === "/dashboard" || href === "/dashboard/admin";
  return (
    pathname === href || (!exactOnly && pathname.startsWith(`${href}/`))
  );
}

function hasActiveChild(item: NavItem, pathname: string): boolean {
  if (!item.children) return false;
  return item.children.some(
    (c) => isActiveHref(c.href, pathname) || hasActiveChild(c, pathname),
  );
}

function NavRow({
  item,
  pathname,
  depth,
}: {
  item: NavItem;
  pathname: string;
  depth: number;
}) {
  const Icon: LucideIcon = ICONS[item.icon];
  const isActive = isActiveHref(item.href, pathname);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const childActive = hasChildren && hasActiveChild(item, pathname);

  // Categorie con figli: aperto di default se contiene un attivo, altrimenti
  // chiuso. Lo stato si mantiene con useState, ma sincronizziamo se il
  // pathname cambia e ora un figlio è attivo.
  const initialOpen = useMemo(
    () => isActive || childActive,
    [isActive, childActive],
  );
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  // Categorie (con figli): il "row" diventa un toggle, NON un Link, così non
  // navighi quando vuoi solo espandere. L'href punta alla landing della
  // categoria — se l'utente vuole aprirla, può cliccare un sotto-link.
  // (Eccezione: alcune categorie hanno un link "panoramica" nel primo figlio.)
  if (hasChildren) {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            childActive
              ? "bg-brand-50 text-brand-700"
              : "text-foreground/70 hover:bg-muted hover:text-foreground",
            depth > 0 && "ml-3",
          )}
        >
          <Icon
            className={cn(
              "size-4 shrink-0",
              childActive ? "text-brand-600" : "text-muted-foreground",
            )}
            strokeWidth={childActive ? 2.25 : 2}
          />
          <span className="flex-1 truncate text-left">{item.label}</span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </button>
        {open && item.children && (
          <ul
            className={cn(
              "mt-1 flex flex-col gap-0.5 border-l border-sidebar-border/60 py-0.5 pl-2",
              depth === 0 ? "ml-5" : "ml-4",
            )}
          >
            {item.children.map((c) => (
              <li key={c.href}>
                <NavRow item={c} pathname={pathname} depth={depth + 1} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Foglie: Link normale.
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        isActive
          ? "bg-brand-50 text-brand-700"
          : "text-foreground/70 hover:bg-muted hover:text-foreground",
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600"
          style={{ background: "#1B4332" }}
        />
      )}
      <Icon
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-brand-600" : "text-muted-foreground",
        )}
        strokeWidth={isActive ? 2.25 : 2}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span
          className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: "#1B4332" }}
          aria-label={`${item.badge} non lette`}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}
