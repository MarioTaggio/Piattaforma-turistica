"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { acquistaBiglietto } from "@/lib/public/actions";

type Props = {
  eventoId: string;
  disabled?: boolean;
  label?: string;
};

export function BuyTicketButton({ eventoId, disabled, label }: Props) {
  const router = useRouter();
  const tBooking = useTranslations("booking");
  const tMessages = useTranslations("messages");
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await acquistaBiglietto(eventoId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success(tMessages("purchaseSuccess"));
        router.push(r.redirectTo);
      }
    });
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled || pending}
      onClick={onClick}
      className="rounded-xl bg-brand-600 hover:bg-brand-700"
    >
      {pending ? (
        <Loader2 className="mr-1.5 size-4 animate-spin" />
      ) : (
        <Ticket className="mr-1.5 size-4" />
      )}
      {label ?? tBooking("buyTicket")}
    </Button>
  );
}
