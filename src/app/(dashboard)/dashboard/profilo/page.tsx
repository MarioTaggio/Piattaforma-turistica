import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, GraduationCap, ShoppingBag, Ticket } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Profilo — Piattaforma Turistica",
};

type ProfileRow = {
  nome: string | null;
  cognome: string | null;
  username: string | null;
  telefono: string | null;
  avatar_url: string | null;
};

export default async function ProfiloPage() {
  const user = await requireUser();
  const tProfile = await getTranslations("profile");

  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [
    { data: profile },
    { count: bigliettiValidi },
    { count: prenotazioni7gg },
    { count: ordiniInCorso },
    { count: corsiAcquistati },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("nome, cognome, username, telefono, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("biglietti")
      .select("id", { count: "exact", head: true })
      .eq("utente_id", user.id)
      .eq("stato", "valido"),
    supabase
      .from("prenotazioni_bnb")
      .select("id", { count: "exact", head: true })
      .eq("utente_id", user.id)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("ordini_shop")
      .select("id", { count: "exact", head: true })
      .eq("utente_id", user.id)
      .in("stato", ["in_attesa", "in_preparazione", "pronto"]),
    supabase
      .from("acquisti_video")
      .select("corso_id", { count: "exact", head: true })
      .eq("utente_id", user.id),
  ]);

  const row = (profile ?? {}) as ProfileRow;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tProfile("title")}
        subtitle={tProfile("subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/dashboard/biglietti"
          icon={Ticket}
          label="Biglietti attivi"
          value={bigliettiValidi ?? 0}
        />
        <StatCard
          href="/dashboard/prenotazioni"
          icon={CalendarCheck}
          label="Prenotazioni ultimi 7gg"
          value={prenotazioni7gg ?? 0}
        />
        <StatCard
          href="/dashboard/ordini"
          icon={ShoppingBag}
          label="Ordini in corso"
          value={ordiniInCorso ?? 0}
        />
        <StatCard
          href="/dashboard/miei-video"
          icon={GraduationCap}
          label="Corsi acquistati"
          value={corsiAcquistati ?? 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{tProfile("personalInfo")}</CardTitle>
            <CardDescription>
              {tProfile("personalInfoDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              email={user.email}
              initial={{
                nome: row.nome ?? "",
                cognome: row.cognome ?? "",
                username: row.username ?? "",
                telefono: row.telefono ?? "",
                avatar_url: row.avatar_url ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{tProfile("password")}</CardTitle>
            <CardDescription>
              {tProfile("passwordDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof Ticket;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-4" />
        </span>
        <span className="text-2xl font-semibold">
          {value.toLocaleString("it-IT")}
        </span>
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </Link>
  );
}
