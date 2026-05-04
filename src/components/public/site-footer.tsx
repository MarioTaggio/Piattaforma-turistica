import Link from "next/link";
import {
  Camera,
  Globe,
  MessageCircle,
  MountainSnow,
  Video,
} from "lucide-react";

const COLUMNS = [
  {
    heading: "Esplora",
    links: [
      { href: "/eventi", label: "Eventi" },
      { href: "/bnb", label: "B&B" },
      { href: "/ristoranti", label: "Ristoranti" },
      { href: "/shop", label: "Shop" },
    ],
  },
  {
    heading: "Scopri",
    links: [
      { href: "/videolezioni", label: "Video lezioni" },
      { href: "/infopoint", label: "Info point" },
      { href: "/virtual-tour", label: "Virtual tour" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Accedi" },
      { href: "/register", label: "Registrati" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-700 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-white"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-white/15 text-white">
                <MountainSnow className="size-5" strokeWidth={2.25} />
              </span>
              Piattaforma Turistica
            </Link>
            <p className="max-w-sm text-sm text-white/75">
              Tutto quello che ti serve per esplorare il territorio: eventi,
              soggiorni, ristoranti, esperienze digitali e visite guidate.
            </p>
            <div className="flex gap-2">
              {[
                { Icon: Globe, label: "Sito web", href: "#" },
                { Icon: Camera, label: "Galleria", href: "#" },
                { Icon: MessageCircle, label: "Contattaci", href: "#" },
                { Icon: Video, label: "Video", href: "#" },
              ].map(({ Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/85 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Piattaforma Turistica. Tutti i diritti riservati.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white">Privacy</Link>
            <Link href="#" className="hover:text-white">Termini</Link>
            <Link href="#" className="hover:text-white">Cookie</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
