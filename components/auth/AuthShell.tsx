"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Languages, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Illustration } from "@/components/app/ui";

function LocaleChip() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const target = locale === "en" ? "ar" : "en";
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = target;
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/${segments.join("/")}${search}`);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="app-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-[14px] font-semibold text-[#104d49] shadow-sm ring-1 ring-[#dbe6e0] backdrop-blur dark:bg-white/10 dark:text-teal-100 dark:ring-white/10"
    >
      <Languages className="h-4 w-4" />
      {locale === "en" ? "العربية" : "English"}
    </button>
  );
}

/** Shared layout for sign-in and sign-up: illustrated welcome on top (mobile) or beside the form (desktop). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  compactHero = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  compactHero?: boolean;
}) {
  const locale = useLocale();
  const tApp = useTranslations("app.auth");
  const reduceMotion = useReducedMotion();
  const rise = (delay: number) =>
    reduceMotion ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } };

  return (
    <div className="min-h-[100dvh] bg-[var(--app-bg)] md:min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel (desktop) */}
      <aside className="app-hero relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -start-16 h-80 w-80 rounded-full bg-white/5" />
        <div className="relative max-w-md">
          <h1 className="text-[40px] font-bold leading-tight">{tApp("headline")}</h1>
          <p className="mt-4 text-[17px] leading-8 text-white/80">{tApp("subline")}</p>
        </div>
        <div className="relative flex justify-center">
          <div className="rounded-[40px] bg-white/95 p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
            <Illustration name="welcome" priority className="h-[340px] w-auto" sizes="300px" />
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-[14px] text-white/70">
          <ShieldCheck className="h-4 w-4" />
          {tApp("secure")}
        </p>
      </aside>

      {/* Form column */}
      <section className="relative flex flex-col">
        <div className="bg-gradient-to-b from-[#e3efeb] via-[#edf4f1] to-[var(--app-bg)] px-5 pb-10 pt-4 dark:from-teal-500/10 dark:via-transparent lg:hidden">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}`} aria-label="Curevie">
              <Image src="/1.png" alt="Curevie" width={108} height={36} className="h-9 w-auto object-contain" priority />
            </Link>
            <LocaleChip />
          </div>
          <motion.div {...rise(0)} className="mt-2 flex items-end gap-3">
            <div className="min-w-0 flex-1 pb-3">
              <h1 className="text-[26px] font-bold leading-tight text-[#0b3f3b] dark:text-teal-50">{title}</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#3d5a54] dark:text-muted-foreground">{subtitle}</p>
            </div>
            <Illustration
              name="welcome"
              priority
              className={compactHero ? "h-[130px] w-[92px] shrink-0" : "h-[176px] w-[122px] shrink-0"}
              sizes="140px"
            />
          </motion.div>
        </div>

        <div className="hidden justify-end px-8 pt-6 lg:flex">
          <LocaleChip />
        </div>

        <motion.div {...rise(0.08)} className="-mt-6 flex flex-1 justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-8">
          <div className="w-full max-w-md">
            <div className="app-card rounded-[28px] p-5 shadow-[var(--app-shadow-lg)] sm:p-7">
              <div className="mb-6 hidden lg:block">
                <h2 className="text-[28px] font-bold text-foreground">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </div>
            {footer ? <div className="mt-5 text-center text-[15px] text-muted-foreground">{footer}</div> : null}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground lg:hidden">
              <ShieldCheck className="h-4 w-4 text-[#5a7a50]" />
              {tApp("secure")}
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export const authInputClass =
  "h-[52px] rounded-2xl border-[#dbe6e0] bg-card px-4 text-[16px] shadow-none focus-visible:ring-2 focus-visible:ring-[#86ab62] md:text-[16px] dark:border-border";
export const authLabelClass = "px-1 text-[14px] font-semibold text-foreground";
