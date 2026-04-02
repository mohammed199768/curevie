"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

const testimonialKeys = ["first", "second", "third"] as const;

export function Testimonials() {
  const t = useTranslations("testimonials");

  return (
    <section className="bg-green-50 py-16 dark:bg-green-950/20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonialKeys.map((itemKey) => (
            <article key={itemKey} className="rounded-2xl bg-white p-6 shadow-lg dark:bg-card">
              <div className="mb-3 flex gap-1 text-yellow-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={`${itemKey}-${i}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">"{t(`${itemKey}.text`)}"</p>
              <p className="mt-4 text-sm font-semibold">
                {t(`${itemKey}.name`)} {" · "} {t(`${itemKey}.city`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
