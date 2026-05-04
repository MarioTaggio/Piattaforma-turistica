"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  deleteContent,
  setContentStato,
  setProductDisponibile,
  type ContentKind,
} from "@/lib/admin/actions";
import type { StatoPubblicazione } from "@/types/database";

type Props = {
  kind: ContentKind;
  id: string;
  stato: StatoPubblicazione;
};

export function ContentActions({ kind, id, stato }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onTogglePublish() {
    const next: StatoPubblicazione =
      stato === "pubblicato" ? "bozza" : "pubblicato";
    startTransition(async () => {
      const r = await setContentStato(kind, id, next);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(next === "pubblicato" ? "Pubblicato" : "Nascosto");
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Eliminare definitivamente questo contenuto?")) return;
    startTransition(async () => {
      const r = await deleteContent(kind, id);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Eliminato");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        onClick={onTogglePublish}
        title={stato === "pubblicato" ? "Nascondi" : "Pubblica"}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : stato === "pubblicato" ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        onClick={onDelete}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        title="Elimina"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

type ProductProps = {
  id: string;
  disponibile: boolean;
};

export function ProductActions({ id, disponibile }: ProductProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      const r = await setProductDisponibile(id, !disponibile);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(!disponibile ? "Prodotto disponibile" : "Prodotto nascosto");
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Eliminare questo prodotto?")) return;
    startTransition(async () => {
      const r = await deleteContent("shop", id);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Eliminato");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        onClick={onToggle}
        title={disponibile ? "Nascondi" : "Rendi disponibile"}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : disponibile ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        onClick={onDelete}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        title="Elimina"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
