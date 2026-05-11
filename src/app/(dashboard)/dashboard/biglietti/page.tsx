import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Ticket, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

import { BigliettiView } from "./_components/biglietti-view";

export const metadata: Metadata = {
  title: "I miei biglietti — Piattaforma Turistica",
};

type BigliettoRow = {
  id: string;
  codice: string;
  stato: string;
  prezzo_pagato_cents: number;
  created_at: string;
  utilizzato_at: string | null;
  evento_id: string;
  eventi: {
    titolo: string;
    descrizione: string | null;
    data_inizio: string;
    data_fine: string;
    luogo: string;
    citta: string | null;
    immagine_url: string | null;
  } | null;
};

export default async function BigliettiPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const tTicket = await getTranslations("ticket");

  const { data } = await supabase
    .from("biglietti")
    .select(
      `id, codice, stato, prezzo_pagato_cents, created_at, utilizzato_at,
       evento_id,
       eventi ( titolo, descrizione, data_inizio, data_fine, luogo, citta, immagine_url )`,
    )
    .eq("utente_id", user.id)
    .order("created_at", { ascending: false });

  const biglietti = (data ?? []) as unknown as BigliettoRow[];

  const qrDataUrls = await Promise.all(
    biglietti.map((b) =>
      QRCode.toDataURL(b.codice, {
        margin: 1,
        width: 200,
        color: { dark: "#1B4332", light: "#FFFFFF" },
      }),
    ),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={tTicket("title")}
        subtitle={tTicket("subtitle")}
      />

      {biglietti.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={tTicket("noTickets")}
          description={tTicket("subtitle")}
          action={
            <Button
              render={<Link href="/eventi" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Compass className="mr-1.5 size-4" />
              {tTicket("exploreEvents")}
            </Button>
          }
        />
      ) : (
        <BigliettiView
          biglietti={biglietti.map((b, i) => ({
            id: b.id,
            codice: b.codice,
            stato: b.stato,
            prezzo_pagato_cents: b.prezzo_pagato_cents,
            evento: b.eventi
              ? {
                  titolo: b.eventi.titolo,
                  data_inizio: b.eventi.data_inizio,
                  luogo: b.eventi.luogo,
                  citta: b.eventi.citta,
                  immagine_url: b.eventi.immagine_url,
                }
              : null,
            qrDataUrl: qrDataUrls[i]!,
          }))}
        />
      )}
    </div>
  );
}
