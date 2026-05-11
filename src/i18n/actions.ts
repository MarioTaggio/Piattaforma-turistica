"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE, isLocale } from "./config";

// Imposta il cookie della lingua. La preferenza è persistente (1 anno) e
// letta sia dal proxy che da `getRequestConfig`. Dopo aver salvato, il path
// passato viene rivalidato così la pagina rirenderizza nella nuova lingua.
export async function setLocale(value: string, revalidate = "/") {
  if (!isLocale(value)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath(revalidate);
}
