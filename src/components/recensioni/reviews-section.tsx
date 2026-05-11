import { MessageSquareReply } from "lucide-react";

import { getSessionUser } from "@/lib/auth/dal";
import {
  canUserReview,
  getApprovedRecensioni,
  getRatingSummary,
  getRecensioneByMe,
  type RecensioneTargetKey,
} from "@/lib/recensioni/queries";
import { formatDate } from "@/lib/utils/format";

import { ReviewForm } from "./review-form";
import { StarRating } from "./star-rating";

type Target = Partial<Record<RecensioneTargetKey, string>>;

function pickTarget(target: Target): {
  key: RecensioneTargetKey;
  id: string;
} | null {
  const entries = Object.entries(target).filter(
    ([, v]) => typeof v === "string" && v.length > 0,
  ) as [RecensioneTargetKey, string][];
  if (entries.length !== 1) return null;
  return { key: entries[0]![0], id: entries[0]![1] };
}

export async function ReviewsSection({ target }: { target: Target }) {
  const picked = pickTarget(target);
  if (!picked) return null;

  const [summary, reviews, me, user] = await Promise.all([
    getRatingSummary(picked.key, picked.id),
    getApprovedRecensioni(picked.key, picked.id),
    getRecensioneByMe(picked.key, picked.id),
    getSessionUser(),
  ]);

  const eligible = user ? await canUserReview(picked.key, picked.id) : false;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-8">
        <div>
          <h2 className="text-2xl font-semibold">Recensioni</h2>
          {summary.count > 0 ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating value={summary.average} size="sm" />
              <span>
                <strong className="text-foreground">{summary.average}</strong>{" "}
                / 5 — {summary.count} recensioni
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Nessuna recensione ancora
            </p>
          )}
        </div>
      </header>

      {me ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">La tua recensione</h3>
            <span
              className={
                me.stato === "approvata"
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                  : me.stato === "rifiutata"
                    ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                    : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              }
            >
              {me.stato === "approvata"
                ? "Approvata"
                : me.stato === "rifiutata"
                  ? "Rifiutata"
                  : "In attesa di approvazione"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StarRating value={me.voto} size="sm" />
            <span className="text-sm font-medium">{me.titolo}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {me.testo}
          </p>
          {me.motivazione_rifiuto && (
            <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <strong>Motivazione:</strong> {me.motivazione_rifiuto}
            </p>
          )}
        </div>
      ) : user ? (
        eligible ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Lascia una recensione</h3>
            <ReviewForm target={target} />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Per lasciare una recensione devi prima aver acquistato o prenotato
            questo contenuto.
          </div>
        )
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Accedi per lasciare una recensione.
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-4">
          {reviews.map((r) => {
            const fullName = [r.user?.nome, r.user?.cognome]
              .filter(Boolean)
              .join(" ");
            const display = fullName || "Utente";
            const initials = (display[0] ?? "?").toUpperCase();
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{display}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <StarRating value={r.voto} size="sm" />
                </div>
                <h4 className="mt-3 text-sm font-semibold">{r.titolo}</h4>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {r.testo}
                </p>
                {r.risposta_gestore && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
                      <MessageSquareReply className="size-3.5" />
                      Risposta del gestore
                      {r.risposta_data && (
                        <span className="text-muted-foreground">
                          · {formatDate(r.risposta_data)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">
                      {r.risposta_gestore}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
