import type { ReactNode } from "react";

import { CartProvider } from "@/components/public/cart-context";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteNavbar } from "@/components/public/site-navbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteNavbar />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </CartProvider>
  );
}
