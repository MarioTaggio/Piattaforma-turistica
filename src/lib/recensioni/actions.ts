"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getUserEmail,
  notifyGestoreNuovaRecensione,
  notifyUtenteRecensioneApprovata,
  notifyUtenteRecensioneRifiutata,
} from "@/lib/notifications/booking-events";

import {
  recensioneSchema,
  rejectRecensioneSchema,
  respondToRecensioneSchema,
  type RecensioneInput,
  type RejectRecensioneInput,
  type RespondToRecensioneInput,
} from "./schemas";
import {
  canUserReview,
  type RecensioneTargetKey,
} from "./queries";

type Result = { error?: string; ok?: true };

async function tErrors() {
  return getTranslations("errors");
}
async function tValidation() {
  return getTranslations("validation");
}

const TARGET_KEYS: RecensioneTargetKey[] = [
  "evento_id",
  "struttura_id",
  "ristorante_id",
  "prodotto_id",
  "corso_id",
  "attrazione_id",
];

function pickTarget(input: RecensioneInput): {
  key: RecensioneTargetKey;
  id: string;
} | null {
  for (const k of TARGET_KEYS) {
    const v = input[k];
    if (typeof v === "string" && v.length > 0) return { key: k, id: v };
  }
  return null;
}

// Mappa target → metadati per costruire link/etichette nelle notifiche.
const TARGET_META: Record<
  RecensioneTargetKey,
  {
    moduloLabel: string;
    tableName: string;
    titleField: string;
    publicPath: (id: string) => string;
    dashboardPath: (id: string) => string;
  }
> = {
  evento_id: {
    moduloLabel: "Evento",
    tableName: "eventi",
    titleField: "titolo",
    publicPath: (id) => `/eventi/${id}`,
    dashboardPath: (id) => `/dashboard/eventi/${id}/recensioni`,
  },
  struttura_id: {
    moduloLabel: "B&B",
    tableName: "strutture",
    titleField: "nome",
    publicPath: (id) => `/bnb/${id}`,
    dashboardPath: (id) => `/dashboard/bnb/${id}/recensioni`,
  },
  ristorante_id: {
    moduloLabel: "Ristorante",
    tableName: "ristoranti",
    titleField: "nome",
    publicPath: (id) => `/ristoranti/${id}`,
    dashboardPath: (id) => `/dashboard/ristoranti/${id}/recensioni`,
  },
  prodotto_id: {
    moduloLabel: "Shop",
    tableName: "shop_prodotti",
    titleField: "nome",
    publicPath: (id) => `/shop/${id}`,
    dashboardPath: (id) => `/dashboard/shop/recensioni?prodotto=${id}`,
  },
  corso_id: {
    moduloLabel: "Video corso",
    tableName: "corsi",
    titleField: "titolo",
    publicPath: (id) => `/videolezioni/${id}`,
    dashboardPath: (id) => `/dashboard/video/${id}/recensioni`,
  },
  attrazione_id: {
    moduloLabel: "Attrazione",
    tableName: "attrazioni",
    titleField: "nome",
    publicPath: (id) => `/infopoint/${id}`,
    dashboardPath: (id) => `/dashboard/infopoint/${id}/recensioni`,
  },
};

