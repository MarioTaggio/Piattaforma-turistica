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
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Recupero password — Piattaforma Turistica",
};

export default function ResetPasswordPage() {
  return (
    <Card className="border-brand-100/80 shadow-xl shadow-brand-600/5 backdrop-blur-sm">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Reimposta la password</CardTitle>
        <CardDescription>
          Inserisci la tua email e ti invieremo un link per crearne una nuova.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
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
