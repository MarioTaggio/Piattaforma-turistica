"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";
import {
  deleteOrdineShopItem,
  updateOrdineShopFull,
  updateOrdineShopItem,
} from "@/lib/gestore/shop";
import { formatEurFromCents } from "@/lib/utils/format";

type OrdineStato =
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "consegnato"
  | "annullato";

type StatoPagamento = "in_attesa" | "pagato" | "fallito" | "rimborsato";
type MetodoSpedizione = "standard" | "express" | "ritiro";

export type OrdineItem = {
  id: string;
  prodotto_id: string;
  nome: string;
  quantita: number;
  prezzo_unitario_cents: number;
};

export type OrdineForEdit = {
  id: string;
  shop_id: string;
  utente_id: string;
  totale_cents: number;
  stato: string;
  stato_pagamento: string;
  metodo_spedizione: string;
  shipping_nome: string | null;
  shipping_cognome: string | null;
  shipping_email: string | null;
  shipping_telefono: string | null;
  shipping_indirizzo: string | null;
  shipping_citta: string | null;
  shipping_cap: string | null;
  shipping_provincia: string | null;
  tracking_codice: string | null;
  tracking_url: string | null;
  note: string | null;
  items: OrdineItem[];
};

type Props = { ordine: OrdineForEdit };

