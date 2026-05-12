"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function ImageLightbox({ images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartRef = useRef<number | null>(null);

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (images.length === 0) return null;

  const current = images[index];

  function onTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galleria foto"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4">
        {images.length > 1 && (
          <button
            type="button"
            onClick={prev}
            aria-label="Foto precedente"
            className="absolute left-4 z-10 grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={`Foto ${index + 1}`}
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
          />
        ) : null}
        {images.length > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="Foto successiva"
            className="absolute right-4 z-10 grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <footer className="overflow-x-auto px-4 pb-4 pt-3">
          <div className="mx-auto flex w-fit gap-2">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1}`}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg ring-2 transition sm:size-20",
                  i === index ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
