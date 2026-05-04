import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/dashboard/page-header";
import { getPlatformSettings } from "@/lib/admin/settings";

import { SettingsForm } from "./_form";

export const metadata: Metadata = {
  title: "Impostazioni piattaforma — Piattaforma Turistica",
};

export default async function AdminImpostazioniPage() {
  await requireRole("admin");
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impostazioni piattaforma"
        subtitle="Configura branding, moduli attivi, commissioni, email e manutenzione."
      />
      <SettingsForm initial={settings} />
    </div>
  );
}
