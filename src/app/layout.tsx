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
const DEFAULT_FAVICON = "/favicon.ico";

// Estensioni che il browser sa interpretare come favicon. Per logo .webp o
// formati esotici torniamo al .ico statico per evitare icone rotte.
const FAVICON_EXT = /\.(png|svg|ico|jpg|jpeg)(\?.*)?$/i;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("site_nome, site_descrizione, site_logo_url")
    .eq("id", 1)
    .maybeSingle();

  const row = (data ?? {}) as {
    site_nome?: string | null;
    site_descrizione?: string | null;
    site_logo_url?: string | null;
  };

  const logoUrl = row.site_logo_url?.trim() || null;
  const favicon =
    logoUrl && FAVICON_EXT.test(logoUrl) ? logoUrl : DEFAULT_FAVICON;

  return {
    title: row.site_nome?.trim() || DEFAULT_TITLE,
    description: row.site_descrizione?.trim() || DEFAULT_DESCRIPTION,
    icons: { icon: favicon },
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
