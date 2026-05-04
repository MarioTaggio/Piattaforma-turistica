"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendComunicazione } from "@/lib/comunicazioni/actions";

type Props = {
  userId: string;
  modulo: string;
  riferimento?: string;
  link?: string;
  // Tipo gestore mittente (es. "gestore_shop") — passato a sendComunicazione
  // per popolare comunicazioni.tipo_mittente.
  tipoMittente?: string;
  // Nome leggibile del business — popola comunicazioni.entita_nome.
  entitaNome?: string;
  // Variante visiva
  size?: "icon" | "sm";
  label?: string;
};

export function ComunicazioneButton({
  userId,
  modulo,
  riferimento,
  link,
  tipoMittente,
  entitaNome,
  size = "icon",
  label = "Comunica",
}: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [testo, setTesto] = useState("");
  const [sendNotifica, setSendNotifica] = useState(true);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await sendComunicazione({
        userId,
        modulo,
        riferimento,
        link,
        tipoMittente,
        entitaNome,
        subject,
        testo,
        sendNotifica,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Comunicazione inviata");
      setSubject("");
      setTesto("");
      setOpen(false);
    });
  }

  return (
    <>
      {size === "icon" ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 rounded-lg p-0"
          onClick={() => setOpen(true)}
          title="Invia comunicazione"
        >
          <Mail className="size-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg text-xs"
          onClick={() => setOpen(true)}
        >
          <Mail className="mr-1.5 size-3.5" />
          {label}
        </Button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invia comunicazione"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Invia comunicazione</h3>
                <p className="text-xs text-muted-foreground">
                  {modulo}
                  {riferimento ? ` — ${riferimento}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Oggetto email</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Es. Aggiornamento sulla tua prenotazione"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Messaggio</Label>
                <textarea
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="Scrivi qui il tuo messaggio…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">
                  {testo.length}/2000 caratteri
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendNotifica}
                  onChange={(e) => setSendNotifica(e.target.checked)}
                />
                Invia anche come notifica nella dashboard del cliente
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={pending}
                className="rounded-xl bg-brand-600 hover:bg-brand-700"
              >
                {pending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                Invia
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
