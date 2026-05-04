import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/dal";
import { getUserContentCounts } from "@/lib/auth/user-content";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const counts = await getUserContentCounts(user.id);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
