import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

import { SiteLogo } from "@/components/shared/site-logo";

const SOCIALS = [
  {
    Icon: FaInstagram,
    label: "Instagram BorghiON",
    href: "https://www.instagram.com/borghion.it/",
  },
  {
    Icon: FaFacebook,
    label: "Facebook BorghiON",
    href: "https://www.facebook.com/profile.php?id=61589242067927",
  },
  {
    Icon: FaTiktok,
    label: "TikTok BorghiON",
    href: "https://www.tiktok.com/@borghion",
  },
  {
    Icon: FaYoutube,
    label: "YouTube BorghiON",
    href: "https://www.youtube.com/@BorghiONN",
  },
];

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

export async function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-700 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <SiteLogo className="text-white" />
            <p className="max-w-sm text-sm text-white/75">
              Tutto quello che ti serve per esplorare il territorio: eventi,
              soggiorni, ristoranti, esperienze digitali e visite guidate.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon className="size-5" />
                </a>
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

        <div className="mt-8 border-t border-white/20 pt-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex flex-shrink-0 items-center gap-4">
              <Image
                src="/loghi-eu.svg"
                alt="Loghi UE NextGenerationEU PNRR"
                width={300}
                height={60}
                className="h-12 w-auto"
              />
            </div>
            <div className="text-xs leading-relaxed text-white/80">
              <p className="mb-1 font-semibold text-white">
                Progetto finanziato dall&apos;Unione europea – NextGenerationEU
              </p>
              <p>PNRR – M1C3 Investimento 2.1 Linea C</p>
              <p>Codice progetto: BRG0001867</p>
              <p>CUP: C15H23004870001</p>
              <p>COR: 24525186</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} BorghiON. Tutti i diritti riservati.</span>
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
