import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
  const tAdmin = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title={tAdmin("settingsTitle")}
        subtitle={tAdmin("settingsSubtitle")}
      />
      <SettingsForm initial={settings} />
    </div>
  );
}
