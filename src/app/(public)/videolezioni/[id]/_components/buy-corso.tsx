"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acquistaCorso } from "@/lib/public/actions";

type Props = {
  corsoId: string;
  free: boolean;
};

export function BuyCorsoButton({ corsoId, free }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await acquistaCorso(corsoId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success(free ? "Corso aggiunto" : "Corso acquistato");
        router.push(r.redirectTo);
      }
    });
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={pending}
      onClick={onClick}
      className="rounded-xl bg-brand-600 hover:bg-brand-700"
    >
      {pending ? (
        <Loader2 className="mr-1.5 size-4 animate-spin" />
      ) : (
        <GraduationCap className="mr-1.5 size-4" />
      )}
      {free ? "Inizia gratis" : "Acquista corso"}
    </Button>
  );
}
