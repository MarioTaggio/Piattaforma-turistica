"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth/actions";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nome: "",
      cognome: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await signUp(values);
    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    setSubmittedEmail(values.email);
    toast.success("Account creato! Controlla la tua email.");
  }

  if (submittedEmail) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Controlla la tua email</h3>
          <p className="text-sm text-muted-foreground">
            Abbiamo inviato un link di conferma a{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>.
            Clicca sul link per attivare l&apos;account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome"
              autoComplete="given-name"
              placeholder="Mario"
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
            placeholder="Rossi"
            aria-invalid={!!errors.cognome}
            {...register("cognome")}
          />
          {errors.cognome && (
            <p className="text-xs text-destructive">{errors.cognome.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@esempio.it"
            className="pl-9"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimo 8 caratteri"
            className="pl-9"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Conferma password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="pl-9"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-600 hover:bg-brand-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Crea account
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Registrandoti accetti i nostri Termini e l&apos;Informativa sulla privacy.
      </p>
    </form>
  );
}
