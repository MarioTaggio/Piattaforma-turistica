"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserEmail,
  notifyGestoreNuovaPrenotazione,
  notifyUtenteNuovaPrenotazione,
} from "@/lib/notifications/booking-events";
import { sendGestoreNotificationEmail } from "@/lib/resend/gestore-notification";

const eurFmt = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    (cents ?? 0) / 100,
  );

type Result = { error?: string; success?: true; redirectTo?: string };

// Carica le traduzioni del namespace "errors" usando il cookie locale
// corrente (gestito da i18n/request.ts). Una sola istanza per chiamata
// di action: chi serve errori multipli può inoltrarla.
async function tErrors() {
  return getTranslations("errors");
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ──────────────────────────────────────────────────────────────────────────
// Biglietti eventi
// ──────────────────────────────────────────────────────────────────────────
export type IntestatarioBiglietto = {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
};

export async function acquistaBiglietto(
  eventoId: string,
  intestatario?: IntestatarioBiglietto | null,
): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { redirectTo: `/login?next=/eventi/${eventoId}` };

  const admin = createAdminClient();

  const { data: evento, error: eErr } = await admin
    .from("eventi")
    .select("id, prezzo_cents, posti_disponibili, stato")
    .eq("id", eventoId)
    .single();
  const t = await tErrors();
  if (eErr || !evento) return { error: t("eventUnavailable") };
  const ev = evento as { prezzo_cents: number; posti_disponibili: number; stato: string };
  if (ev.stato !== "pubblicato") return { error: t("eventUnavailable") };
  if (ev.posti_disponibili < 1) return { error: t("eventSoldOut") };

  // Optimistic posti decrement guarded by current value to prevent oversell.
  const { error: updErr } = await admin
    .from("eventi")
    .update({ posti_disponibili: ev.posti_disponibili - 1 })
    .eq("id", eventoId)
    .eq("posti_disponibili", ev.posti_disponibili);
  if (updErr) return { error: t("seatNoLongerAvailable") };

  const { error: insErr } = await admin.from("biglietti").insert({
    evento_id: eventoId,
    utente_id: userId,
    prezzo_pagato_cents: ev.prezzo_cents,
    stato: "valido",
    intestatario_nome: intestatario?.nome ?? null,
    intestatario_cognome: intestatario?.cognome ?? null,
    intestatario_email: intestatario?.email ?? null,
    intestatario_telefono: intestatario?.telefono ?? null,
  });
  if (insErr) {
    // Rollback the seat counter.
    await admin
      .from("eventi")
      .update({ posti_disponibili: ev.posti_disponibili })
      .eq("id", eventoId);
    return { error: insErr.message };
  }

  const { data: ev2 } = await admin
    .from("eventi")
    .select("titolo, gestore_id, posti_disponibili")
    .eq("id", eventoId)
    .single();
  if (ev2) {
    const e = ev2 as {
      titolo: string;
      gestore_id: string;
      posti_disponibili: number;
    };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: e.gestore_id,
      modulo: "Evento",
      riferimento: `${e.titolo} — biglietto venduto`,
      link: `/dashboard/eventi/${eventoId}/prenotazioni`,
    });

    await notifyUtenteNuovaPrenotazione({
      userId,
      email: intestatario?.email ?? (await getUserEmail(userId)),
      modulo: "Evento",
      riferimento: e.titolo,
      link: "/dashboard/biglietti",
    });

    // Recupera codice biglietto appena creato per includerlo nell'email.
    const { data: big } = await admin
      .from("biglietti")
      .select("codice, created_at")
      .eq("evento_id", eventoId)
      .eq("utente_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const b = big as { codice: string; created_at: string } | null;

    await sendGestoreNotificationEmail({
      gestoreId: e.gestore_id,
      buyerId: userId,
      modulo: "Evento",
      subject: `Nuovo biglietto venduto — ${e.titolo}`,
      evento: "Nuovo biglietto venduto",
      ctaPath: `/dashboard/eventi/${eventoId}/prenotazioni`,
      dettagli: [
        { label: "Evento", value: e.titolo },
        { label: "Importo pagato", value: eurFmt(ev.prezzo_cents) },
        ...(b
          ? [
              {
                label: "Data acquisto",
                value: new Date(b.created_at).toLocaleString("it-IT"),
              },
              {
                label: "Codice biglietto",
                value: b.codice.slice(0, 8).toUpperCase() + "…",
              },
            ]
          : []),
        { label: "Posti rimasti", value: String(e.posti_disponibili) },
      ],
    });
  }

  revalidatePath(`/eventi/${eventoId}`);
  revalidatePath("/dashboard/biglietti");
  return { success: true, redirectTo: "/dashboard/biglietti" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione B&B
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaCamera(input: {
  cameraId: string;
  strutturaId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  ospiti: number;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/bnb/${input.strutturaId}` };

  const t = await tErrors();
  if (!input.checkIn || !input.checkOut) return { error: t("datesRequired") };
  const ci = new Date(input.checkIn);
  const co = new Date(input.checkOut);
  if (!(co.getTime() > ci.getTime())) return { error: t("invalidDates") };
  if (input.ospiti < 1) return { error: t("atLeastOneGuest") };

  const admin = createAdminClient();
  const { data: camera } = await admin
    .from("camere")
    .select("id, prezzo_notte_cents, capacita, disponibile, struttura_id")
    .eq("id", input.cameraId)
    .single();
  if (!camera) return { error: t("roomNotFound") };
  const c = camera as {
    prezzo_notte_cents: number;
    capacita: number;
    disponibile: boolean;
    struttura_id: string;
  };
  if (!c.disponibile) return { error: t("roomUnavailable") };
  if (input.ospiti > c.capacita)
    return { error: `${t("maxCapacity")} (${c.capacita})` };

  const nights = Math.max(
    1,
    Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const total = nights * c.prezzo_notte_cents;

  const { error: insErr } = await admin.from("prenotazioni_bnb").insert({
    camera_id: input.cameraId,
    utente_id: userId,
    data_check_in: input.checkIn,
    data_check_out: input.checkOut,
    num_ospiti: input.ospiti,
    prezzo_totale_cents: total,
    stato: "in_attesa",
    stato_pagamento: "in_attesa",
  });
  if (insErr) return { error: insErr.message };

  // Notifica al gestore della struttura.
  const { data: struttura } = await admin
    .from("strutture")
    .select("nome, gestore_id")
    .eq("id", input.strutturaId)
    .single();
  if (struttura) {
    const s = struttura as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: s.gestore_id,
      modulo: "B&B",
      riferimento: `${s.nome} (${input.checkIn} → ${input.checkOut}, ${input.ospiti} ospiti)`,
      link: `/dashboard/bnb/${input.strutturaId}/prenotazioni`,
    });

    await notifyUtenteNuovaPrenotazione({
      userId,
      email: await getUserEmail(userId),
      modulo: "B&B",
      riferimento: s.nome,
      quando: `${input.checkIn} → ${input.checkOut}`,
      link: "/dashboard/prenotazioni",
    });

    // Recupera nome camera + telefono ospite per arricchire l'email.
    const [{ data: cam }, { data: buyer }] = await Promise.all([
      admin.from("camere").select("nome").eq("id", input.cameraId).maybeSingle(),
      admin
        .from("users")
        .select("telefono")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    const camNome = (cam as { nome: string } | null)?.nome ?? "Camera";
    const tel = (buyer as { telefono: string | null } | null)?.telefono ?? null;

    await sendGestoreNotificationEmail({
      gestoreId: s.gestore_id,
      buyerId: userId,
      modulo: "B&B",
      subject: `Nuova prenotazione — ${s.nome}`,
      evento: "Nuova prenotazione ricevuta",
      ctaPath: `/dashboard/bnb/${input.strutturaId}/prenotazioni`,
      dettagli: [
        { label: "Struttura", value: s.nome },
        { label: "Camera", value: camNome },
        ...(tel ? [{ label: "Telefono", value: tel }] : []),
        { label: "Check-in", value: input.checkIn },
        { label: "Check-out", value: input.checkOut },
        {
          label: "Ospiti",
          value: `${input.ospiti} ${input.ospiti === 1 ? "persona" : "persone"}`,
        },
        { label: "Totale", value: eurFmt(total) },
      ],
    });
  }

  revalidatePath(`/bnb/${input.strutturaId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione tavolo
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaTavolo(input: {
  ristoranteId: string;
  tavoloId: string;
  dataOra: string; // datetime-local string
  ospiti: number;
  note?: string;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/ristoranti/${input.ristoranteId}` };

  const t = await tErrors();
  if (!input.dataOra) return { error: t("dateTimeRequired") };
  if (input.ospiti < 1) return { error: t("atLeastOneGuest") };

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("prenotazioni_tavolo").insert({
    tavolo_id: input.tavoloId,
    utente_id: userId,
    data_ora: new Date(input.dataOra).toISOString(),
    num_ospiti: input.ospiti,
    stato: "in_attesa",
    note: input.note ?? null,
  });
  if (insErr) return { error: insErr.message };

  const { data: rist } = await admin
    .from("ristoranti")
    .select("nome, gestore_id")
    .eq("id", input.ristoranteId)
    .single();
  if (rist) {
    const r = rist as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: r.gestore_id,
      modulo: "Ristorante",
      riferimento: `${r.nome} — ${new Date(input.dataOra).toLocaleString("it-IT")} (${input.ospiti} ospiti)`,
      link: `/dashboard/ristoranti/${input.ristoranteId}/prenotazioni`,
    });

    await notifyUtenteNuovaPrenotazione({
      userId,
      email: await getUserEmail(userId),
      modulo: "Ristorante",
      riferimento: r.nome,
      quando: new Date(input.dataOra).toLocaleString("it-IT"),
      link: "/dashboard/prenotazioni",
    });

    const [{ data: tav }, { data: buyer }] = await Promise.all([
      admin
        .from("tavoli")
        .select("numero")
        .eq("id", input.tavoloId)
        .maybeSingle(),
      admin.from("users").select("telefono").eq("id", userId).maybeSingle(),
    ]);
    const tavNumero = (tav as { numero: string } | null)?.numero ?? "?";
    const tel = (buyer as { telefono: string | null } | null)?.telefono ?? null;

    await sendGestoreNotificationEmail({
      gestoreId: r.gestore_id,
      buyerId: userId,
      modulo: "Ristorante",
      subject: `Nuova prenotazione tavolo — ${r.nome}`,
      evento: "Nuova prenotazione tavolo",
      ctaPath: `/dashboard/ristoranti/${input.ristoranteId}/prenotazioni`,
      dettagli: [
        { label: "Ristorante", value: r.nome },
        ...(tel ? [{ label: "Telefono", value: tel }] : []),
        {
          label: "Data e ora",
          value: new Date(input.dataOra).toLocaleString("it-IT"),
        },
        {
          label: "Ospiti",
          value: `${input.ospiti} ${input.ospiti === 1 ? "persona" : "persone"}`,
        },
        { label: "Tavolo", value: tavNumero },
        ...(input.note ? [{ label: "Note", value: input.note }] : []),
      ],
    });
  }

  revalidatePath(`/ristoranti/${input.ristoranteId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione visita guidata
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaVisita(input: {
  attrazioneId: string;
  visitaId: string;
  partecipanti: number;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/infopoint/${input.attrazioneId}` };
  if (input.partecipanti < 1) return { error: "Almeno 1 partecipante" };

  const admin = createAdminClient();
  const { data: visita } = await admin
    .from("visite_guidate")
    .select("id, prezzo_cents, posti_disponibili")
    .eq("id", input.visitaId)
    .single();
  const t = await tErrors();
  if (!visita) return { error: t("visitNotFound") };
  const v = visita as { prezzo_cents: number; posti_disponibili: number };
  if (v.posti_disponibili < input.partecipanti)
    return { error: t("notEnoughSeats") };

  const total = v.prezzo_cents * input.partecipanti;
  const { error: updErr } = await admin
    .from("visite_guidate")
    .update({ posti_disponibili: v.posti_disponibili - input.partecipanti })
    .eq("id", input.visitaId)
    .eq("posti_disponibili", v.posti_disponibili);
  if (updErr) return { error: t("seatsNoLongerAvailable") };

  const { error: insErr } = await admin.from("prenotazioni_visita").insert({
    visita_id: input.visitaId,
    utente_id: userId,
    num_partecipanti: input.partecipanti,
    prezzo_totale_cents: total,
    stato: "in_attesa",
    stato_pagamento: "in_attesa",
  });
  if (insErr) {
    await admin
      .from("visite_guidate")
      .update({ posti_disponibili: v.posti_disponibili })
      .eq("id", input.visitaId);
    return { error: insErr.message };
  }

  const { data: attr } = await admin
    .from("attrazioni")
    .select("nome, gestore_id")
    .eq("id", input.attrazioneId)
    .single();
  if (attr) {
    const a = attr as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: a.gestore_id,
      modulo: "Visita guidata",
      riferimento: `${a.nome} — ${input.partecipanti} partecipant${input.partecipanti === 1 ? "e" : "i"}`,
      link: `/dashboard/infopoint/${input.attrazioneId}/prenotazioni`,
    });

    const { data: vis } = await admin
      .from("visite_guidate")
      .select("titolo, data_ora")
      .eq("id", input.visitaId)
      .maybeSingle();
    const vs = vis as { titolo: string; data_ora: string } | null;

    await notifyUtenteNuovaPrenotazione({
      userId,
      email: await getUserEmail(userId),
      modulo: "Visita guidata",
      riferimento: vs?.titolo ?? a.nome,
      quando: vs ? new Date(vs.data_ora).toLocaleString("it-IT") : undefined,
      link: "/dashboard/prenotazioni",
    });

    await sendGestoreNotificationEmail({
      gestoreId: a.gestore_id,
      buyerId: userId,
      modulo: "Infopoint",
      subject: `Nuova prenotazione visita — ${a.nome}`,
      evento: "Nuova prenotazione visita",
      ctaPath: `/dashboard/infopoint/${input.attrazioneId}/prenotazioni`,
      dettagli: [
        { label: "Attrazione", value: a.nome },
        ...(vs ? [{ label: "Visita", value: vs.titolo }] : []),
        ...(vs
          ? [
              {
                label: "Data visita",
                value: new Date(vs.data_ora).toLocaleString("it-IT"),
              },
            ]
          : []),
        {
          label: "Partecipanti",
          value: `${input.partecipanti} ${input.partecipanti === 1 ? "persona" : "persone"}`,
        },
        { label: "Totale", value: eurFmt(total) },
      ],
    });
  }

  revalidatePath(`/infopoint/${input.attrazioneId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Acquisto corso
// ──────────────────────────────────────────────────────────────────────────
export async function acquistaCorso(corsoId: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/videolezioni/${corsoId}` };

  const admin = createAdminClient();
  const { data: corso } = await admin
    .from("corsi")
    .select("id, prezzo_cents, stato")
    .eq("id", corsoId)
    .single();
  const t = await tErrors();
  if (!corso) return { error: t("courseNotFound") };
  const c = corso as { prezzo_cents: number; stato: string };
  if (c.stato !== "pubblicato") return { error: t("courseUnavailable") };

  const { error } = await admin.from("acquisti_video").insert({
    corso_id: corsoId,
    utente_id: userId,
    prezzo_pagato_cents: c.prezzo_cents,
  });
  if (error && !error.message.includes("duplicate"))
    return { error: error.message };

  if (!error) {
    const { data: c2 } = await admin
      .from("corsi")
      .select("titolo, gestore_id")
      .eq("id", corsoId)
      .single();
    if (c2) {
      const co = c2 as { titolo: string; gestore_id: string };
      await notifyGestoreNuovaPrenotazione({
        gestoreId: co.gestore_id,
        modulo: "Corso video",
        riferimento: `${co.titolo} — nuovo iscritto`,
        link: `/dashboard/video/${corsoId}/iscritti`,
      });

      await sendGestoreNotificationEmail({
        gestoreId: co.gestore_id,
        buyerId: userId,
        modulo: "Video",
        subject: `Nuovo iscritto al corso — ${co.titolo}`,
        evento: "Nuovo iscritto al corso",
        ctaPath: `/dashboard/video/${corsoId}/iscritti`,
        dettagli: [
          { label: "Corso", value: co.titolo },
          { label: "Importo pagato", value: eurFmt(c.prezzo_cents) },
          {
            label: "Data acquisto",
            value: new Date().toLocaleString("it-IT"),
          },
        ],
      });
    }
  }

  revalidatePath(`/videolezioni/${corsoId}`);
  revalidatePath("/dashboard/miei-video");
  return { success: true, redirectTo: `/dashboard/miei-video/${corsoId}` };
}

// Checkout shop: gestito in src/lib/checkout/actions.ts (startCheckout) — il
// flusso pre-Stripe è stato rimosso a favore del checkout completo con
// PaymentIntent + webhook.
