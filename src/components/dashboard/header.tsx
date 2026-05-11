import { getSessionUser } from "@/lib/auth/dal";
import { getRecentNotifications } from "@/lib/notifications/queries";
import { getRecentComunicazioni } from "@/lib/comunicazioni/queries";

import { LanguageSwitcher } from "@/components/shared/language-switcher";

import { ComunicazioniBell } from "./comunicazioni-bell";
import { HeaderSearch } from "./header-search";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

export async function Header() {
  const user = await getSessionUser();
  if (!user) return null;

  const [{ notifications, unreadCount }, comuni] = await Promise.all([
    getRecentNotifications(),
    getRecentComunicazioni(),
  ]);
  const fullName = [user.nome, user.cognome].filter(Boolean).join(" ");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex-1">
        <HeaderSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <LanguageSwitcher variant="compact" align="right" />

        <ComunicazioniBell
          userId={user.id}
          initialItems={comuni.items}
          initialUnreadCount={comuni.unreadCount}
        />

        <NotificationsBell
          userId={user.id}
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />

        <div className="ml-2 hidden h-8 w-px bg-border sm:block" />

        <UserMenu
          name={fullName}
          email={user.email}
          avatarUrl={user.avatar_url}
        />
      </div>
    </header>
  );
}
