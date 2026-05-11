import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Completa il tuo profilo — Piattaforma Turistica",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select(
      "username, telefono, data_nascita, avatar_url, interessi, citta_preferita, newsletter, onboarding_completato",
    )
    .eq("id", user.id)
    .single();

  const row = (data ?? {}) as {
    username: string | null;
    telefono: string | null;
    data_nascita: string | null;
    avatar_url: string | null;
    interessi: string[] | null;
    citta_preferita: string | null;
    newsletter: boolean | null;
    onboarding_completato: boolean | null;
  };

  // Already done → kick out.
  if (row.onboarding_completato) redirect("/dashboard");

  return (
    <OnboardingWizard
      initial={{
        username: row.username ?? "",
        telefono: row.telefono ?? "",
        data_nascita: row.data_nascita ?? "",
        avatar_url: row.avatar_url ?? "",
        interessi: row.interessi ?? [],
        citta_preferita: row.citta_preferita ?? "",
        newsletter: row.newsletter ?? false,
      }}
    />
  );
}
