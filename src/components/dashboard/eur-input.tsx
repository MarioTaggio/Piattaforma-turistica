"use client";

import { Input } from "@/components/ui/input";

type Props = {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
};

/**
 * Input prezzo che mostra euro (es. "12,50") ma legge/scrive centesimi
 * (es. 1250). Usalo via Controller di react-hook-form così la value rimane
 * in centesimi nel form state, allineata allo schema DB.
 */
export function EurInput({
  valueCents,
  onChangeCents,
  placeholder = "0,00",
  ...rest
}: Props) {
  const display = Number.isFinite(valueCents)
    ? (valueCents / 100).toString()
    : "";
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        €
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.01}
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChangeCents(0);
            return;
          }
          const eur = parseFloat(raw.replace(",", "."));
          onChangeCents(isNaN(eur) ? 0 : Math.round(eur * 100));
        }}
        className="pl-7"
        {...rest}
      />
    </div>
  );
}
