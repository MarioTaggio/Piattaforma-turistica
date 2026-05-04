import Link from "next/link";
import { MountainSnow } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  className?: string;
  showText?: boolean;
};

export function SiteLogo({ href = "/", className, showText = true }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <MountainSnow className="size-5" strokeWidth={2.25} />
      </span>
      {showText && (
        <span className="text-base">
          Piattaforma <span className="text-brand-600">Turistica</span>
        </span>
      )}
    </Link>
  );
}
