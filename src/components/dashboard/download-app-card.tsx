import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DownloadAppCard() {
  return (
    <div className="rounded-2xl bg-brand-600 p-4 text-white shadow-sm">
      <div className="grid size-9 place-items-center rounded-xl bg-white/15">
        <Smartphone className="size-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">Scarica l&apos;app</h3>
      <p className="mt-1 text-xs leading-snug text-white/75">
        Gestisci tutto dal tuo smartphone, ovunque ti trovi.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3 h-8 w-full bg-white text-brand-700 hover:bg-white/90"
      >
        Scopri di più
      </Button>
    </div>
  );
}
