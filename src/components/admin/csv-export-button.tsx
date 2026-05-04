"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  label?: string;
};

// Builds a download link that preserves the current page filters via search
// params (so the CSV reflects the same view the admin is looking at).
export function CsvExportButton({ href, label = "Esporta CSV" }: Props) {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const url = qs ? `${href}?${qs}` : href;

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl"
      render={<Link href={url} prefetch={false} />}
    >
      <Download className="mr-1.5 size-3.5" />
      {label}
    </Button>
  );
}
