"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { ImageLightbox } from "./image-lightbox";

type Props = {
  images: string[];
  alt: string;
};

export function BnbGallery({ images, alt }: Props) {
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  function open(i: number) {
    if (images.length === 0) return;
    setLightbox({ open: true, index: i });
  }

  // Placeholder se nessuna immagine.
  if (images.length === 0) {
    return (
      <div className="grid h-[420px] place-items-center rounded-3xl border border-dashed border-border bg-muted/40 text-muted-foreground">
        <ImageIcon className="size-10" />
      </div>
    );
  }

  const main = images[0]!;
  const thumbs = images.slice(1, 5);
  const remaining = Math.max(0, images.length - 5);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:grid-rows-2 sm:[grid-template-rows:1fr_1fr] sm:h-[420px] lg:h-[500px]">
        {/* Immagine principale: occupa 2 colonne e 2 righe */}
        <button
          type="button"
          onClick={() => open(0)}
          className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl bg-brand-50 sm:col-span-2 sm:row-span-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main}
            alt={alt}
            className="size-full object-cover transition duration-300 hover:scale-[1.02]"
          />
        </button>

        {/* Fino a 4 miniature a destra */}
        {Array.from({ length: 4 }).map((_, i) => {
          const src = thumbs[i];
          const isLastVisible = i === 3 && remaining > 0;
          const targetIndex = i + 1;
          if (!src) {
            return (
              <div
                key={i}
                className="hidden rounded-2xl border border-dashed border-border bg-muted/30 sm:block"
              />
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => open(isLastVisible ? 4 : targetIndex)}
              className="relative hidden overflow-hidden rounded-2xl bg-brand-50 sm:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="size-full object-cover transition duration-300 hover:scale-[1.02]"
              />
              {isLastVisible && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 text-white">
                  <span className="text-base font-semibold">
                    +{remaining} foto
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* CTA "Mostra tutte le X foto" */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={() => open(0)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted/50"
        >
          Mostra tutte le {images.length} foto
        </button>
      )}

      {lightbox.open && (
        <ImageLightbox
          images={images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        />
      )}
    </>
  );
}
