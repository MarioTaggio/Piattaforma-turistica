import { formatDate } from "@/lib/utils/format";
import type { PublicRecensione } from "@/lib/recensioni/queries";

import { RecensioneRowActions } from "./recensione-row-actions";
import { StarRating } from "./star-rating";

type Props = {
  recensioni: PublicRecensione[];
  /** Mostra colonna gestore actions. Default true. */
  showActions?: boolean;
};

const STATO_LABEL: Record<string, { label: string; cls: string }> = {
  in_attesa: {
    label: "In attesa",
    cls: "bg-amber-100 text-amber-800",
  },
  approvata: {
    label: "Approvata",
    cls: "bg-emerald-100 text-emerald-800",
  },
  rifiutata: {
    label: "Rifiutata",
    cls: "bg-rose-100 text-rose-800",
  },
};

export function RecensioniTable({ recensioni, showActions = true }: Props) {
  if (recensioni.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Nessuna recensione.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Utente</th>
              <th className="px-5 py-3 font-medium">Voto</th>
              <th className="px-5 py-3 font-medium">Recensione</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Data</th>
              {showActions && (
                <th className="px-5 py-3 text-right font-medium">Azioni</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recensioni.map((r) => {
              const stato = STATO_LABEL[r.stato] ?? {
                label: r.stato,
                cls: "bg-muted text-foreground",
              };
              const fullName = [r.user?.nome, r.user?.cognome]
                .filter(Boolean)
                .join(" ");
              return (
                <tr key={r.id} className="align-top hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="font-medium">{fullName || "Utente"}</div>
                  </td>
                  <td className="px-5 py-3">
                    <StarRating value={r.voto} size="sm" />
                  </td>
                  <td className="px-5 py-3">
                    <p className="line-clamp-1 font-medium">{r.titolo}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {r.testo}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${stato.cls}`}
                    >
                      {stato.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </td>
                  {showActions && (
                    <td className="px-5 py-3 text-right">
                      <RecensioneRowActions recensione={r} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
