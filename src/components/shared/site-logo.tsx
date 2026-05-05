import Link from "next/link";
import { MountainSnow } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPlatformSettings } from "@/lib/admin/settings";

type Props = {
  href?: string;
  className?: string;
  showText?: boolean;
};

export async function SiteLogo({
  href = "/",
  className,
  showText = true,
}: Props) {
  const settings = await getPlatformSettings();
  const logoUrl = settings.site_logo_url?.trim() || null;
  const siteName = settings.site_nome || "Piattaforma Turistica";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={siteName}
          className="h-9 w-9 rounded-xl object-contain shadow-sm"
        />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <MountainSnow className="size-5" strokeWidth={2.25} />
        </span>
      )}
      {showText && (
        <span className="text-base">
          {siteName.split(" ").length > 1 ? (
            <>
              {siteName.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-brand-600">
                {siteName.split(" ").slice(-1)}
              </span>
            </>
          ) : (
            siteName
          )}
        </span>
      )}
    </Link>
  );
}
