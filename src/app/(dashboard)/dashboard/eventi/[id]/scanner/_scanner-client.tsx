"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  ScanLine,
  Ticket,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  lookupBigliettoByCodice,
  markBigliettoUtilizzato,
} from "@/lib/gestore/eventi";

type Stato = "valido" | "utilizzato" | "rimborsato" | "annullato";

type Found = {
  kind: "found";
  id: string;
  codice: string;
  stato: Stato;
  acquirenteNome: string;
  acquirenteEmail: string;
  utilizzatoAt: string | null;
};

type ResultState =
  | { kind: "idle" }
  | { kind: "loading" }
  | Found
  | { kind: "not_found"; message: string }
  | { kind: "wrong_event"; message: string }
  | { kind: "error"; message: string };

type HistoryEntry = {
  ts: number;
  codice: string;
  outcome: "validato" | "già_utilizzato" | "non_trovato" | "altro";
  acquirente?: string;
};

const STATO_LABEL: Record<Stato, string> = {
  valido: "Valido",
  utilizzato: "Già utilizzato",
  rimborsato: "Rimborsato",
  annullato: "Annullato",
};

export function ScannerClient({
  eventoId,
  eventoTitolo,
}: {
  eventoId: string;
  eventoTitolo: string;
}) {
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Webcam scanner state
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<unknown>(null);
  const containerId = "qr-reader";
  const lastScannedRef = useRef<{ code: string; ts: number } | null>(null);

  function pushHistory(entry: HistoryEntry) {
    setHistory((h) => [entry, ...h].slice(0, 10));
  }

  function lookup(code: string) {
    const c = code.trim();
    if (!c) return;
    setResult({ kind: "loading" });
    startTransition(async () => {
      try {
        const r = await lookupBigliettoByCodice(c, eventoId);
        if (!r.ok) {
          setResult({
            kind: r.reason === "wrong_event" ? "wrong_event" : "not_found",
            message: r.message,
          });
          pushHistory({
            ts: Date.now(),
            codice: c,
            outcome: "non_trovato",
          });
          return;
        }
        setResult({
          kind: "found",
          id: r.biglietto.id,
          codice: r.biglietto.codice,
          stato: r.biglietto.stato,
          acquirenteNome: r.biglietto.acquirenteNome,
          acquirenteEmail: r.biglietto.acquirenteEmail,
          utilizzatoAt: r.biglietto.utilizzato_at,
        });
        if (r.biglietto.stato === "utilizzato") {
          pushHistory({
            ts: Date.now(),
            codice: c,
            outcome: "già_utilizzato",
            acquirente: r.biglietto.acquirenteNome,
          });
        }
      } catch (err) {
        setResult({
          kind: "error",
          message: err instanceof Error ? err.message : "Errore inatteso",
        });
      }
    });
  }

  function validate() {
    if (result.kind !== "found") return;
    const id = result.id;
    const acquirente = result.acquirenteNome;
    const codice = result.codice;
    if (!confirm(`Segnare come utilizzato il biglietto di ${acquirente}?`))
      return;
    startTransition(async () => {
      const r = await markBigliettoUtilizzato(id, eventoId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Biglietto validato");
      pushHistory({
        ts: Date.now(),
        codice,
        outcome: "validato",
        acquirente,
      });
      // Refresh result to reflect new state
      setResult({
        kind: "found",
        id,
        codice,
        stato: "utilizzato",
        acquirenteNome: acquirente,
        acquirenteEmail:
          result.kind === "found" ? result.acquirenteEmail : "",
        utilizzatoAt: new Date().toISOString(),
      });
    });
  }

  function reset() {
    setResult({ kind: "idle" });
    setManualCode("");
  }

  // Webcam start/stop via html5-qrcode (lazy import)
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    let scanner: { stop: () => Promise<void>; clear?: () => void } | null = null;

    async function start() {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const inst = new Html5Qrcode(containerId);
        scanner = inst as unknown as { stop: () => Promise<void> };
        scannerRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            // Debounce: stesso codice entro 3s viene ignorato
            const now = Date.now();
            const last = lastScannedRef.current;
            if (last && last.code === decoded && now - last.ts < 3000) return;
            lastScannedRef.current = { code: decoded, ts: now };
            setManualCode(decoded);
            lookup(decoded);
          },
          () => {
            // per-frame errors: ignore (frame senza QR)
          },
        );
        setCameraError(null);
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : "Impossibile aprire la fotocamera",
        );
        setCameraOn(false);
      }
    }
    start();
    return () => {
      cancelled = true;
      if (scanner && typeof scanner.stop === "function") {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  return (
    <div className="space-y-6">
      {/* Manual entry */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <Label htmlFor="manual-code" className="text-sm font-medium">
          Codice biglietto
        </Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Inserisci manualmente il codice se non puoi scansionarlo.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="manual-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="es. 7f3a2b1c-…"
            className="h-12 text-base"
            inputMode="text"
            autoComplete="off"
          />
          <Button
            type="button"
            onClick={() => lookup(manualCode)}
            disabled={pending || !manualCode.trim()}
            className="h-12 rounded-xl bg-brand-600 px-6 text-base hover:bg-brand-700"
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 size-4" />
            )}
            Valida
          </Button>
        </div>
      </section>

      {/* Webcam scanner */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Scanner fotocamera</h2>
            <p className="text-xs text-muted-foreground">
              Punta la fotocamera sul QR code del biglietto.
            </p>
          </div>
          <Button
            type="button"
            variant={cameraOn ? "outline" : "default"}
            size="sm"
            onClick={() => setCameraOn((v) => !v)}
            className={
              cameraOn
                ? "rounded-xl"
                : "rounded-xl bg-brand-600 hover:bg-brand-700"
            }
          >
            {cameraOn ? (
              <>
                <CameraOff className="mr-1.5 size-4" />
                Spegni
              </>
            ) : (
              <>
                <Camera className="mr-1.5 size-4" />
                Accendi fotocamera
              </>
            )}
          </Button>
        </div>

        {cameraError && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {cameraError}
          </div>
        )}

        <div
          id={containerId}
          className={
            "mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-muted/30 " +
            (cameraOn ? "" : "grid place-items-center")
          }
        >
          {!cameraOn && (
            <div className="text-center text-xs text-muted-foreground">
              <Camera className="mx-auto mb-2 size-8 opacity-40" />
              Fotocamera spenta
            </div>
          )}
        </div>
      </section>

      {/* Result */}
      <section aria-live="polite">
        {result.kind === "loading" && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            Verifica in corso…
          </div>
        )}

        {result.kind === "not_found" && (
          <ResultBanner
            tone="error"
            icon={XCircle}
            title="Biglietto non trovato"
            description={`${result.message}. Verifica il codice e riprova.`}
            onReset={reset}
          />
        )}

        {result.kind === "wrong_event" && (
          <ResultBanner
            tone="warning"
            icon={AlertCircle}
            title="Biglietto di un altro evento"
            description={`${result.message}. Questo scanner è per «${eventoTitolo}».`}
            onReset={reset}
          />
        )}

        {result.kind === "error" && (
          <ResultBanner
            tone="error"
            icon={XCircle}
            title="Errore"
            description={result.message}
            onReset={reset}
          />
        )}

        {result.kind === "found" && (
          <FoundCard
            biglietto={result}
            eventoTitolo={eventoTitolo}
            pending={pending}
            onValidate={validate}
            onReset={reset}
          />
        )}
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">
            Ultime {history.length} validazioni
          </h2>
          <ul className="divide-y divide-border">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <code className="font-mono text-[11px] text-muted-foreground">
                    {h.codice.slice(0, 8)}…
                  </code>
                  {h.acquirente && (
                    <span className="ml-2 text-xs">{h.acquirente}</span>
                  )}
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (h.outcome === "validato"
                      ? "bg-emerald-100 text-emerald-700"
                      : h.outcome === "già_utilizzato"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700")
                  }
                >
                  {h.outcome === "validato"
                    ? "Validato"
                    : h.outcome === "già_utilizzato"
                      ? "Già utilizzato"
                      : "Non trovato"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResultBanner({
  tone,
  icon: Icon,
  title,
  description,
  onReset,
}: {
  tone: "error" | "warning" | "success";
  icon: typeof Ticket;
  title: string;
  description: string;
  onReset: () => void;
}) {
  const styles =
    tone === "error"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-emerald-300 bg-emerald-50 text-emerald-800";
  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-90">{description}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}

function FoundCard({
  biglietto,
  eventoTitolo,
  pending,
  onValidate,
  onReset,
}: {
  biglietto: Found;
  eventoTitolo: string;
  pending: boolean;
  onValidate: () => void;
  onReset: () => void;
}) {
  const isValid = biglietto.stato === "valido";
  const isUsed = biglietto.stato === "utilizzato";
  const tone = isValid ? "emerald" : isUsed ? "amber" : "red";
  const ringClass =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50"
        : "border-red-300 bg-red-50";

  return (
    <div className={`overflow-hidden rounded-2xl border ${ringClass}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {isValid ? (
            <CheckCircle2 className="mt-0.5 size-7 text-emerald-600" />
          ) : isUsed ? (
            <AlertCircle className="mt-0.5 size-7 text-amber-600" />
          ) : (
            <XCircle className="mt-0.5 size-7 text-red-600" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">{biglietto.acquirenteNome}</h3>
            {biglietto.acquirenteEmail && (
              <p className="text-xs text-muted-foreground">
                {biglietto.acquirenteEmail}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {eventoTitolo}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={
                  "rounded-full px-2 py-0.5 font-semibold " +
                  (isValid
                    ? "bg-emerald-200 text-emerald-800"
                    : isUsed
                      ? "bg-amber-200 text-amber-800"
                      : "bg-red-200 text-red-800")
                }
              >
                {STATO_LABEL[biglietto.stato]}
              </span>
              {biglietto.utilizzatoAt && (
                <span className="text-muted-foreground">
                  alle {new Date(biglietto.utilizzatoAt).toLocaleTimeString("it-IT")}
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {biglietto.codice}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-current/10 bg-white/40 px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={pending}
        >
          Prossimo
        </Button>
        {isValid && (
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={onValidate}
            className="rounded-xl bg-emerald-600 px-6 text-base text-white hover:bg-emerald-700"
          >
            {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            <CheckCircle2 className="mr-1.5 size-4" />
            Segna come utilizzato
          </Button>
        )}
      </div>
    </div>
  );
}
