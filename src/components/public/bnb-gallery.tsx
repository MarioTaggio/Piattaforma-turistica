"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { ImageLightbox } from "./image-lightbox";

type Props = {
  images: string[];
  alt: string;
};

export function BnbGallery({ images, alt }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(i: number) {
    if (images.length === 0) return;
    setLightboxIndex(i);
    setLightboxOpen(true);
  }

  if (images.length === 0) {
    return (
      <div className="grid h-[500px] place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
        <ImageIcon className="size-10" />
      </div>
    );
  }

  return (
    <>
      <div className="grid h-[500px] grid-cols-3 gap-2">
        <div
          className="relative col-span-2 cursor-pointer overflow-hidden rounded-2xl bg-brand-50"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={images[0]!}
            alt={alt}
            fill
            unoptimized
            sizes="(max-width: 1024px) 66vw, 800px"
            className="object-cover transition duration-300 hover:scale-[1.02]"
          />
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative cursor-pointer overflow-hidden rounded-2xl bg-brand-50"
              onClick={() => openLightbox(i)}
            >
              {images[i] && (
                <Image
                  src={images[i]!}
                  alt={alt}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 33vw, 400px"
                  className="object-cover transition duration-300 hover:scale-[1.02]"
                />
              )}
              {i === 4 && images.length > 5 && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-bold text-white">
                  +{images.length - 5} foto
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted/50"
        >
          Mostra tutte le {images.length} foto
        </button>
      )}

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