export function OrdineEditDialog({ ordine }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 rounded-lg text-xs"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-1 size-3" />
        Modifica
      </Button>
      {open && <Modal ordine={ordine} onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({
  ordine,
  onClose,
}: {
  ordine: OrdineForEdit;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [stato, setStato] = useState<OrdineStato>(ordine.stato as OrdineStato);
  const [statoPagamento, setStatoPagamento] = useState<StatoPagamento>(
    ordine.stato_pagamento as StatoPagamento,
  );
  const [metodoSpedizione, setMetodoSpedizione] = useState<MetodoSpedizione>(
    ordine.metodo_spedizione as MetodoSpedizione,
  );
  const [shippingNome, setShippingNome] = useState(ordine.shipping_nome ?? "");
  const [shippingCognome, setShippingCognome] = useState(
    ordine.shipping_cognome ?? "",
  );
  const [shippingEmail, setShippingEmail] = useState(
    ordine.shipping_email ?? "",
  );
  const [shippingTelefono, setShippingTelefono] = useState(
    ordine.shipping_telefono ?? "",
  );
  const [shippingIndirizzo, setShippingIndirizzo] = useState(
    ordine.shipping_indirizzo ?? "",
  );
  const [shippingCitta, setShippingCitta] = useState(
    ordine.shipping_citta ?? "",
  );
  const [shippingCap, setShippingCap] = useState(ordine.shipping_cap ?? "");
  const [shippingProvincia, setShippingProvincia] = useState(
    ordine.shipping_provincia ?? "",
  );
  const [trackingCodice, setTrackingCodice] = useState(
    ordine.tracking_codice ?? "",
  );
  const [trackingUrl, setTrackingUrl] = useState(ordine.tracking_url ?? "");
  const [note, setNote] = useState(ordine.note ?? "");

  function save() {
    startTransition(async () => {
      const r = await updateOrdineShopFull(ordine.id, ordine.shop_id, {
        stato,
        statoPagamento,
        shippingNome,
        shippingCognome,
        shippingEmail,
        shippingTelefono,
        shippingIndirizzo,
        shippingCitta,
        shippingCap,
        shippingProvincia,
        metodoSpedizione,
        trackingCodice,
        trackingUrl,
        note,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Ordine aggiornato");
      onClose();
      router.refresh();
    });
  }

  const orderNumber = ordine.id.slice(0, 8).toUpperCase();
  const customerName =
    `${ordine.shipping_nome ?? ""} ${ordine.shipping_cognome ?? ""}`.trim() ||
    "Cliente";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-xl">
        {/* Header sticky */}
        <header
          className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-border px-5 py-4 text-white"
          style={{ background: "#1B4332" }}
        >
          <div>
            <h3 className="text-base font-semibold">Ordine #{orderNumber}</h3>
            <p className="text-xs text-white/80">{customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Body scrollabile */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Dettagli cliente */}
            <Section title="Dettagli cliente">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome">
                  <Input
                    value={shippingNome}
                    onChange={(e) => setShippingNome(e.target.value)}
                  />
                </Field>
                <Field label="Cognome">
                  <Input
                    value={shippingCognome}
                    onChange={(e) => setShippingCognome(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={shippingEmail}
                    onChange={(e) => setShippingEmail(e.target.value)}
                  />
                </Field>
                <Field label="Telefono">
                  <Input
                    value={shippingTelefono}
                    onChange={(e) => setShippingTelefono(e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* Prodotti ordinati */}
            <Section title="Prodotti ordinati">
              {ordine.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nessun prodotto in questo ordine.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {ordine.items.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      ordineId={ordine.id}
                      shopId={ordine.shop_id}
                    />
                  ))}
                </ul>
              )}
            </Section>

            {/* Indirizzo spedizione */}
            <Section title="Indirizzo spedizione">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Indirizzo" className="sm:col-span-2">
                  <Input
                    value={shippingIndirizzo}
                    onChange={(e) => setShippingIndirizzo(e.target.value)}
                  />
                </Field>
                <Field label="Città">
                  <Input
                    value={shippingCitta}
                    onChange={(e) => setShippingCitta(e.target.value)}
                  />
                </Field>
                <Field label="CAP">
                  <Input
                    value={shippingCap}
                    onChange={(e) => setShippingCap(e.target.value)}
                  />
                </Field>
                <Field label="Provincia">
                  <Input
                    value={shippingProvincia}
                    onChange={(e) => setShippingProvincia(e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* Stati */}
            <Section title="Stato ordine e pagamento">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stato ordine">
                  <Select
                    value={stato}
                    onChange={(v) => setStato(v as OrdineStato)}
                    options={[
                      { value: "in_attesa", label: "In attesa" },
                      { value: "in_preparazione", label: "In preparazione" },
                      { value: "pronto", label: "Pronto" },
                      { value: "consegnato", label: "Consegnato" },
                      { value: "annullato", label: "Annullato" },
                    ]}
                  />
                </Field>
                <Field label="Stato pagamento">
                  <Select
                    value={statoPagamento}
                    onChange={(v) => setStatoPagamento(v as StatoPagamento)}
                    options={[
                      { value: "in_attesa", label: "In attesa" },
                      { value: "pagato", label: "Pagato" },
                      { value: "fallito", label: "Fallito" },
                      { value: "rimborsato", label: "Rimborsato" },
                    ]}
                  />
                </Field>
              </div>
            </Section>

            {/* Spedizione */}
            <Section title="Spedizione">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Metodo spedizione">
                  <Select
                    value={metodoSpedizione}
                    onChange={(v) => setMetodoSpedizione(v as MetodoSpedizione)}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "express", label: "Express" },
                      { value: "ritiro", label: "Ritiro in negozio" },
                    ]}
                  />
                </Field>
                <Field label="Codice tracking">
                  <Input
                    value={trackingCodice}
                    onChange={(e) => setTrackingCodice(e.target.value)}
                    placeholder="ABC123XYZ"
                  />
                </Field>
                <Field label="URL tracking" className="sm:col-span-2">
                  <Input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://corriere.it/track/ABC123"
                  />
                </Field>
              </div>
            </Section>

            {/* Note interne */}
            <Section title="Note interne">
              <p className="mb-2 text-[11px] text-muted-foreground">
                Visibili solo a te e ai tuoi collaboratori, non al cliente.
              </p>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Es. da imballare con cura, cliente VIP, ecc."
              />
            </Section>

            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Totale ordine: {" "}
              <span className="font-semibold text-foreground">
                {formatEurFromCents(ordine.totale_cents)}
              </span>
              <span className="ml-2">
                (ricalcolato dopo modifiche prodotti)
              </span>
            </div>
          </div>
        </div>

        {/* Footer sticky */}
        <footer className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-border bg-card px-5 py-3">
          <ComunicazioneButton
            userId={ordine.utente_id}
            modulo="Ordine shop"
            riferimento={`Ordine #${orderNumber}`}
            link="/dashboard/ordini"
            tipoMittente="gestore_shop"
            size="sm"
            label="Invia comunicazione al cliente"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={pending}
              className="rounded-xl text-white hover:opacity-90"
              style={{ background: "#1B4332" }}
            >
              {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Salva modifiche
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold tracking-tight">{title}</h4>
      {children}
    </section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ItemRow({
  item,
  ordineId,
  shopId,
}: {
  item: OrdineItem;
  ordineId: string;
  shopId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(item.quantita);

  function applyQty(newQty: number) {
    if (!Number.isFinite(newQty) || newQty < 1) return;
    setQty(newQty);
    startTransition(async () => {
      const r = await updateOrdineShopItem(item.id, ordineId, shopId, newQty);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Quantità aggiornata");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Rimuovere "${item.nome}" dall'ordine?`)) return;
    startTransition(async () => {
      const r = await deleteOrdineShopItem(item.id, ordineId, shopId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Prodotto rimosso");
      router.refresh();
    });
  }

  const subtotale = qty * item.prezzo_unitario_cents;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.nome}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatEurFromCents(item.prezzo_unitario_cents)} cad. ·{" "}
          {formatEurFromCents(subtotale)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 rounded-lg p-0"
          onClick={() => applyQty(qty - 1)}
          disabled={pending || qty <= 1}
        >
          −
        </Button>
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          onBlur={() => qty !== item.quantita && applyQty(qty)}
          className="h-7 w-14 text-center text-xs"
          disabled={pending}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 rounded-lg p-0"
          onClick={() => applyQty(qty + 1)}
          disabled={pending}
        >
          +
        </Button>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={remove}
        disabled={pending}
        aria-label="Rimuovi"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
