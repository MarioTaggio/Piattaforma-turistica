"use client";

import { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils/format";

type Props = {
  totalCents: number;
  onPaid: () => void;
};

export function PaymentForm({ totalCents, onPaid }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const origin = window.location.origin;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${origin}/checkout/success`,
        },
      });
      // Se siamo qui senza errore, Stripe ha già fatto il redirect.
      if (error) {
        toast.error(error.message ?? "Pagamento non riuscito");
        setSubmitting(false);
        return;
      }
      // Per metodi sincroni il redirect è immediato; svuotiamo il carrello
      // a scopo precauzionale (non viene eseguito in caso di redirect).
      onPaid();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore durante il pagamento",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PaymentElement />
      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        Conferma e paga {formatEurFromCents(totalCents)}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Cliccando su &laquo;Conferma e paga&raquo; autorizzi l&apos;addebito.
        Verrai reindirizzato per la conferma del pagamento.
      </p>
    </form>
  );
}
