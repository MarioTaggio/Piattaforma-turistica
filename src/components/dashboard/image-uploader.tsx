"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  bucket?: "images" | "videos";
  folder?: string; // sub-folder, defaults to user id (set automatically)
  accept?: string;
  className?: string;
  label?: string;
};

export function ImageUploader({
  value,
  onChange,
  bucket = "images",
  folder,
  accept = "image/*",
  className,
  label = "Carica un'immagine",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Devi essere autenticato per caricare file");
        return;
      }

      const subFolder = folder ?? user.id;
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${subFolder}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        toast.error(`Upload fallito: ${error.message}`);
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isVideo = bucket === "videos";

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          {isVideo ? (
            <video
              src={value}
              className="aspect-video w-full bg-black"
              controls
            />
          ) : (
            <div className="relative aspect-video w-full">
              <Image
                src={value}
                alt="Anteprima"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
            <p className="truncate text-xs text-muted-foreground">{value}</p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Sostituisci
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange("")}
                disabled={uploading}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-brand-600" />
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            </>
          ) : (
            <>
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <ImageIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Clicca per selezionare un file
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
