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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "eventi" | "bnb" | "ristoranti" | "tour";

const TABS: { value: Tab; label: string; icon: typeof CalendarDays }[] = [
  { value: "eventi", label: "Eventi", icon: CalendarDays },
  { value: "bnb", label: "B&B", icon: Hotel },
  { value: "ristoranti", label: "Ristoranti", icon: UtensilsCrossed },
  { value: "tour", label: "Tour virtuali", icon: Compass },
];

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
    <div className="rounded-3xl bg-white p-3 text-foreground shadow-2xl ring-1 ring-black/5 sm:p-4">
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-foreground/70 hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      >
        {tab === "eventi" && (
          <>
            <Input
              placeholder="Città"
              value={evCitta}
              onChange={(e) => setEvCitta(e.target.value)}
              className="lg:col-span-2"
            />
            <Input
              type="date"
              value={evData}
              onChange={(e) => setEvData(e.target.value)}
            />
            <select
              value={evCat}
              onChange={(e) => setEvCat(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Categoria</option>
              <option value="musica">Musica</option>
              <option value="arte">Arte</option>
              <option value="sport">Sport</option>
              <option value="gastronomia">Gastronomia</option>
              <option value="cultura">Cultura</option>
            </select>
            <Button type="submit" className="rounded-xl bg-brand-600 hover:bg-brand-700">
              <Search className="mr-1.5 size-4" />
              Cerca eventi
            </Button>
          </>
        )}

        {tab === "bnb" && (
          <>
            <Input
              placeholder="Destinazione"
              value={bnbCitta}
              onChange={(e) => setBnbCitta(e.target.value)}
            />
            <Input
              type="date"
              value={bnbIn}
              onChange={(e) => setBnbIn(e.target.value)}
            />
            <Input
              type="date"
              value={bnbOut}
              onChange={(e) => setBnbOut(e.target.value)}
            />
            <Input
              type="number"
              min={1}
              placeholder="Ospiti"
              value={bnbOspiti}
              onChange={(e) => setBnbOspiti(e.target.value)}
            />
            <Button type="submit" className="rounded-xl bg-brand-600 hover:bg-brand-700">
              <Search className="mr-1.5 size-4" />
              Cerca alloggi
            </Button>
          </>
        )}

        {tab === "ristoranti" && (
          <>
            <Input
              placeholder="Città"
              value={riCitta}
              onChange={(e) => setRiCitta(e.target.value)}
              className="lg:col-span-2"
            />
            <Input
              type="date"
              value={riData}
              onChange={(e) => setRiData(e.target.value)}
            />
            <Input
              type="time"
              value={riOra}
              onChange={(e) => setRiOra(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                placeholder="Coperti"
                value={riCoperti}
                onChange={(e) => setRiCoperti(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="rounded-xl bg-brand-600 hover:bg-brand-700">
                <Search className="size-4" />
              </Button>
            </div>
          </>
        )}

        {tab === "tour" && (
          <>
            <Input
              placeholder="Cerca per nome o luogo"
              value={tourQ}
              onChange={(e) => setTourQ(e.target.value)}
              className="lg:col-span-3"
            />
            <select
              value={tourTipo}
              onChange={(e) => setTourTipo(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Tipo</option>
              <option value="borghi">Borghi</option>
              <option value="musei">Musei</option>
              <option value="natura">Natura</option>
              <option value="arte">Arte</option>
            </select>
            <Button type="submit" className="rounded-xl bg-brand-600 hover:bg-brand-700">
              <Search className="mr-1.5 size-4" />
              Esplora
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
