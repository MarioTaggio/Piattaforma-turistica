// Placeholder until generated with:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// Until then `Database` is loosely typed (`any`) so insert/update payloads
// don't need to match a specific schema. Once you generate real types, this
// stub goes away and queries become fully type-checked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type AppRole =
  | "admin"
  | "utente"
  | "gestore_eventi"
  | "gestore_bnb"
  | "gestore_ristorante"
  | "gestore_shop"
  | "gestore_video"
  | "gestore_infopoint";

export type StatoPubblicazione = "bozza" | "pubblicato" | "archiviato";
export type StatoPagamento = "in_attesa" | "pagato" | "fallito" | "rimborsato";
export type StatoBiglietto =
  | "valido"
  | "utilizzato"
  | "rimborsato"
  | "annullato";
export type StatoPrenotazione =
  | "in_attesa"
  | "confermata"
  | "cancellata"
  | "completata"
  | "no_show";
export type StatoOrdine =
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "consegnato"
  | "annullato";
export type TipoOrdine = "asporto" | "consegna" | "al_tavolo";
export type LivelloCorso = "principiante" | "intermedio" | "avanzato";
export type NotificaTipo = "info" | "successo" | "avviso" | "errore";
