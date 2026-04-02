"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  locale: string;
  onBookWithoutAccount: () => void;
}

export function CTASection({ locale, onBookWithoutAccount }: CTASectionProps) {
  const t = useTranslations("cta");

  return (
    <section className="hero-gradient py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
        <h2 className="text-3xl font-bold">{t("title")}</h2>
        <p className="mt-3 max-w-2xl text-white/90">{t("subtitle")}</p>
        <Button asChild className="mt-6 rounded-full bg-white px-8 text-primary hover:bg-gray-100">
          <Link href={`/${locale}/register`}>{t("createAccount")}</Link>
        </Button>
        <button type="button" onClick={onBookWithoutAccount} className="mt-4 text-sm underline underline-offset-4">
          {t("bookWithoutAccount")}
        </button>
      </div>
    </section>
  );
}

