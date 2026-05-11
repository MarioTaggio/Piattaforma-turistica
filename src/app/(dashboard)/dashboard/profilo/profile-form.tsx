"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Loader2, User as UserIcon, Phone, Upload } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
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
    setValue,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: initial,
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nome = watch("nome");
  const cognome = watch("cognome");
  const avatarUrl = watch("avatar_url");

  async function uploadAvatar(file: File) {
    const accepted = ["image/jpeg", "image/png", "image/webp"];
    if (!accepted.includes(file.type)) {
      toast.error("Formato non supportato (usa JPG, PNG o WebP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File troppo grande (max 2MB)");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Sessione scaduta");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      if (error) {
        toast.error(`Upload fallito: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setValue("avatar_url", data.publicUrl, { shouldDirty: true });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
        <Avatar className="size-20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
          <AvatarFallback className="bg-brand-600 text-lg font-semibold text-white">
            {initialsOf(nome ?? "", cognome ?? "", email)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-sm font-medium">{email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              Carica foto
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={uploading}
                onClick={() => setValue("avatar_url", "", { shouldDirty: true })}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Rimuovi
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            JPG / PNG / WebP · max 2MB
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
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              autoComplete="off"
              placeholder="mario_rossi"
              className="pl-9"
              aria-invalid={!!errors.username}
              {...register("username")}
            />
          </div>
          {errors.username ? (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              3-20 caratteri · lettere, numeri, underscore
            </p>
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
