"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileEdit,
  Hotel,
  Mail,
  MapPin,
  Package,
  PlayCircle,
  ScanLine,
  ShoppingBag,
  Sofa,
  Ticket,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Icone disponibili come stringa: il client fa il lookup. I componenti React
// non possono essere serializzati attraverso il boundary server→client.
const TAB_ICONS = {
  analytics: BarChart3,
  agenda: CalendarClock,
  calendario: CalendarDays,
  prenotazioni: ClipboardList,
  dettaglio: FileEdit,
  hotel: Hotel,
  comunicazioni: Mail,
  visite: MapPin,
  catalogo: Package,
  lezioni: PlayCircle,
  ordini: ShoppingBag,
  tavoli: Sofa,
  biglietti: Ticket,
  iscritti: Users,
  menu: UtensilsCrossed,
  scanner: ScanLine,
} as const;

export type TabIconName = keyof typeof TAB_ICONS;

export type TabItem = {
  label: string;
  href: string;
  icon?: TabIconName;
  // Quando true, tab attivo solo su match esatto. Default: anche su sub-paths.
  exact?: boolean;
  badge?: string | number;
};

type Props = {
  tabs: TabItem[];
  className?: string;
};

export function TabsNav({ tabs, className }: Props) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-6 mb-6 overflow-x-auto border-b border-border bg-background/95 px-6 backdrop-blur lg:-mx-10 lg:px-10",
        className,
      )}
    >
      <nav className="flex min-w-max items-center gap-1" aria-label="Sezioni">
        {tabs.map((t) => {
          const isActive = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon: LucideIcon | undefined = t.icon
            ? TAB_ICONS[t.icon]
            : undefined;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-brand-700"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {Icon && <Icon className="size-4" />}
              {t.label}
              {t.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-brand-100 text-brand-700"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.badge}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-600"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
