import type { Metadata } from "next";

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
  telefono: string | null;
  avatar_url: string | null;
};

export default async function ProfiloPage() {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("nome, cognome, telefono, avatar_url")
    .eq("id", user.id)
    .single();

  const row = (profile ?? {}) as ProfileRow;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Il tuo profilo"
        subtitle="Aggiorna le tue informazioni personali e la password."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Informazioni personali</CardTitle>
            <CardDescription>
              Queste informazioni sono visibili nel tuo account e nelle ricevute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              email={user.email}
              initial={{
                nome: row.nome ?? "",
                cognome: row.cognome ?? "",
                telefono: row.telefono ?? "",
                avatar_url: row.avatar_url ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Cambia la password del tuo account in qualsiasi momento.
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
