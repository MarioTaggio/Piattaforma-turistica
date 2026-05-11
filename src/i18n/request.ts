import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

// Resolve order:
//   1. `requestLocale` passato esplicitamente (es. getTranslations({locale}))
//   2. cookie NEXT_LOCALE
//   3. DEFAULT_LOCALE
export default getRequestConfig(async ({ requestLocale }) => {
  const explicit = await requestLocale;
  let locale: string = DEFAULT_LOCALE;
  if (isLocale(explicit)) {
    locale = explicit;
  } else {
    try {
      const store = await cookies();
      const cookieLocale = store.get(LOCALE_COOKIE)?.value;
      if (isLocale(cookieLocale)) locale = cookieLocale;
    } catch {
      // Niente cookie context (es. background email): resta DEFAULT_LOCALE.
    }
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
