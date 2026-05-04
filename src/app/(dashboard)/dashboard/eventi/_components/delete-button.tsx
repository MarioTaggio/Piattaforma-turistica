"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  action: (id: string) => Promise<{ error?: string }>;
  id: string;
  label?: string;
  redirectTo?: string;
  confirmText?: string;
};

export function DeleteButton({
  action,
  id,
  label = "Elimina",
  redirectTo,
  confirmText = "Sei sicuro? L'azione non è reversibile.",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const result = await action(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Eliminato");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={onClick}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="mr-1.5 size-3.5" />
      {label}
    </Button>
  );
}
