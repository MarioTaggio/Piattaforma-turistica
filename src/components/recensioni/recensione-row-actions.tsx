"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Eye, MessageSquareReply, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  approveRecensione,
  deleteRecensione,
  rejectRecensione,
  respondToRecensione,
} from "@/lib/recensioni/actions";
import type { PublicRecensione } from "@/lib/recensioni/queries";

import { StarRating } from "./star-rating";

export function RecensioneRowActions({
  recensione,
}: {
  recensione: PublicRecensione;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    null | "view" | "reject" | "respond" | "delete"
  >(null);
  const [motivazione, setMotivazione] = useState("");
  const [risposta, setRisposta] = useState(recensione.risposta_gestore ?? "");

  function run(promise: Promise<{ error?: string; ok?: true }>, ok: string) {
    startTransition(async () => {
      const r = await promise;
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(ok);
      setModal(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setModal("view")}
        title="Visualizza"
      >
        <Eye className="size-3.5" />
      </Button>
      {recensione.stato !== "approvata" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(approveRecensione(recensione.id), "Approvata")}
          disabled={pending}
          className="text-emerald-700 hover:bg-emerald-50"
        >
          <Check className="size-3.5" />
          Approva
        </Button>
      )}
      {recensione.stato !== "rifiutata" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setModal("reject")}
          disabled={pending}
          className="text-rose-700 hover:bg-rose-50"
        >
          <X className="size-3.5" />
          Rifiuta
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setModal("respond")}
        disabled={pending}
      >
        <MessageSquareReply className="size-3.5" />
        Rispondi
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setModal("delete")}
        disabled={pending}
        className="text-destructive hover:bg-destructive/10"
        title="Elimina"
      >
        <Trash2 className="size-3.5" />
      </Button>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal === "view" && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{recensione.titolo}</h3>
              <StarRating value={recensione.voto} size="sm" />
              <p className="whitespace-pre-line text-sm">{recensione.testo}</p>
              {recensione.risposta_gestore && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-brand-700">
                    Risposta del gestore
                  </p>
                  <p>{recensione.risposta_gestore}</p>
                </div>
              )}
            </div>
          )}

          {modal === "reject" && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Rifiuta recensione</h3>
              <p className="text-sm text-muted-foreground">
                Aggiungi una motivazione (opzionale). L&apos;utente sarà
                avvisato via email.
              </p>
              <textarea
                rows={4}
                maxLength={500}
                value={motivazione}
                onChange={(e) => setMotivazione(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Annulla
                </Button>
                <Button
                  onClick={() =>
                    run(
                      rejectRecensione({
                        id: recensione.id,
                        motivazione,
                      }),
                      "Rifiutata",
                    )
                  }
                  disabled={pending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Conferma rifiuto
                </Button>
              </div>
            </div>
          )}

          {modal === "respond" && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Rispondi pubblicamente</h3>
              <p className="text-sm text-muted-foreground">
                La risposta apparirà sotto la recensione sul sito pubblico.
              </p>
              <textarea
                rows={5}
                maxLength={2000}
                value={risposta}
                onChange={(e) => setRisposta(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Annulla
                </Button>
                <Button
                  onClick={() =>
                    run(
                      respondToRecensione({
                        id: recensione.id,
                        risposta,
                      }),
                      "Risposta pubblicata",
                    )
                  }
                  disabled={pending}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Pubblica risposta
                </Button>
              </div>
            </div>
          )}

          {modal === "delete" && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Elimina recensione</h3>
              <p className="text-sm text-muted-foreground">
                Questa azione è irreversibile. La recensione verrà rimossa
                definitivamente.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Annulla
                </Button>
                <Button
                  onClick={() =>
                    run(deleteRecensione(recensione.id), "Eliminata")
                  }
                  disabled={pending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Elimina
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
      />
      <div className="relative max-w-lg w-full rounded-2xl bg-background p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
