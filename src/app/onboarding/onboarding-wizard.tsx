"use client";

import { useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  AtSign,
  Calendar,
  CheckCircle2,
  Loader2,
  Phone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import {
  saveOnboardingStep1,
  completeOnboarding,
  type OnboardingStep1Input,
  type OnboardingStep2Input,
} from "@/lib/auth/onboarding";

type Initial = OnboardingStep1Input & OnboardingStep2Input;

const INTERESTS = [
  { value: "eventi", label: "Eventi" },
  { value: "bnb", label: "B&B" },
  { value: "ristoranti", label: "Ristoranti" },
  { value: "shop", label: "Shop" },
  { value: "video", label: "Video corsi" },
  { value: "infopoint", label: "Infopoint" },
];

export function OnboardingWizard({ initial }: { initial: Initial }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [username, setUsername] = useState(initial.username ?? "");
  const [telefono, setTelefono] = useState(initial.telefono ?? "");
  const [dataNascita, setDataNascita] = useState(initial.data_nascita ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? "");

  // Step 2 state
  const [interessi, setInteressi] = useState<string[]>(initial.interessi ?? []);
  const [cittaPref, setCittaPref] = useState(initial.citta_preferita ?? "");
  const [newsletter, setNewsletter] = useState(initial.newsletter ?? false);

  async function uploadAvatar(file: File) {
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
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        toast.error(`Upload fallito: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function nextStep() {
    startTransition(async () => {
      const r = await saveOnboardingStep1({
        username,
        telefono,
        data_nascita: dataNascita,
        avatar_url: avatarUrl,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setStep(2);
    });
  }

  function finish() {
    startTransition(async () => {
      const r = await completeOnboarding({
        interessi,
        citta_preferita: cittaPref,
        newsletter,
      });
      if (r && "error" in r) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Step {step} di 2
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {step === 1 ? "Completa il tuo profilo" : "Le tue preferenze"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1
            ? "Pochi dati per personalizzare la tua esperienza."
            : "Aiutaci a mostrarti contenuti più rilevanti."}
        </p>
      </header>

      <div className="mx-auto h-1 max-w-xs overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: step === 1 ? "50%" : "100%" }}
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {step === 1 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                <AvatarFallback className="bg-brand-600 text-white">
                  {(username[0] ?? "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <input
                  ref={fileRef}
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
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 size-3.5" />
                  )}
                  Carica foto profilo (opzionale)
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Puoi anche saltarla e aggiungerla più tardi.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ob-username">
                Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ob-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mario_rossi"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3-20 caratteri · lettere, numeri, underscore
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ob-tel">
                  Telefono <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ob-tel"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+39 ..."
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ob-dn">Data di nascita</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ob-dn"
                    type="date"
                    value={dataNascita}
                    onChange={(e) => setDataNascita(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={nextStep}
              disabled={pending || !username || !telefono}
              className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              {pending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : null}
              Continua
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Interessi</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {INTERESTS.map((i) => {
                  const checked = interessi.includes(i.value);
                  return (
                    <label
                      key={i.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                        checked
                          ? "border-brand-500 bg-brand-50/60 text-brand-800"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setInteressi(
                            e.target.checked
                              ? [...interessi, i.value]
                              : interessi.filter((x) => x !== i.value),
                          )
                        }
                      />
                      {i.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ob-citta">Città / zona preferita</Label>
              <Input
                id="ob-citta"
                value={cittaPref}
                onChange={(e) => setCittaPref(e.target.value)}
                placeholder="Es. Torino, Langhe…"
              />
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong>Iscriviti alla newsletter</strong> — ricevi novità,
                offerte e suggerimenti su misura. Puoi disiscriverti in
                qualsiasi momento.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={pending}
              >
                ← Indietro
              </Button>
              <Button
                type="button"
                onClick={finish}
                disabled={pending}
                className="rounded-xl bg-brand-600 hover:bg-brand-700"
              >
                {pending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-4" />
                )}
                Completa profilo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
