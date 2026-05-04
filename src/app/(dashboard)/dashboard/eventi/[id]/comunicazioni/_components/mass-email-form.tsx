"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendEmailToEventoPartecipanti } from "@/lib/gestore/eventi";

type Props = {
  eventoId: string;
  destinatari: number;
};

export function MassEmailForm({ eventoId, destinatari }: Props) {
  const [subject, setSubject] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (destinatari === 0) {
      toast.error("Nessun partecipante a cui inviare");
      return;
    }
    if (
      !confirm(
        `Inviare questa email a ${destinatari} partecipant${destinatari === 1 ? "e" : "i"}?`,
      )
    )
      return;
    startTransition(async () => {
      const r = await sendEmailToEventoPartecipanti(eventoId, {
        subject,
        messaggio,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Email inviata a ${r.sent} destinatari`);
      setSubject("");
      setMessaggio("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label>Oggetto</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Es. Aggiornamento orario evento"
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Messaggio</Label>
        <textarea
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
          rows={8}
          maxLength={2000}
          placeholder="Scrivi il messaggio da inviare ai partecipanti…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          {messaggio.length}/2000 caratteri. Verrà inserito anche un link
          alla pagina &laquo;I miei biglietti&raquo;.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Destinatari:{" "}
          <strong className="text-foreground">{destinatari}</strong>{" "}
          partecipant{destinatari === 1 ? "e" : "i"} con biglietto valido
        </p>
        <Button
          type="submit"
          disabled={pending || destinatari === 0}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          {pending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          Invia email
        </Button>
      </div>
    </form>
  );
}
