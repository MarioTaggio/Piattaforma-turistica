import type { Metadata } from "next";
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
  telefono: string | null;
  avatar_url: string | null;
};

export default async function ProfiloPage() {
  const user = await requireUser();
  const tProfile = await getTranslations("profile");

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
        title={tProfile("title")}
        subtitle={tProfile("subtitle")}
      />

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
