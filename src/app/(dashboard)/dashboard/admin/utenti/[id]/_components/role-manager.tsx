"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assignRole, revokeRole } from "@/lib/admin/actions";
import type { AppRole } from "@/types/database";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  utente: "Utente",
  gestore_eventi: "Gestore Eventi",
  gestore_bnb: "Gestore B&B",
  gestore_ristorante: "Gestore Ristorante",
  gestore_shop: "Gestore Shop",
  gestore_video: "Gestore Video",
  gestore_infopoint: "Gestore Infopoint",
};

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

type Props = {
  userId: string;
  roles: AppRole[];
};

export function RoleManager({ userId, roles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState<AppRole | "">("");

  const available = ALL_ROLES.filter((r) => !roles.includes(r));

  function onAdd() {
    if (!adding) return;
    startTransition(async () => {
      const r = await assignRole(userId, adding as AppRole);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Ruolo assegnato");
      setAdding("");
      router.refresh();
    });
  }

  function onRemove(role: AppRole) {
    if (role === "utente") {
      if (!confirm("Rimuovere il ruolo base 'Utente'? L'utente non potrà più accedere alla dashboard."))
        return;
    } else if (!confirm(`Revocare il ruolo '${ROLE_LABELS[role]}'?`)) {
      return;
    }
    startTransition(async () => {
      const r = await revokeRole(userId, role);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Ruolo revocato");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun ruolo assegnato.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
            >
              {ROLE_LABELS[r]}
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(r)}
                className="rounded-full p-0.5 hover:bg-brand-100"
                aria-label={`Rimuovi ${ROLE_LABELS[r]}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value as AppRole | "")}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Seleziona ruolo da aggiungere…</option>
            {available.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!adding || pending}
            onClick={onAdd}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Aggiungi
          </Button>
        </div>
      )}
    </div>
  );
}
