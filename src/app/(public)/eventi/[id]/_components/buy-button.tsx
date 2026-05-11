"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acquistaBiglietto } from "@/lib/public/actions";

type Props = {
  eventoId: string;
  disabled?: boolean;
  label?: string;
  buyer?: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
  };
};

export function BuyTicketButton({ eventoId, disabled, label, buyer }: Props) {
  const router = useRouter();
  const tBooking = useTranslations("booking");
  const tMessages = useTranslations("messages");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"me" | "altro">("me");
  const [nome, setNome] = useState(buyer?.nome ?? "");
  const [cognome, setCognome] = useState(buyer?.cognome ?? "");
  const [email, setEmail] = useState(buyer?.email ?? "");
  const [telefono, setTelefono] = useState(buyer?.telefono ?? "");

  function submit() {
    const intestatario =
      mode === "me"
        ? {
            nome: buyer?.nome ?? nome,
            cognome: buyer?.cognome ?? cognome,
            email: buyer?.email ?? email,
            telefono: buyer?.telefono ?? telefono,
          }
        : { nome, cognome, email, telefono };

    if (!intestatario.nome || !intestatario.cognome || !intestatario.email) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    startTransition(async () => {
      const r = await acquistaBiglietto(eventoId, intestatario);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success(tMessages("purchaseSuccess"));
        setOpen(false);
        router.push(r.redirectTo);
      }
    });
  }

  // Quando passa a "ad altro", svuotiamo i campi se erano precompilati col buyer.
  function switchMode(next: "me" | "altro") {
    setMode(next);
    if (next === "altro" && buyer && nome === buyer.nome) {
      setNome("");
      setCognome("");
      setEmail("");
      setTelefono("");
    }
    if (next === "me" && buyer) {
      setNome(buyer.nome);
      setCognome(buyer.cognome);
      setEmail(buyer.email);
      setTelefono(buyer.telefono);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() => {
          if (buyer) {
            setNome(buyer.nome);
            setCognome(buyer.cognome);
            setEmail(buyer.email);
            setTelefono(buyer.telefono);
          }
          setOpen(true);
        }}
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        <Ticket className="mr-1.5 size-4" />
        {label ?? tBooking("buyTicket")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !pending && setOpen(false)}
              aria-label="Chiudi"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-lg font-semibold">Dati intestatario biglietto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Il biglietto sarà valido per la persona indicata qui sotto.
            </p>

            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm ${
                  mode === "me"
                    ? "border-brand-500 bg-brand-50/60 text-brand-800"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="intestatario"
                  className="mr-2"
                  checked={mode === "me"}
                  onChange={() => switchMode("me")}
                />
                A me stesso
              </label>
              <label
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm ${
                  mode === "altro"
                    ? "border-brand-500 bg-brand-50/60 text-brand-800"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="intestatario"
                  className="mr-2"
                  checked={mode === "altro"}
                  onChange={() => switchMode("altro")}
                />
                Ad altra persona
              </label>
            </fieldset>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="int-nome">Nome *</Label>
                <Input
                  id="int-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={mode === "me" && !!buyer}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-cognome">Cognome *</Label>
                <Input
                  id="int-cognome"
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  disabled={mode === "me" && !!buyer}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="int-email">Email *</Label>
                <Input
                  id="int-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode === "me" && !!buyer}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="int-tel">Telefono</Label>
                <Input
                  id="int-tel"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={mode === "me" && !!buyer}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              className="mt-5 w-full rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              {pending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Ticket className="mr-1.5 size-4" />
              )}
              Procedi al pagamento
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
