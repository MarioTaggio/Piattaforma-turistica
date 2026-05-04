"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User as UserIcon, Phone, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/auth/actions";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/auth/schemas";

type Props = {
  email: string;
  initial: UpdateProfileInput;
};

function initialsOf(nome: string, cognome: string, email: string) {
  const a = nome.trim()[0]?.toUpperCase() ?? "";
  const b = cognome.trim()[0]?.toUpperCase() ?? "";
  return (a + b) || email[0]?.toUpperCase() || "?";
}

export function ProfileForm({ email, initial }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: initial,
  });

  const [serverError, setServerError] = useState<string | null>(null);

  const nome = watch("nome");
  const cognome = watch("cognome");
  const avatarUrl = watch("avatar_url");

  async function onSubmit(values: UpdateProfileInput) {
    setServerError(null);
    const result = await updateProfile(values);
    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Profilo aggiornato");
    reset(values, { keepValues: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
          <AvatarFallback className="bg-brand-600 text-base font-semibold text-white">
            {initialsOf(nome ?? "", cognome ?? "", email)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground">
            L&apos;email è gestita da Supabase Auth — non modificabile da qui.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome"
              autoComplete="given-name"
              className="pl-9"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
          </div>
          {errors.nome && (
            <p className="text-xs text-destructive">{errors.nome.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cognome">Cognome</Label>
          <Input
            id="cognome"
            autoComplete="family-name"
            aria-invalid={!!errors.cognome}
            {...register("cognome")}
          />
          {errors.cognome && (
            <p className="text-xs text-destructive">{errors.cognome.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono">Telefono</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="telefono"
              type="tel"
              autoComplete="tel"
              placeholder="+39 ..."
              className="pl-9"
              aria-invalid={!!errors.telefono}
              {...register("telefono")}
            />
          </div>
          {errors.telefono && (
            <p className="text-xs text-destructive">{errors.telefono.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avatar_url">URL avatar</Label>
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="avatar_url"
              type="url"
              placeholder="https://…"
              className="pl-9"
              aria-invalid={!!errors.avatar_url}
              {...register("avatar_url")}
            />
          </div>
          {errors.avatar_url && (
            <p className="text-xs text-destructive">
              {errors.avatar_url.message}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Salva modifiche
        </Button>
      </div>
    </form>
  );
}
