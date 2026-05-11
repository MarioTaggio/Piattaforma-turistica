"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Compass,
  Hotel,
  Search,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PopularSearch } from "./popular-search";

type Tab = "eventi" | "bnb" | "ristoranti" | "tour";

const TABS: { value: Tab; label: string; icon: typeof CalendarDays }[] = [
  { value: "eventi", label: "Eventi", icon: CalendarDays },
  { value: "bnb", label: "B&B", icon: Hotel },
  { value: "ristoranti", label: "Ristoranti", icon: UtensilsCrossed },
  { value: "tour", label: "Tour virtuali", icon: Compass },
];

// Stili condivisi per i campi input/select — sfondo bianco semi-trasparente,
// testo scuro per leggibilità, alti h-12.
const FIELD_BASE =
  "h-12 w-full rounded-xl border border-white/50 bg-white/90 px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export function HomeSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("eventi");

  // Eventi
  const [evCitta, setEvCitta] = useState("");
  const [evData, setEvData] = useState("");
  const [evCat, setEvCat] = useState("");
  // B&B
  const [bnbCitta, setBnbCitta] = useState("");
  const [bnbIn, setBnbIn] = useState("");
  const [bnbOut, setBnbOut] = useState("");
  const [bnbOspiti, setBnbOspiti] = useState("");
  // Ristoranti
  const [riCitta, setRiCitta] = useState("");
  const [riData, setRiData] = useState("");
  const [riOra, setRiOra] = useState("");
  const [riCoperti, setRiCoperti] = useState("");
  // Tour
  const [tourQ, setTourQ] = useState("");
  const [tourTipo, setTourTipo] = useState("");

  function submit() {
    const params = new URLSearchParams();
    let path = "/";
    if (tab === "eventi") {
      path = "/eventi";
      if (evCitta) params.set("citta", evCitta);
      if (evData) params.set("dataDa", evData);
      if (evCat) params.set("categoria", evCat);
    } else if (tab === "bnb") {
      path = "/bnb";
      if (bnbCitta) params.set("citta", bnbCitta);
      if (bnbIn) params.set("checkin", bnbIn);
      if (bnbOut) params.set("checkout", bnbOut);
      if (bnbOspiti) params.set("ospiti", bnbOspiti);
    } else if (tab === "ristoranti") {
      path = "/ristoranti";
      if (riCitta) params.set("citta", riCitta);
      if (riData) params.set("data", riData);
      if (riOra) params.set("ora", riOra);
      if (riCoperti) params.set("coperti", riCoperti);
    } else {
      path = "/virtual-tour";
      if (tourQ) params.set("q", tourQ);
      if (tourTipo) params.set("tipo", tourTipo);
    }
    const qs = params.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  return (
    <>
      {/* Bottoni categoria — pill glassmorphism, allineati a sinistra,
          direttamente sulla hero verde senza wrapper */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-brand-700 font-bold shadow-md"
                  : "border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/30",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Box search bar — UNICO contenitore, glassmorphism, direttamente
          sulla hero verde, niente wrapper esterno */}
      <div className="mt-4 rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3"
        >
          {tab === "eventi" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <PopularSearch
                type="eventi"
                value={evCitta}
                onChange={setEvCitta}
                placeholder="Città"
                inputClassName={FIELD_BASE}
              />
              <input
                type="date"
                value={evData}
                onChange={(e) => setEvData(e.target.value)}
                className={FIELD_BASE}
              />
              <select
                value={evCat}
                onChange={(e) => setEvCat(e.target.value)}
                className={FIELD_BASE}
              >
                <option value="">Categoria</option>
                <option value="musica">Musica</option>
                <option value="arte">Arte</option>
                <option value="sport">Sport</option>
                <option value="gastronomia">Gastronomia</option>
                <option value="cultura">Cultura</option>
              </select>
              <Button
                type="submit"
                className="h-12 rounded-xl bg-brand-700 px-6 text-base font-semibold text-white shadow-md hover:bg-brand-800"
              >
                <Search className="mr-1.5 size-4" />
                Cerca eventi
              </Button>
            </div>
          )}

          {tab === "bnb" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto]">
              <PopularSearch
                type="bnb"
                value={bnbCitta}
                onChange={setBnbCitta}
                placeholder="Destinazione"
                inputClassName={FIELD_BASE}
              />
              <input
                type="date"
                placeholder="Check-in"
                value={bnbIn}
                onChange={(e) => setBnbIn(e.target.value)}
                className={FIELD_BASE}
              />
              <input
                type="date"
                placeholder="Check-out"
                value={bnbOut}
                onChange={(e) => setBnbOut(e.target.value)}
                className={FIELD_BASE}
              />
              <input
                type="number"
                min={1}
                placeholder="Ospiti"
                value={bnbOspiti}
                onChange={(e) => setBnbOspiti(e.target.value)}
                className={FIELD_BASE}
              />
              <Button
                type="submit"
                className="h-12 rounded-xl bg-brand-700 px-6 text-base font-semibold text-white shadow-md hover:bg-brand-800"
              >
                <Search className="mr-1.5 size-4" />
                Cerca
              </Button>
            </div>
          )}

          {tab === "ristoranti" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]">
              <PopularSearch
                type="ristoranti"
                value={riCitta}
                onChange={setRiCitta}
                placeholder="Città"
                inputClassName={FIELD_BASE}
              />
              <input
                type="date"
                value={riData}
                onChange={(e) => setRiData(e.target.value)}
                className={FIELD_BASE}
              />
              <input
                type="time"
                value={riOra}
                onChange={(e) => setRiOra(e.target.value)}
                className={FIELD_BASE}
              />
              <input
                type="number"
                min={1}
                placeholder="Coperti"
                value={riCoperti}
                onChange={(e) => setRiCoperti(e.target.value)}
                className={FIELD_BASE}
              />
              <Button
                type="submit"
                className="h-12 rounded-xl bg-brand-700 px-6 text-base font-semibold text-white shadow-md hover:bg-brand-800"
              >
                <Search className="mr-1.5 size-4" />
                Cerca
              </Button>
            </div>
          )}

          {tab === "tour" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
              <PopularSearch
                type="tour"
                value={tourQ}
                onChange={setTourQ}
                placeholder="Cerca per nome o luogo"
                popularLabel="Tour più richiesti"
                inputClassName={FIELD_BASE}
              />
              <select
                value={tourTipo}
                onChange={(e) => setTourTipo(e.target.value)}
                className={FIELD_BASE}
              >
                <option value="">Tipo</option>
                <option value="borghi">Borghi</option>
                <option value="musei">Musei</option>
                <option value="natura">Natura</option>
                <option value="arte">Arte</option>
              </select>
              <Button
                type="submit"
                className="h-12 rounded-xl bg-brand-700 px-6 text-base font-semibold text-white shadow-md hover:bg-brand-800"
              >
                <Search className="mr-1.5 size-4" />
                Esplora
              </Button>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
