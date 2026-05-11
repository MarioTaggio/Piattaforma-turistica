import { createAdminClient } from "@/lib/supabase/admin";
import { RecensioniTable } from "@/components/recensioni/recensioni-table";
import { RecensioniFilterTabs } from "@/components/recensioni/recensioni-filter-tabs";
import type {
  PublicRecensione,
  RecensioneTargetKey,
} from "@/lib/recensioni/queries";
import type { StatoRecensione } from "@/types/database";

type Stato = StatoRecensione | "tutte";

const TARGET_KEY: RecensioneTargetKey = "prodotto_id";

export default async function ShopRecensioniPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stato?: string }>;
}) {
  const { id: shopId } = await params;
  const sp = await searchParams;
  const stato: Stato =
    sp.stato === "in_attesa" ||
    sp.stato === "approvata" ||
    sp.stato === "rifiutata"
      ? (sp.stato as Stato)
      : "tutte";

  const admin = createAdminClient();

  // Tutti i prodotti dello shop, poi tutte le recensioni su quei prodotti.
  const { data: prodottiRows } = await admin
    .from("shop_prodotti")
    .select("id, nome")
    .eq("shop_id", shopId);
  const prodottoIds = ((prodottiRows ?? []) as { id: string }[]).map(
    (p) => p.id,
  );

  let recensioni: PublicRecensione[] = [];
  let all: PublicRecensione[] = [];
  if (prodottoIds.length > 0) {
    const baseQuery = admin
      .from("recensioni")
      .select(
        `id, user_id, voto, titolo, testo, stato,
         risposta_gestore, risposta_data, motivazione_rifiuto, created_at,
         user:user_id (nome, cognome, avatar_url)`,
      )
      .in(TARGET_KEY, prodottoIds)
      .order("created_at", { ascending: false });

    const { data: allData } = await baseQuery;
    all = ((allData ?? []) as unknown) as PublicRecensione[];
    recensioni =
      stato === "tutte" ? all : all.filter((r) => r.stato === stato);
  }

  const counts = {
    in_attesa: all.filter((r) => r.stato === "in_attesa").length,
    approvata: all.filter((r) => r.stato === "approvata").length,
    rifiutata: all.filter((r) => r.stato === "rifiutata").length,
  };

  return (
    <div className="space-y-4">
      <RecensioniFilterTabs
        basePath={`/dashboard/shop/${shopId}/recensioni`}
        active={stato}
        counts={counts}
      />
      <RecensioniTable recensioni={recensioni} />
    </div>
  );
}
