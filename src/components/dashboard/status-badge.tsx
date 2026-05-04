import { cn } from "@/lib/utils";

type Tone = "default" | "warning" | "success" | "danger" | "info" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-brand-50 text-brand-700 ring-brand-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
  muted: "bg-muted text-muted-foreground ring-border",
};

// Mappings per enum (DB) → label leggibile + tono.
const PRENOTAZIONE: Record<string, { label: string; tone: Tone }> = {
  in_attesa: { label: "In attesa", tone: "warning" },
  confermata: { label: "Confermata", tone: "success" },
  cancellata: { label: "Cancellata", tone: "danger" },
  completata: { label: "Completata", tone: "muted" },
  no_show: { label: "No-show", tone: "danger" },
};

const ORDINE: Record<string, { label: string; tone: Tone }> = {
  in_attesa: { label: "In attesa", tone: "warning" },
  in_preparazione: { label: "In preparazione", tone: "info" },
  pronto: { label: "Pronto", tone: "success" },
  consegnato: { label: "Consegnato", tone: "muted" },
  annullato: { label: "Annullato", tone: "danger" },
};

const BIGLIETTO: Record<string, { label: string; tone: Tone }> = {
  valido: { label: "Valido", tone: "success" },
  utilizzato: { label: "Utilizzato", tone: "muted" },
  rimborsato: { label: "Rimborsato", tone: "info" },
  annullato: { label: "Annullato", tone: "danger" },
};

const PAGAMENTO: Record<string, { label: string; tone: Tone }> = {
  in_attesa: { label: "Pagamento in attesa", tone: "warning" },
  pagato: { label: "Pagato", tone: "success" },
  fallito: { label: "Pagamento fallito", tone: "danger" },
  rimborsato: { label: "Rimborsato", tone: "info" },
};

const PUBBLICAZIONE: Record<string, { label: string; tone: Tone }> = {
  bozza: { label: "Bozza", tone: "muted" },
  pubblicato: { label: "Pubblicato", tone: "success" },
  archiviato: { label: "Archiviato", tone: "muted" },
};

const REGISTRY = {
  prenotazione: PRENOTAZIONE,
  ordine: ORDINE,
  biglietto: BIGLIETTO,
  pagamento: PAGAMENTO,
  pubblicazione: PUBBLICAZIONE,
} as const;

type Props = {
  kind: keyof typeof REGISTRY;
  value: string;
  className?: string;
};

export function StatusBadge({ kind, value, className }: Props) {
  const entry = REGISTRY[kind][value] ?? {
    label: value,
    tone: "muted" as Tone,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASS[entry.tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          entry.tone === "success" && "bg-emerald-500",
          entry.tone === "warning" && "bg-amber-500",
          entry.tone === "danger" && "bg-rose-500",
          entry.tone === "info" && "bg-sky-500",
          entry.tone === "muted" && "bg-muted-foreground/60",
          entry.tone === "default" && "bg-brand-600",
        )}
      />
      {entry.label}
    </span>
  );
}
