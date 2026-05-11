import { getRecensioniForOwner } from "@/lib/recensioni/queries";
import { RecensioniTable } from "@/components/recensioni/recensioni-table";
import { RecensioniFilterTabs } from "@/components/recensioni/recensioni-filter-tabs";
import type { StatoRecensione } from "@/types/database";

type Stato = StatoRecensione | "tutte";

export default async function RistoranteRecensioniPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stato?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const stato: Stato =
    sp.stato === "in_attesa" ||
    sp.stato === "approvata" ||
    sp.stato === "rifiutata"
      ? (sp.stato as Stato)
      : "tutte";

  const [recensioni, all] = await Promise.all([
    getRecensioniForOwner({ targetKey: "ristorante_id", targetId: id, stato }),
    getRecensioniForOwner({ targetKey: "ristorante_id", targetId: id }),
  ]);

  const counts = {
    in_attesa: all.filter((r) => r.stato === "in_attesa").length,
    approvata: all.filter((r) => r.stato === "approvata").length,
    rifiutata: all.filter((r) => r.stato === "rifiutata").length,
  };

  return (
    <div className="space-y-4">
      <RecensioniFilterTabs
        basePath={`/dashboard/ristoranti/${id}/recensioni`}
        active={stato}
        counts={counts}
      />
      <RecensioniTable recensioni={recensioni} />
    </div>
  );
}
