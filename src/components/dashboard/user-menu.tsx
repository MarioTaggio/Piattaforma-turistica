"use client";

import Link from "next/link";
import {
  ExternalLink,
  KeyRound,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";

type Props = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

function initialsOf(name: string, email: string) {
  const fromName = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return fromName || email[0]?.toUpperCase() || "?";
}

export function UserMenu({ name, email, avatarUrl }: Props) {
  const initials = initialsOf(name, email);

  return (
    <DropdownMenu>
      {/* Trigger: avatar + nome/email. NON è più un Link a /dashboard.
          Cliccando si apre il dropdown. */}
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-1 pr-3 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="bg-brand-600 text-xs font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-medium">{name || "Utente"}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1">
        {/* Header: avatar + nome + email */}
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="size-10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="bg-brand-600 text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name || "Utente"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/dashboard/profilo" />}>
          <UserCircle className="mr-2 size-4" />
          Il mio profilo
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/dashboard/profilo#impostazioni" />}
        >
          <Settings className="mr-2 size-4" />
          Impostazioni account
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/profilo#password" />}>
          <KeyRound className="mr-2 size-4" />
          Cambia password
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={
            <a href="/" target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLink className="mr-2 size-4" />
          Vai al sito
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem
            // nativeButton={true} è obbligatorio quando `render` produce
            // un <button>: Base UI di default si aspetta un non-button
            // (perché lui stesso wrappa l'item come elemento focusabile).
            nativeButton={true}
            render={<button type="submit" />}
            className="w-full text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Logout
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