async function fetchTargetMeta(
  key: RecensioneTargetKey,
  id: string,
): Promise<{
  gestoreId: string | null;
  titolo: string;
  moduloLabel: string;
  publicPath: string;
  dashboardPath: string;
} | null> {
  const meta = TARGET_META[key];
  const admin = createAdminClient();

  // shop_prodotti non ha gestore_id direttamente: passa per shop_id.
  if (key === "prodotto_id") {
    const { data } = await admin
      .from("shop_prodotti")
      .select("nome, shop_id, shops:shop_id(gestore_id)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as {
      nome: string;
      shop_id: string;
      shops: { gestore_id: string | null } | null;
    };
    return {
      gestoreId: row.shops?.gestore_id ?? null,
      titolo: row.nome,
      moduloLabel: meta.moduloLabel,
      publicPath: meta.publicPath(id),
      dashboardPath: `/dashboard/shop/${row.shop_id}/recensioni`,
    };
  }

  const { data } = await admin
    .from(meta.tableName)
    .select(`gestore_id, ${meta.titleField}` as string)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, string | null>;
  return {
    gestoreId: (row.gestore_id ?? null) as string | null,
    titolo: String(row[meta.titleField] ?? ""),
    moduloLabel: meta.moduloLabel,
    publicPath: meta.publicPath(id),
    dashboardPath: meta.dashboardPath(id),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Utente: crea recensione
// ──────────────────────────────────────────────────────────────────────────
export async function createRecensione(
  input: RecensioneInput,
): Promise<Result> {
  const parsed = recensioneSchema.safeParse(input);
  if (!parsed.success) {
    return { error: (await tValidation())("invalidData") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await tErrors())("sessionExpired") };

  const target = pickTarget(parsed.data);
  if (!target) return { error: (await tValidation())("invalidData") };

  const eligible = await canUserReview(target.key, target.id);
  if (!eligible) return { error: (await tErrors())("notAuthorized") };

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("recensioni").insert({
    user_id: user.id,
    [target.key]: target.id,
    voto: parsed.data.voto,
    titolo: parsed.data.titolo,
    testo: parsed.data.testo,
    stato: "in_attesa",
  });
  if (insErr) {
    if (insErr.code === "23505") {
      return { error: "Hai già recensito questo contenuto" };
    }
    return { error: insErr.message };
  }

  const meta = await fetchTargetMeta(target.key, target.id);
  if (meta?.gestoreId) {
    await notifyGestoreNuovaRecensione({
      gestoreId: meta.gestoreId,
      email: await getUserEmail(meta.gestoreId),
      modulo: meta.moduloLabel,
      riferimentoContenuto: meta.titolo,
      voto: parsed.data.voto,
      titolo: parsed.data.titolo,
      link: meta.dashboardPath,
    });
  }

  if (meta) {
    revalidatePath(meta.publicPath);
    revalidatePath(meta.dashboardPath);
  }
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Gestore: approva / rifiuta / rispondi / elimina
// ──────────────────────────────────────────────────────────────────────────

async function loadRecensioneAndAuthorize(id: string): Promise<
  | {
      error: string;
    }
  | {
      recensione: {
        id: string;
        user_id: string;
        voto: number;
        titolo: string;
        stato: string;
      };
      target: { key: RecensioneTargetKey; id: string };
      meta: NonNullable<Awaited<ReturnType<typeof fetchTargetMeta>>>;
      gestoreId: string;
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await tErrors())("sessionExpired") };

  const admin = createAdminClient();
  const { data } = await admin
    .from("recensioni")
    .select(
      "id, user_id, voto, titolo, stato, evento_id, struttura_id, ristorante_id, prodotto_id, corso_id, attrazione_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "Recensione non trovata" };
  const row = data as Record<string, string | number | null>;

  let target: { key: RecensioneTargetKey; id: string } | null = null;
  for (const k of TARGET_KEYS) {
    const v = row[k];
    if (typeof v === "string" && v.length > 0) {
      target = { key: k, id: v };
      break;
    }
  }
  if (!target) return { error: "Recensione orfana" };

  const meta = await fetchTargetMeta(target.key, target.id);
  if (!meta?.gestoreId) return { error: "Contenuto non trovato" };

  // Authorization: admin oppure gestore del contenuto.
  const { data: rolesRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  const isAdmin = !!rolesRow;
  if (!isAdmin && meta.gestoreId !== user.id) {
    return { error: (await tErrors())("notAuthorized") };
  }

  return {
    recensione: {
      id: String(row.id),
      user_id: String(row.user_id),
      voto: Number(row.voto),
      titolo: String(row.titolo),
      stato: String(row.stato),
    },
    target,
    meta: meta as NonNullable<Awaited<ReturnType<typeof fetchTargetMeta>>>,
    gestoreId: meta.gestoreId,
  };
}

export async function approveRecensione(id: string): Promise<Result> {
  const ctx = await loadRecensioneAndAuthorize(id);
  if ("error" in ctx) return ctx;

  const admin = createAdminClient();
  const { error } = await admin
    .from("recensioni")
    .update({ stato: "approvata", motivazione_rifiuto: null })
    .eq("id", id);
  if (error) return { error: error.message };

  await notifyUtenteRecensioneApprovata({
    userId: ctx.recensione.user_id,
    email: await getUserEmail(ctx.recensione.user_id),
    modulo: ctx.meta.moduloLabel,
    riferimentoContenuto: ctx.meta.titolo,
    link: ctx.meta.publicPath,
  });

  revalidatePath(ctx.meta.publicPath);
  revalidatePath(ctx.meta.dashboardPath);
  return { ok: true };
}

export async function rejectRecensione(
  input: RejectRecensioneInput,
): Promise<Result> {
  const parsed = rejectRecensioneSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const ctx = await loadRecensioneAndAuthorize(parsed.data.id);
  if ("error" in ctx) return ctx;

  const admin = createAdminClient();
  const { error } = await admin
    .from("recensioni")
    .update({
      stato: "rifiutata",
      motivazione_rifiuto: parsed.data.motivazione || null,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await notifyUtenteRecensioneRifiutata({
    userId: ctx.recensione.user_id,
    email: await getUserEmail(ctx.recensione.user_id),
    modulo: ctx.meta.moduloLabel,
    riferimentoContenuto: ctx.meta.titolo,
    motivazione: parsed.data.motivazione || null,
    link: ctx.meta.publicPath,
  });

  revalidatePath(ctx.meta.publicPath);
  revalidatePath(ctx.meta.dashboardPath);
  return { ok: true };
}

export async function respondToRecensione(
  input: RespondToRecensioneInput,
): Promise<Result> {
  const parsed = respondToRecensioneSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const ctx = await loadRecensioneAndAuthorize(parsed.data.id);
  if ("error" in ctx) return ctx;

  const admin = createAdminClient();
  const { error } = await admin
    .from("recensioni")
    .update({
      risposta_gestore: parsed.data.risposta,
      risposta_data: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath(ctx.meta.publicPath);
  revalidatePath(ctx.meta.dashboardPath);
  return { ok: true };
}

export async function deleteRecensione(id: string): Promise<Result> {
  const ctx = await loadRecensioneAndAuthorize(id);
  if ("error" in ctx) return ctx;

  const admin = createAdminClient();
  const { error } = await admin.from("recensioni").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(ctx.meta.publicPath);
  revalidatePath(ctx.meta.dashboardPath);
  return { ok: true };
}
