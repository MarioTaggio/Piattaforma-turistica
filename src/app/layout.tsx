import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { createAdminClient } from "@/lib/supabase/admin";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const DEFAULT_TITLE = "Piattaforma Turistica";
const DEFAULT_DESCRIPTION =
  "Eventi, B&B, ristoranti, video corsi e tour virtuali in un'unica piattaforma.";
// Fallback brand mark (MountainSnow su sfondo brand-600). Stesso glyph
// usato nella sidebar/header. È un SVG statico in /public; non viene messo
// in src/app/ perché lì verrebbe auto-iniettato da Next.js, scavalcando le
// icons restituite da generateMetadata().
const DEFAULT_FAVICON = "/brand-icon.svg";

// Estensioni che il browser sa interpretare come favicon. Per logo .webp o
// formati esotici torniamo al .ico statico per evitare icone rotte.
const FAVICON_EXT = /\.(png|svg|ico|jpg|jpeg)(\?.*)?$/i;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("site_nome, site_descrizione, site_logo_url, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const row = (data ?? {}) as {
    site_nome?: string | null;
    site_descrizione?: string | null;
    site_logo_url?: string | null;
    updated_at?: string | null;
  };

  const logoUrl = row.site_logo_url?.trim() || null;
  // Cache buster legato a updated_at: cambia solo quando l'admin tocca le
  // impostazioni, evitando il re-download della favicon a ogni page-load ma
  // forzando il refresh appena il logo viene cambiato.
  const cacheKey = row.updated_at
    ? new Date(row.updated_at).getTime()
    : Date.now();
  const favicon =
    logoUrl && FAVICON_EXT.test(logoUrl)
      ? `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${cacheKey}`
      : DEFAULT_FAVICON;

  return {
    title: row.site_nome?.trim() || DEFAULT_TITLE,
    description: row.site_descrizione?.trim() || DEFAULT_DESCRIPTION,
    icons: {
      icon: favicon,
      apple: favicon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
