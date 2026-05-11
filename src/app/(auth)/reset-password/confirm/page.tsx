import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ConfirmResetForm } from "./confirm-form";

export const metadata: Metadata = {
  title: "Nuova password — Piattaforma Turistica",
};

export default function ConfirmResetPasswordPage() {
  return (
    <Card className="border-brand-100/80 shadow-xl shadow-brand-600/5 backdrop-blur-sm">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Imposta la nuova password</CardTitle>
        <CardDescription>
          Scegli una nuova password per il tuo account. Dovrà contenere almeno
          8 caratteri, una lettera maiuscola e un numero.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmResetForm />
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="size-4" />
          Torna al login
        </Link>
      </CardFooter>
    </Card>
  );
}
