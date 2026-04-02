import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "ar"] as const;
export const defaultLocale = "en";
export type AppLocale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

