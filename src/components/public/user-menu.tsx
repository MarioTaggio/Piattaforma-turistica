"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  user: {
    email: string;
    nome: string | null;
    cognome: string | null;
    avatar_url: string | null;
  };
};

export function UserMenu({ user }: Props) {
  const t = useTranslations("nav");
  const fullName = [user.nome, user.cognome].filter(Boolean).join(" ").trim();
  const display = fullName || user.email;
  const initials = (fullName || user.email)[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("account")}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={display}
            width={36}
            height={36}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">{display}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard className="size-4" />
          {t("dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/profilo" />}>
          <UserIcon className="size-4" />
          {t("myProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/biglietti" />}>
          <Ticket className="size-4" />
          {t("myTickets")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/prenotazioni" />}>
          <CalendarCheck className="size-4" />
          {t("myBookings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="submit" className="w-full text-left" />}
          >
            <LogOut className="size-4" />
            {t("logout")}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
