"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth/actions";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/auth/schemas";

export function ConfirmResetForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePassword(values);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Password aggiornata!");
    router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Nuova password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="pl-9"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
        </div>
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
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

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-600 hover:bg-brand-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Aggiorna password
      </Button>
    </form>
  );
}
