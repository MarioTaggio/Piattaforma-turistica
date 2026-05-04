import { Suspense } from "react";

import { requireUser } from "@/lib/auth/dal";
import { formatDayLong } from "@/lib/utils/format";

import { BlockSkeleton } from "./_blocks/_skeleton";
import { UtenteBlock } from "./_blocks/utente-block";
import { GestoreEventiBlock } from "./_blocks/gestore-eventi-block";
import { GestoreBnbBlock } from "./_blocks/gestore-bnb-block";
import { GestoreRistoranteBlock } from "./_blocks/gestore-ristorante-block";
import { GestoreShopBlock } from "./_blocks/gestore-shop-block";
import { GestoreVideoBlock } from "./_blocks/gestore-video-block";
import { GestoreInfopointBlock } from "./_blocks/gestore-infopoint-block";
import { AdminBlock } from "./_blocks/admin-block";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // Admin "vede tutti i blocchi"; gli altri solo quelli dei propri ruoli.
  // Il blocco utente è sempre mostrato: contenuti vuoti vengono renderizzati
  // come stati zero, quindi non servono check di esistenza.
  const has = (role: string) =>
    user.roles.includes("admin") ||
    user.roles.includes(role as (typeof user.roles)[number]);
  const isAdmin = user.roles.includes("admin");

  const greeting = user.nome ? `Ciao, ${user.nome}! 👋` : "Bentornato! 👋";
  const today = formatDayLong(new Date().toISOString());

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </header>

      <div className="space-y-6">
        <Suspense fallback={<BlockSkeleton accent="blue" />}>
          <UtenteBlock userId={user.id} nome={user.nome} />
        </Suspense>

        {has("gestore_eventi") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreEventiBlock userId={user.id} />
          </Suspense>
        )}

        {has("gestore_bnb") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreBnbBlock userId={user.id} />
          </Suspense>
        )}

        {has("gestore_ristorante") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreRistoranteBlock userId={user.id} />
          </Suspense>
        )}

        {has("gestore_shop") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreShopBlock userId={user.id} />
          </Suspense>
        )}

        {has("gestore_video") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreVideoBlock userId={user.id} />
          </Suspense>
        )}

        {has("gestore_infopoint") && (
          <Suspense fallback={<BlockSkeleton accent="green" />}>
            <GestoreInfopointBlock userId={user.id} />
          </Suspense>
        )}

        {isAdmin && (
          <Suspense fallback={<BlockSkeleton accent="purple" rows={2} />}>
            <AdminBlock />
          </Suspense>
        )}
      </div>
    </div>
  );
}
