"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updatePlatformSettings,
  type Commissioni,
  type ModuliAttivi,
  type PlatformSettings,
} from "@/lib/admin/settings";

const MODULI: { key: keyof ModuliAttivi; label: string }[] = [
  { key: "eventi", label: "Eventi" },
  { key: "bnb", label: "B&B" },
  { key: "ristoranti", label: "Ristoranti" },
  { key: "shop", label: "Shop" },
  { key: "video", label: "Corsi video" },
  { key: "infopoint", label: "Infopoint" },
  { key: "virtual_tour", label: "Virtual Tour" },
];

const MODULI_COMMISSIONI: { key: keyof Commissioni; label: string }[] = [
  { key: "eventi", label: "Eventi" },
  { key: "bnb", label: "B&B" },
  { key: "ristoranti", label: "Ristoranti" },
  { key: "shop", label: "Shop" },
  { key: "video", label: "Corsi video" },
  { key: "infopoint", label: "Infopoint" },
];

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [s, setS] = useState<PlatformSettings>(initial);

  function setField<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function setModulo(key: keyof ModuliAttivi, value: boolean) {
    setS((prev) => ({
      ...prev,
      moduli_attivi: { ...prev.moduli_attivi, [key]: value },
    }));
  }

  function setCommissione(key: keyof Commissioni, value: number) {
    setS((prev) => ({
      ...prev,
      commissioni: { ...prev.commissioni, [key]: value },
    }));
  }

  function save() {
    startTransition(async () => {
      const r = await updatePlatformSettings(s);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Impostazioni salvate");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Piattaforma */}
      <Section title="Piattaforma" subtitle="Branding e identità del sito.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome sito">
            <Input
              value={s.site_nome}
              onChange={(e) => setField("site_nome", e.target.value)}
            />
          </Field>
          <Field label="Colore primario (hex)">
            <div className="flex items-center gap-2">
              <Input
                value={s.site_color_primario}
                onChange={(e) =>
                  setField("site_color_primario", e.target.value)
                }
                placeholder="#1B4332"
              />
              <span
                aria-hidden
                className="size-9 shrink-0 rounded-lg border border-border"
                style={{ background: s.site_color_primario || "#1B4332" }}
              />
            </div>
          </Field>
          <Field label="Descrizione" className="sm:col-span-2">
            <textarea
              rows={2}
              value={s.site_descrizione ?? ""}
              onChange={(e) => setField("site_descrizione", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="URL logo" className="sm:col-span-2">
            <Input
              value={s.site_logo_url ?? ""}
              onChange={(e) => setField("site_logo_url", e.target.value)}
              placeholder="https://…/logo.png"
            />
          </Field>
        </div>
      </Section>

      {/* Moduli */}
      <Section
        title="Moduli attivi"
        subtitle="Disattiva moduli per nasconderli nella piattaforma."
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {MODULI.map((m) => (
            <li
              key={m.key}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{m.label}</span>
              <Toggle
                checked={s.moduli_attivi[m.key]}
                onChange={(v) => setModulo(m.key, v)}
                ariaLabel={`Attiva ${m.label}`}
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* Commissioni */}
      <Section
        title="Commissioni"
        subtitle="Percentuale trattenuta dalla piattaforma per ciascun modulo."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULI_COMMISSIONI.map((m) => (
            <Field key={m.key} label={`${m.label} (%)`}>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={s.commissioni[m.key]}
                onChange={(e) =>
                  setCommissione(m.key, Number(e.target.value))
                }
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Email */}
      <Section
        title="Email"
        subtitle="Mittente delle email transazionali e notifiche."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome mittente">
            <Input
              value={s.email_mittente_nome ?? ""}
              onChange={(e) =>
                setField("email_mittente_nome", e.target.value)
              }
            />
          </Field>
          <Field label="Email mittente">
            <Input
              type="email"
              value={s.email_mittente_email ?? ""}
              onChange={(e) =>
                setField("email_mittente_email", e.target.value)
              }
              placeholder="noreply@dominio.it"
            />
          </Field>
          <Field label="Oggetto default" className="sm:col-span-2">
            <Input
              value={s.email_oggetto_default ?? ""}
              onChange={(e) =>
                setField("email_oggetto_default", e.target.value)
              }
            />
          </Field>
        </div>
      </Section>

      {/* Manutenzione */}
      <Section
        title="Manutenzione"
        subtitle="Modalità manutenzione: blocca l'accesso pubblico mostrando un messaggio."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm font-medium">
              Modalità manutenzione attiva
            </span>
            <Toggle
              checked={s.manutenzione_attiva}
              onChange={(v) => setField("manutenzione_attiva", v)}
              ariaLabel="Attiva manutenzione"
            />
          </div>
          <Field label="Messaggio mostrato ai visitatori">
            <textarea
              rows={3}
              value={s.manutenzione_messaggio ?? ""}
              onChange={(e) =>
                setField("manutenzione_messaggio", e.target.value)
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </div>
      </Section>

      {/* Save */}
      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending}
          className="rounded-xl text-white hover:opacity-90"
          style={{ background: "#1B4332" }}
        >
          {pending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          Salva impostazioni
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </header>
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

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
      style={{ background: checked ? "#1B4332" : "#cbd5e1" }}
    >
      <span
        aria-hidden
        className="inline-block size-5 transform rounded-full bg-white shadow transition"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}
