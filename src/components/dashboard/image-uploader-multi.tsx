"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Star,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Bucket Supabase Storage (es. "strutture"). Deve esistere ed essere public. */
  bucket: string;
  /** Sottocartella all'interno del bucket (es. struttura_id). Se vuoto: "tmp". */
  folder?: string;
  /** Numero massimo di immagini (default 10). */
  maxImages?: number;
  /** Dimensione massima per file in MB (default 5). */
  maxSizeMb?: number;
  /** MIME type accettati. */
  accept?: string;
  label?: string;
  className?: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploaderMulti({
  value,
  onChange,
  bucket,
  folder,
  maxImages = 10,
  maxSizeMb = 5,
  accept = "image/jpeg,image/png,image/webp",
  label = "Carica foto",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const slotsLeft = Math.max(0, maxImages - value.length);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (list.length > slotsLeft) {
      toast.error(`Puoi caricare al massimo ${maxImages} foto`);
      return;
    }

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

      const subFolder = folder?.trim() || "tmp";
      const uploaded: string[] = [];

      for (const file of list) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`Formato non supportato: ${file.name}`);
          continue;
        }
        if (file.size > maxSizeMb * 1024 * 1024) {
          toast.error(`Troppo grande (max ${maxSizeMb}MB): ${file.name}`);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${subFolder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });
        if (error) {
          toast.error(`Upload fallito (${file.name}): ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }

      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, i) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={url}
                  alt={`Foto ${i + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-950 shadow">
                    <Star className="size-3 fill-current" />
                    Principale
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-border bg-card/95 p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || uploading}
                    className="size-7 p-0"
                    title="Sposta avanti"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1 || uploading}
                    className="size-7 p-0"
                    title="Sposta indietro"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(i)}
                  disabled={uploading}
                  className="size-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Rimuovi"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {slotsLeft > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card px-6 py-8 text-center transition disabled:opacity-50",
            dragOver
              ? "border-brand-500 bg-brand-50/60"
              : "border-border hover:border-brand-300 hover:bg-brand-50/40",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-brand-600" />
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            </>
          ) : (
            <>
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                {value.length === 0 ? (
                  <ImagePlus className="size-5" />
                ) : (
                  <Upload className="size-5" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Trascina qui o clicca · JPG, PNG, WebP · max {maxSizeMb}MB · ancora{" "}
                  {slotsLeft} di {maxImages}
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
