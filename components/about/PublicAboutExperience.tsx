"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Home,
  ShieldCheck,
  Shield,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicAboutExperience() {
  const locale = useLocale();
  const t = useTranslations("publicAbout");
  const prefersReducedMotion = useReducedMotion();
  const isArabic = locale === "ar";
  const rtlBidiStyle = isArabic ? ({ unicodeBidi: "plaintext" } as const) : undefined;
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const principlesRef = useRef<HTMLElement | null>(null);
  const signatureRef = useRef<HTMLElement | null>(null);

  const heroPoints = useMemo(
    () => [
      {
        key: "homeFirst",
        title: t("hero.points.homeFirst.title"),
        copy: t("hero.points.homeFirst.copy"),
      },
      {
        key: "singlePath",
        title: t("hero.points.singlePath.title"),
        copy: t("hero.points.singlePath.copy"),
      },
      {
        key: "documented",
        title: t("hero.points.documented.title"),
        copy: t("hero.points.documented.copy"),
      },
    ],
    [t],
  );

  const pillars = useMemo(
    () => [
      {
        key: "clarity",
        Icon: ShieldCheck,
        accent: "#86ab62",
        surface: "linear-gradient(180deg, rgba(134,171,98,0.16) 0%, rgba(255,255,255,0.96) 58%, rgba(255,255,255,1) 100%)",
      },
      {
        key: "coordination",
        Icon: Stethoscope,
        accent: "#104d49",
        surface: "linear-gradient(180deg, rgba(16,77,73,0.12) 0%, rgba(255,255,255,0.96) 58%, rgba(255,255,255,1) 100%)",
      },
      {
        key: "closure",
        Icon: FileText,
        accent: "#5a7a50",
        surface: "linear-gradient(180deg, rgba(90,122,80,0.14) 0%, rgba(255,255,255,0.96) 58%, rgba(255,255,255,1) 100%)",
      },
    ],
    [],
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.92 } });

      heroTimeline
        .from("[data-about-hero-eyebrow]", { y: 24, autoAlpha: 0 })
        .from("[data-about-hero-title]", { yPercent: 100, autoAlpha: 0, stagger: 0.12 }, "-=0.55")
        .from("[data-about-hero-copy]", { y: 24, autoAlpha: 0 }, "-=0.58")
        .from("[data-about-hero-actions] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.5")
        .from("[data-about-hero-rail]", { y: 28, autoAlpha: 0, scale: 0.97 }, "-=0.62");

      gsap.to("[data-about-orb='left']", {
        xPercent: 7,
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to("[data-about-orb='right']", {
        xPercent: -8,
        yPercent: 9,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.from("[data-about-pillars-intro]", {
        y: 34,
        autoAlpha: 0,
        duration: 0.95,
        ease: "power3.out",
        scrollTrigger: {
          trigger: principlesRef.current,
          start: "top 78%",
        },
      });

      gsap.from("[data-about-pillar]", {
        y: 50,
        autoAlpha: 0,
        stagger: 0.12,
        duration: 0.95,
        ease: "power3.out",
        scrollTrigger: {
          trigger: principlesRef.current,
          start: "top 72%",
        },
      });

      gsap.from("[data-about-signature]", {
        y: 44,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: signatureRef.current,
          start: "top 76%",
        },
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [prefersReducedMotion]);

  const titleLines = [
    {
      key: "line-1",
      text: t("hero.titleLineOne"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(2.25rem,13vw,4.45rem)] leading-[1.02] sm:text-[clamp(2.65rem,9vw,4.5rem)]"
        : "text-[clamp(2.65rem,11vw,5.55rem)] leading-[0.9] sm:text-[clamp(3rem,7vw,5.55rem)]",
    },
    {
      key: "line-2",
      text: t("hero.titleLineTwo"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(2.35rem,13.4vw,4.55rem)] leading-[1.02] sm:text-[clamp(2.7rem,9.2vw,4.6rem)]"
        : "text-[clamp(2.65rem,11vw,5.55rem)] leading-[0.9] sm:text-[clamp(3rem,7vw,5.55rem)]",
    },
    {
      key: "line-3",
      text: t("hero.titleAccent"),
      colorClass: "text-[#86ab62]",
      sizeClass: isArabic
        ? "text-[clamp(2.45rem,13.8vw,4.7rem)] leading-[1.02] sm:text-[clamp(2.8rem,9.4vw,4.72rem)]"
        : "text-[clamp(2.65rem,11vw,5.55rem)] leading-[0.9] sm:text-[clamp(3rem,7vw,5.55rem)]",
    },
  ];

  const primaryHref = `/${locale}/#services`;
  const secondaryHref = `/${locale}/contact`;

  return (
    <div ref={rootRef} className="overflow-hidden bg-[#f5f8f6] text-slate-950">
      <section className="relative isolate overflow-hidden border-b border-[#d9e6df]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(134,171,98,0.18),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(16,77,73,0.18),transparent_24%),linear-gradient(180deg,#f6faf7_0%,#f2f6f3_46%,#fbfcfa_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
        <div
          data-about-orb="left"
          className="perf-drift-slow pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full border border-[#104d49]/10 sm:-left-24 sm:h-[24rem] sm:w-[24rem]"
        />
        <div
          data-about-orb="right"
          className="perf-drift-reverse pointer-events-none absolute right-[-4rem] top-20 h-52 w-52 rounded-full border border-[#86ab62]/20 sm:right-[-5rem] sm:h-[20rem] sm:w-[20rem]"
        />
        <div className="pointer-events-none absolute left-[46%] top-16 hidden h-[32rem] w-px bg-gradient-to-b from-transparent via-white/60 to-transparent xl:block" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-end lg:gap-12">
            <div className="max-w-3xl">
              <div
                data-about-hero-eyebrow
                className={cn(
                  "mb-5 inline-flex max-w-full min-h-11 flex-wrap items-center gap-3 rounded-full border border-[#104d49]/10 bg-white/88 px-4 py-2 text-xs font-semibold text-[#104d49] shadow-[0_20px_60px_-36px_rgba(16,77,73,0.35)] sm:mb-6",
                  isArabic ? "flex-row-reverse tracking-[0.04em]" : "uppercase tracking-[0.32em]",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#104d49] text-white">
                  <Shield className="h-4 w-4" />
                </span>
                {t("hero.eyebrow")}
              </div>

              <h1
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(isArabic ? "space-y-0 text-right" : "space-y-1 text-balance")}
              >
                {titleLines.map((line) => (
                  <span
                    key={line.key}
                    className={cn("block overflow-hidden", isArabic ? "py-2" : "py-0")}
                  >
                    <span
                      data-about-hero-title
                      dir={isArabic ? "rtl" : undefined}
                      style={rtlBidiStyle}
                      className={cn(
                        "block max-w-full font-editorial-display will-change-transform",
                        displayFontClass,
                        line.colorClass,
                        line.sizeClass,
                      )}
                    >
                      {line.text}
                    </span>
                  </span>
                ))}
              </h1>

              <p
                data-about-hero-copy
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(
                  "mt-6 max-w-2xl text-[0.98rem] leading-7 text-[#304a43] sm:text-lg sm:leading-8",
                  isArabic ? "max-w-3xl text-right leading-[1.95rem] sm:leading-[2.1rem]" : "",
                )}
              >
                {t("hero.copy")}
              </p>

              <div data-about-hero-actions className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white transition hover:bg-[#304a43]"
                >
                  {t("hero.primaryCta")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href={secondaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#104d49]/12 bg-white/84 px-6 text-sm font-semibold text-[#104d49] transition hover:bg-white"
                >
                  {t("hero.secondaryCta")}
                </Link>
              </div>
            </div>

            <div
              data-about-hero-rail
              className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-[0_34px_95px_-56px_rgba(16,77,73,0.34)] sm:p-7"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(134,171,98,0.18),transparent_72%)]" />
              <div className="absolute inset-y-0 right-0 w-24 bg-[linear-gradient(180deg,rgba(16,77,73,0.04),transparent_80%)]" />

              <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.24em]")}>
                {t("hero.railEyebrow")}
              </div>
              <h2 className="mt-4 max-w-md text-[1.8rem] font-semibold leading-[1.12] text-[#104d49] sm:text-[2.15rem]">
                {t("hero.railTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[#304a43] sm:text-[0.98rem]">
                {t("hero.railCopy")}
              </p>

              <div className="mt-8 grid gap-3">
                {heroPoints.map((point, index) => (
                  <div
                    key={point.key}
                    className="rounded-[1.35rem] border border-[#104d49]/10 bg-[#f8fbf9] px-4 py-4 shadow-[0_18px_50px_-42px_rgba(16,77,73,0.26)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#104d49] text-white">
                        <span className="text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#104d49]">{point.title}</div>
                        <div className="mt-1 text-sm leading-6 text-[#304a43]">{point.copy}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={principlesRef} className="relative isolate overflow-hidden border-b border-[#d9e6df] bg-[#fbfcfa]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(134,171,98,0.11),transparent_42%)]" />
        <div className="perf-drift-slow pointer-events-none absolute left-[-9rem] top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.08)_0%,rgba(16,77,73,0.02)_44%,transparent_72%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-14">
            <div data-about-pillars-intro className="max-w-xl">
              <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.32em]")}>
                {t("pillars.eyebrow")}
              </div>
              <h2 className={cn("font-editorial-display mt-4 text-[clamp(2.2rem,5.6vw,4rem)] leading-[0.92] text-[#104d49]", displayFontClass)}>
                {t("pillars.title")}
              </h2>
              <p className="mt-5 text-base leading-8 text-[#304a43] sm:text-lg">
                {t("pillars.copy")}
              </p>

              <div className="mt-8 rounded-[1.8rem] border border-[#104d49]/10 bg-white/90 p-6 shadow-[0_28px_80px_-50px_rgba(15,79,72,0.24)]">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#104d49] text-white">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#104d49]">{t("pillars.boardTitle")}</div>
                    <div className="mt-2 text-sm leading-7 text-[#304a43]">{t("pillars.boardCopy")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pillars.map((pillar) => (
                <motion.article
                  key={pillar.key}
                  data-about-pillar
                  whileHover={prefersReducedMotion ? undefined : { y: -12, rotateX: 3, rotateY: isArabic ? -4 : 4 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18, mass: 0.75 }}
                  className="h-full transform-gpu [perspective:1200px]"
                >
                  <div
                    className="group relative flex h-full min-h-[18.5rem] flex-col overflow-hidden rounded-[1.9rem] border border-white bg-white p-5 shadow-[0_30px_90px_-58px_rgba(16,77,73,0.3)]"
                    style={{ background: pillar.surface }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-5 top-0 h-20 translate-y-[-25%] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                      style={{ background: `radial-gradient(circle, ${pillar.accent}1e 0%, transparent 72%)` }}
                    />
                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] text-white shadow-[0_20px_54px_-32px_rgba(0,0,0,0.24)] transition-transform duration-500 group-hover:-translate-y-1"
                        style={{ background: `linear-gradient(145deg, ${pillar.accent} 0%, #104d49 100%)` }}
                      >
                        <pillar.Icon className="h-6 w-6" />
                      </div>
                      <div
                        className={cn(
                          "rounded-full px-3 py-1 text-[0.72rem] font-semibold",
                          isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.2em]",
                        )}
                        style={{ color: pillar.accent, backgroundColor: `${pillar.accent}1a` }}
                      >
                        {t(`pillars.items.${pillar.key}.tag`)}
                      </div>
                    </div>

                    <div className="relative z-10 mt-8">
                      <h3 className="text-[1.55rem] font-semibold leading-[1.16] text-[#104d49]">
                        {t(`pillars.items.${pillar.key}.title`)}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-[#304a43] sm:text-[0.96rem]">
                        {t(`pillars.items.${pillar.key}.copy`)}
                      </p>
                    </div>

                    <div className="relative z-10 mt-auto pt-8">
                      <div className="rounded-[1.35rem] border border-[#104d49]/10 bg-white/78 px-4 py-4 text-sm font-medium leading-6 text-[#104d49]">
                        {t(`pillars.items.${pillar.key}.proof`)}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={signatureRef} className="relative isolate overflow-hidden bg-[#f3f7f4]">
        <div className="perf-drift-slow pointer-events-none absolute left-[-5rem] top-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(134,171,98,0.12)_0%,rgba(134,171,98,0.03)_42%,transparent_72%)]" />
        <div className="perf-drift-reverse pointer-events-none absolute right-[-5rem] bottom-[-2rem] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.1)_0%,rgba(16,77,73,0.02)_44%,transparent_74%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div
            data-about-signature
            className="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/88 p-6 shadow-[0_36px_100px_-60px_rgba(16,77,73,0.3)] sm:p-8 lg:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)] lg:gap-12">
              <div>
                <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.32em]")}>
                  {t("signature.eyebrow")}
                </div>
                <h2 className={cn("font-editorial-display mt-4 text-[clamp(2.15rem,4.8vw,3.6rem)] leading-[0.92] text-[#104d49]", displayFontClass)}>
                  {t("signature.title")}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#304a43] sm:text-lg">
                  {t("signature.copy")}
                </p>

                <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href={primaryHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white transition hover:bg-[#304a43]"
                  >
                    {t("signature.primaryCta")}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={secondaryHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#104d49]/12 bg-[#f6faf8] px-6 text-sm font-semibold text-[#104d49] transition hover:bg-white"
                  >
                    {t("signature.secondaryCta")}
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.9rem] border border-[#104d49]/8 bg-[#f7faf8] p-6">
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-[#104d49]/10 bg-white px-4 py-2 text-sm font-semibold text-[#104d49]">
                    {t("signature.chips.homeFirst")}
                  </span>
                  <span className="rounded-full border border-[#104d49]/10 bg-white px-4 py-2 text-sm font-semibold text-[#104d49]">
                    {t("signature.chips.singlePath")}
                  </span>
                  <span className="rounded-full border border-[#104d49]/10 bg-white px-4 py-2 text-sm font-semibold text-[#104d49]">
                    {t("signature.chips.documented")}
                  </span>
                </div>

                <div className="mt-6 rounded-[1.6rem] bg-[#104d49] px-5 py-6 text-white shadow-[0_28px_70px_-48px_rgba(16,77,73,0.65)]">
                  <div className="text-sm font-semibold text-[#c9ddd5]">Curevie</div>
                  <div className="mt-3 text-lg font-semibold leading-8 sm:text-[1.35rem] sm:leading-9">
                    {t("signature.quote")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
