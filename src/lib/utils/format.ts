const eurFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const numFmt = new Intl.NumberFormat("it-IT");

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayLongFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function formatEurFromCents(cents: number | null | undefined): string {
  return eurFmt.format((cents ?? 0) / 100);
}

export function formatNumber(n: number | null | undefined): string {
  return numFmt.format(n ?? 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

export function formatDayLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayLongFmt.format(new Date(iso));
}

export function formatDuration(seconds: number | null | undefined): string {
  const s = seconds ?? 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return `${s} sec`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}
