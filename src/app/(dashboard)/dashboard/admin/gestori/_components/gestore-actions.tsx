"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assignRole, revokeRole } from "@/lib/admin/actions";
import type { AppRole } from "@/types/database";

const GESTORE_ROLES: { value: AppRole; label: string }[] = [
  { value: "gestore_eventi", label: "Eventi" },
  { value: "gestore_bnb", label: "B&B" },
  { value: "gestore_ristorante", label: "Ristoranti" },
  { value: "gestore_shop", label: "Shop" },
  { value: "gestore_video", label: "Video" },
  { value: "gestore_infopoint", label: "Infopoint" },
];

const LABEL = Object.fromEntries(
  GESTORE_ROLES.map((g) => [g.value, g.label]),
) as Record<AppRole, string>;

export function GestoreApprove() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | "">("");
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (!email.trim() || !role) {
      toast.error("Inserisci email e ruolo");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/users/find-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        toast.error(json.error ?? "Utente non trovato");
        return;
      }
      const r = await assignRole(json.id, role as AppRole);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Gestore approvato");
      setEmail("");
      setRole("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="mr-1.5 size-3.5" />
        Approva nuovo gestore
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@utente.com"
        className="h-9 min-w-[220px] flex-1 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as AppRole | "")}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Tipo gestore…</option>
        {GESTORE_ROLES.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={onSubmit}
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
        Approva
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        Annulla
      </Button>
    </div>
  );
}

type RevokeProps = {
  userId: string;
  role: AppRole;
};

export function RevokeRoleButton({ userId, role }: RevokeProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Revocare il ruolo gestore '${LABEL[role]}'?`)) return;
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
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-full p-0.5 hover:bg-rose-100"
      title={`Revoca ${LABEL[role]}`}
    >
      <X className="size-3 text-rose-600" />
    </button>
  );
}
