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
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Accedi — Piattaforma Turistica",
};

export default function LoginPage() {
  return (
    <Card className="border-brand-100/80 shadow-xl shadow-brand-600/5 backdrop-blur-sm">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Bentornato</CardTitle>
        <CardDescription>
          Accedi al tuo account per gestire prenotazioni, eventi e molto altro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Non hai un account?&nbsp;
        <Link
          href="/register"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Registrati
        </Link>
      </CardFooter>
    </Card>
  );
}
