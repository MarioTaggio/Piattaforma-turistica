"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendEmailToAttrazioneVisitatori } from "@/lib/gestore/infopoint";

type Props = {
  attrazioneId: string;
  destinatari: number;
};

export function MassEmailForm({ attrazioneId, destinatari }: Props) {
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [subject, setSubject] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (destinatari === 0) {
      toast.error(tMessages("noRecipients"));
      return;
    }
    if (!confirm(tMessages("confirmSendEmail"))) return;
    startTransition(async () => {
      const r = await sendEmailToAttrazioneVisitatori(attrazioneId, {
        subject,
        messaggio,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(tMessages("emailSent"));
      setSubject("");
      setMessaggio("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label>{tForm("subject")}</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={tForm("subjectPlaceholder")}
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{tForm("message")}</Label>
        <textarea
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
          rows={8}
          maxLength={2000}
          placeholder={tForm("messagePlaceholder")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          {messaggio.length}/2000
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {tForm("recipients")}:{" "}
          <strong className="text-foreground">{destinatari}</strong>
        </p>
        <Button
          type="submit"
          disabled={pending || destinatari === 0}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          {pending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          {tForm("sendEmail")}
        </Button>
      </div>
    </form>
  );
}
