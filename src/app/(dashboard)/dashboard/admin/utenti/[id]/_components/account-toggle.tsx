"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setUserBanned } from "@/lib/admin/actions";

type Props = {
  userId: string;
  banned: boolean;
};

export function AccountToggle({ userId, banned }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !banned;
    if (next && !confirm("Disattivare l'account dell'utente? Non potrà più accedere alla piattaforma."))
      return;
    startTransition(async () => {
      const r = await setUserBanned(userId, next);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(next ? "Account disattivato" : "Account riattivato");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={banned ? "outline" : "destructive"}
      disabled={pending}
      onClick={onToggle}
      className="rounded-xl"
    >
      {pending ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
      ) : banned ? (
        <ShieldCheck className="mr-1.5 size-3.5" />
      ) : (
        <ShieldOff className="mr-1.5 size-3.5" />
      )}
      {banned ? "Riattiva account" : "Disattiva account"}
    </Button>
  );
}
