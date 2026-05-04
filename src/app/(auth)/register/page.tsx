import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crea account — Piattaforma Turistica",
};

export default function RegisterPage() {
  return (
    <Card className="border-brand-100/80 shadow-xl shadow-brand-600/5 backdrop-blur-sm">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Crea il tuo account</CardTitle>
        <CardDescription>
          Inizia a esplorare eventi, B&amp;B, ristoranti e tour guidati.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Hai già un account?&nbsp;
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Accedi
        </Link>
      </CardFooter>
    </Card>
  );
}
