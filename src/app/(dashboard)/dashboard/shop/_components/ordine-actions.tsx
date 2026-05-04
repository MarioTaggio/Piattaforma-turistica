"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChefHat,
  Loader2,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateOrdineShopStato,
  updateOrdineShopTracking,
} from "@/lib/gestore/shop";

type Stato =
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "consegnato"
  | "annullato";

type Props = {
  ordineId: string;
  shopId: string;
  currentStato: string;
  hasTracking: boolean;
};

export function OrdineActions({
  ordineId,
  shopId,
  currentStato,
  hasTracking,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingCodice, setTrackingCodice] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  function update(stato: Stato) {
    startTransition(async () => {
      const r = await updateOrdineShopStato(ordineId, shopId, stato);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Stato aggiornato");
      router.refresh();
    });
  }

  function submitTracking() {
    if (!trackingCodice.trim()) {
      toast.error("Inserisci il codice tracking");
      return;
    }
    startTransition(async () => {
      const r = await updateOrdineShopTracking(ordineId, shopId, {
        codice: trackingCodice.trim(),
        url: trackingUrl.trim() || undefined,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Spedizione registrata");
      setTrackingOpen(false);
      setTrackingCodice("");
      setTrackingUrl("");
      router.refresh();
    });
  }

  const isAnnullato = currentStato === "annullato";
  const isConsegnato = currentStato === "consegnato";

  if (isAnnullato || (isConsegnato && hasTracking)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {isAnnullato ? (
          <>
            <XCircle className="size-3.5" />
            Chiuso
          </>
        ) : (
          <>
            <PackageCheck className="size-3.5 text-emerald-600" />
            Spedito
          </>
        )}
      </span>
    );
  }

  if (trackingOpen) {
    return (
      <div className="flex flex-col items-end gap-2 rounded-xl border border-border bg-muted/30 p-2">
        <div className="w-56 space-y-1.5">
          <Label className="text-[10px]">Codice tracking *</Label>
          <Input
            value={trackingCodice}
            onChange={(e) => setTrackingCodice(e.target.value)}
            placeholder="ABC123XYZ"
            className="h-8 text-xs"
          />
          <Label className="text-[10px]">URL tracking (opzionale)</Label>
          <Input
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://corriere.it/track/ABC123"
            className="h-8 text-xs"
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setTrackingOpen(false)}
            disabled={pending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-lg bg-brand-600 text-xs hover:bg-brand-700"
            onClick={submitTracking}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-1 size-3 animate-spin" />}
            Conferma
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {currentStato === "in_attesa" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg text-xs"
          onClick={() => update("in_preparazione")}
          disabled={pending}
        >
          <ChefHat className="mr-1 size-3" />
          In prep.
        </Button>
      )}
      {currentStato === "in_preparazione" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg text-xs"
          onClick={() => update("pronto")}
          disabled={pending}
        >
          <CheckCircle2 className="mr-1 size-3" />
          Pronto
        </Button>
      )}
      {(currentStato === "pronto" ||
        currentStato === "in_preparazione") && (
        <Button
          type="button"
          size="sm"
          className="h-7 rounded-lg bg-brand-600 text-xs hover:bg-brand-700"
          onClick={() => setTrackingOpen(true)}
          disabled={pending}
        >
          <Truck className="mr-1 size-3" />
          Spedisci
        </Button>
      )}
      {currentStato !== "annullato" && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (!confirm("Annullare questo ordine?")) return;
            update("annullato");
          }}
          disabled={pending}
        >
          <XCircle className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
