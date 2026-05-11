import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_shop");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("shops")
    .select("nome, gestore_id")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const s = row as { nome: string; gestore_id: string };
  if (s.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const [{ count: prodCount }, { count: ordiniCount }] = await Promise.all([
    supabase
      .from("shop_prodotti")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", id),
    supabase
      .from("ordini_shop")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", id),
  ]);

  const base = `/dashboard/shop/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/shop"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna agli shop
      </Link>

      <PageHeader
        title={s.nome}
        subtitle="Gestisci dettagli shop, catalogo prodotti e ordini ricevuti."
      />

      <TabsNav
        tabs={[
          {
            label: "Dettaglio shop",
            href: base,
            icon: "dettaglio",
            exact: true,
          },
          {
            label: "Catalogo",
            href: `${base}/catalogo`,
            icon: "catalogo",
            badge: prodCount ?? 0,
          },
          {
            label: "Ordini",
            href: `${base}/ordini`,
            icon: "ordini",
            badge: ordiniCount ?? 0,
          },
          {
            label: "Recensioni",
            href: `${base}/recensioni`,
            icon: "recensioni",
          },
        ]}
      />

      {children}
    </div>
  );
}
