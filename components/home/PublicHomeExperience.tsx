"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Crosshair,
  FlaskConical,
  Home,
  Package2,
  Shield,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  buildAuthRedirectHref,
  buildNewRequestHref,
  fetchPublicServiceCounts,
  PUBLIC_SERVICE_CATEGORIES,
} from "@/lib/public-service-categories";

const categoryIcons = {
  medicalVisits: Stethoscope,
  imaging: Crosshair,
  labDiagnostics: FlaskConical,
  carePrograms: Package2,
} as const;

export function PublicHomeExperience() {
  const locale = useLocale();
  const t = useTranslations("homeExperience");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const prefersReducedMotion = useReducedMotion();
  const isArabic = locale === "ar";
  const rtlBidiStyle = isArabic ? ({ unicodeBidi: "plaintext" } as const) : undefined;
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const servicesRef = useRef<HTMLElement | null>(null);
  const workflowRef = useRef<HTMLElement | null>(null);

  const countsQuery = useQuery({
    queryKey: ["public-home", "service-counts"],
    queryFn: fetchPublicServiceCounts,
    staleTime: 10 * 60 * 1000,
  });

  const totalCatalogCount = useMemo(() => {
    if (!countsQuery.data) return 0;
    return Object.values(countsQuery.data).reduce((sum, value) => sum + Number(value || 0), 0);
  }, [countsQuery.data]);

  const readyHref = isAuthenticated
    ? buildNewRequestHref(locale, { serviceType: "MEDICAL" })
    : buildAuthRedirectHref(locale, { serviceType: "MEDICAL" });

  useLayoutEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

      heroTimeline
        .from("[data-hero-badge]", { y: 28, autoAlpha: 0 })
        .from("[data-hero-title-line]", { yPercent: 100, autoAlpha: 0, stagger: 0.12 }, "-=0.55")
        .from("[data-hero-copy]", { y: 30, autoAlpha: 0 }, "-=0.55")
        .from("[data-hero-marquee]", { y: 18, autoAlpha: 0 }, "-=0.45")
        .from("[data-hero-actions] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.45")
        .from("[data-hero-metric]", { y: 18, autoAlpha: 0, stagger: 0.08 }, "-=0.45")
        .from("[data-hero-panel]", { y: 32, autoAlpha: 0, scale: 0.96, stagger: 0.12 }, "-=0.65");

      gsap.to("[data-hero-panel]", {
        yPercent: -4,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to("[data-hero-orbit='left']", {
        xPercent: 6,
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to("[data-hero-orbit='right']", {
        xPercent: -8,
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.from("[data-service-intro]", {
        y: 36,
        autoAlpha: 0,
        duration: 0.95,
        ease: "power3.out",
        scrollTrigger: {
          trigger: servicesRef.current,
          start: "top 80%",
        },
      });

      gsap.from("[data-service-card]", {
        y: 62,
        autoAlpha: 0,
        scale: 0.94,
        stagger: 0.14,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: {
          trigger: servicesRef.current,
          start: "top 74%",
        },
      });

      gsap.from("[data-story-intro]", {
        y: 40,
        autoAlpha: 0,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: workflowRef.current,
          start: "top 76%",
        },
      });

      gsap.from("[data-story-intro-panel]", {
        y: 54,
        autoAlpha: 0,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: workflowRef.current,
          start: "top 70%",
        },
      });

      gsap.fromTo(
        "[data-story-line]",
        { scaleY: 0, transformOrigin: "top center" },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-story-steps]",
            start: "top 60%",
            end: "bottom 70%",
            scrub: true,
          },
        },
      );

      const storySteps = gsap.utils.toArray<HTMLElement>("[data-story-step]");
      storySteps.forEach((step) => {
        const marker = step.querySelector<HTMLElement>("[data-story-marker]");
        const card = step.querySelector<HTMLElement>("[data-story-card]");
        const proof = step.querySelector<HTMLElement>("[data-story-proof]");

        if (marker) {
          gsap.fromTo(
            marker,
            { y: 34, autoAlpha: 0, scale: 0.78 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: step,
                start: "top 88%",
                end: "top 62%",
                scrub: 0.9,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (card) {
          gsap.fromTo(
            card,
            { y: 96, autoAlpha: 0, scale: 0.96 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: step,
                start: "top 90%",
                end: "top 58%",
                scrub: 1,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (proof) {
          gsap.fromTo(
            proof,
            { y: 26, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: step,
                start: "top 82%",
                end: "top 60%",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            },
          );
        }
      });

      gsap.to("[data-story-current='left']", {
        yPercent: -10,
        xPercent: 4,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-story-steps]",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to("[data-story-current='right']", {
        yPercent: 8,
        xPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-story-steps]",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [isArabic, prefersReducedMotion]);

  const categoryCards = PUBLIC_SERVICE_CATEGORIES.map((category) => {
    const Icon = categoryIcons[category.translationKey];
    const count = countsQuery.data?.[category.translationKey];

    return {
      ...category,
      Icon,
      href: `/${locale}/services/${category.slug}`,
      countLabel: typeof count === "number" ? t("categories.countLabel", { count }) : t("categories.countPending"),
    };
  });

  const serviceBackdropOrbs = [
    {
      key: "orb-left-top",
      className: "left-[4%] top-20 h-28 w-28 sm:h-32 sm:w-32",
      motionClass: "perf-drift-slow",
      shadow: "0 0 0 1px rgba(255,255,255,0.88), 0 22px 56px -30px rgba(16,77,73,0.18), inset 0 0 0 1px rgba(255,255,255,0.28)",
      innerShadow: "0 0 0 1px rgba(255,255,255,0.44)",
    },
    {
      key: "orb-left-center",
      className: "left-[11%] top-[42%] h-36 w-36 sm:h-40 sm:w-40",
      motionClass: "perf-drift-reverse",
      shadow: "0 0 0 1px rgba(255,255,255,0.8), 0 30px 74px -38px rgba(90,122,80,0.28), inset 0 0 0 1px rgba(255,255,255,0.24)",
      innerShadow: "0 0 0 1px rgba(134,171,98,0.28)",
    },
    {
      key: "orb-right-top",
      className: "right-[7%] top-16 h-32 w-32 sm:h-36 sm:w-36",
      motionClass: "perf-drift-slow",
      shadow: "0 0 0 1px rgba(255,255,255,0.86), 0 24px 60px -34px rgba(16,77,73,0.2), inset 0 0 0 1px rgba(255,255,255,0.26)",
      innerShadow: "0 0 0 1px rgba(255,255,255,0.4)",
    },
    {
      key: "orb-right-bottom",
      className: "right-[13%] bottom-14 h-40 w-40 sm:h-44 sm:w-44",
      motionClass: "perf-drift-reverse",
      shadow: "0 0 0 1px rgba(255,255,255,0.78), 0 32px 78px -40px rgba(134,171,98,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)",
      innerShadow: "0 0 0 1px rgba(134,171,98,0.24)",
    },
  ] as const;

  const workflowSteps = [
    {
      key: "step1" as const,
      index: "01",
      Icon: Crosshair,
      accent: "#86ab62",
      glow: "radial-gradient(circle at 16% 18%, rgba(134,171,98,0.22), transparent 55%)",
    },
    {
      key: "step2" as const,
      index: "02",
      Icon: Shield,
      accent: "#9c9fa2",
      glow: "radial-gradient(circle at 18% 20%, rgba(156,159,162,0.2), transparent 55%)",
    },
    {
      key: "step3" as const,
      index: "03",
      Icon: Home,
      accent: "#86ab62",
      glow: "radial-gradient(circle at 22% 22%, rgba(90,122,80,0.24), transparent 56%)",
    },
    {
      key: "step4" as const,
      index: "04",
      Icon: CheckCircle2,
      accent: "#d7e7df",
      glow: "radial-gradient(circle at 20% 18%, rgba(215,231,223,0.18), transparent 56%)",
    },
  ];
  const boardTickerItems = [...categoryCards, ...categoryCards];
  const heroTitleLines = [
    {
      key: "line-1",
      text: t("hero.titleLineOne"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(1.95rem,12vw,4.05rem)] leading-[1.02] sm:text-[clamp(2.18rem,9.4vw,4.05rem)]"
        : "text-[clamp(2.45rem,10.8vw,5.4rem)] leading-[0.9] sm:text-[clamp(2.9rem,8vw,5.4rem)]",
    },
    {
      key: "line-2",
      text: t("hero.titleLineTwo"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(2rem,12.2vw,4.12rem)] leading-[1.02] sm:text-[clamp(2.22rem,9.6vw,4.12rem)]"
        : "text-[clamp(2.45rem,10.8vw,5.4rem)] leading-[0.9] sm:text-[clamp(2.9rem,8vw,5.4rem)]",
    },
    {
      key: "line-3",
      text: t("hero.titleAccent"),
      colorClass: "text-[#86ab62]",
      fontClass: isArabic ? "" : "italic",
      sizeClass: isArabic
        ? "text-[clamp(2.05rem,12.6vw,4.18rem)] leading-[1.02] sm:text-[clamp(2.28rem,9.8vw,4.18rem)]"
        : "text-[clamp(2.45rem,10.8vw,5.4rem)] leading-[0.9] sm:text-[clamp(2.9rem,8vw,5.4rem)]",
    },
  ];

  const scrollToSection = (target: "services" | "workflow") => {
    const element = target === "services" ? servicesRef.current : workflowRef.current;
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={rootRef} className="overflow-hidden bg-[#f5f8f6] text-slate-950">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(134,171,98,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(16,77,73,0.26),transparent_24%),linear-gradient(180deg,#f5f8f6_0%,#f2f6f4_42%,#fbfcfa_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/70" />
        <div
          data-hero-orbit="left"
          className="perf-drift-slow pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full border border-[#104d49]/10 sm:-left-24 sm:top-12 sm:h-[22rem] sm:w-[22rem]"
        />
        <div
          data-hero-orbit="right"
          className="perf-drift-reverse pointer-events-none absolute right-[-3rem] top-16 h-40 w-40 rounded-full border border-[#86ab62]/25 sm:right-[-5rem] sm:top-20 sm:h-[18rem] sm:w-[18rem]"
        />
        <div className="perf-drift-slow pointer-events-none absolute left-[42%] top-10 hidden h-[28rem] w-px bg-gradient-to-b from-transparent via-white/45 to-transparent xl:block" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid gap-8 md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="min-w-0 max-w-3xl">
              <div
                data-hero-badge
                className={cn(
                  "mb-5 inline-flex max-w-full min-h-11 flex-wrap items-center gap-3 rounded-full border border-[#104d49]/10 bg-white/88 px-4 py-2 text-xs font-semibold text-[#104d49] shadow-[0_20px_60px_-36px_rgba(16,77,73,0.35)] sm:mb-6",
                  isArabic ? "flex-row-reverse tracking-[0.04em]" : "uppercase tracking-[0.32em]",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#104d49] text-white">
                  <Home className="h-4 w-4" />
                </span>
                {t("hero.eyebrow")}
              </div>

              <div
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(isArabic ? "space-y-0 text-right" : "space-y-1 text-balance")}
              >
                {heroTitleLines.map((line) => (
                  <div key={line.key} className={cn("overflow-hidden", isArabic ? "py-2" : "py-0")}>
                    <div
                      data-hero-title-line
                      dir={isArabic ? "rtl" : undefined}
                      style={rtlBidiStyle}
                      className={cn(
                        "max-w-full font-editorial-display will-change-transform",
                        displayFontClass,
                        line.sizeClass,
                        line.colorClass,
                        line.fontClass,
                      )}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>

              <p
                data-hero-copy
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(
                  "mt-5 max-w-2xl text-[0.98rem] leading-7 text-[#304a43] sm:mt-6 sm:text-lg sm:leading-8",
                  isArabic ? "max-w-3xl text-right leading-[1.95rem] sm:leading-[2.1rem]" : "",
                )}
              >
                {t("hero.copy")}
              </p>

              <div
                data-hero-marquee
                className={cn(
                  "mt-6 overflow-hidden border border-[#104d49]/10 bg-white/80 shadow-[0_20px_60px_-40px_rgba(16,77,73,0.28)] sm:mt-8",
                  isArabic ? "rounded-[1.75rem]" : "rounded-full",
                )}
              >
                <div
                  dir={isArabic ? "rtl" : undefined}
                  style={rtlBidiStyle}
                  className={cn(
                    "flex w-max min-w-full items-center gap-2.5 py-2.5 sm:gap-3 sm:py-3",
                    isArabic
                      ? "perf-marquee-rtl px-3 sm:px-4"
                      : "perf-marquee px-4",
                  )}
                >
                  {boardTickerItems.map((item, index) => (
                    <div
                      key={`${item.slug}-${index}`}
                      className={cn(
                        "flex min-w-max items-center gap-2.5 rounded-full border border-[#104d49]/8 bg-[#f3f7f5] px-3 py-2 font-semibold text-[#104d49] sm:gap-3",
                        isArabic
                          ? "flex-row-reverse text-[0.76rem] tracking-[0.02em] sm:text-[0.82rem]"
                          : "text-[0.68rem] uppercase tracking-[0.18em] sm:text-[0.72rem] sm:tracking-[0.22em]",
                      )}
                    >
                      <item.Icon className="h-3.5 w-3.5 text-[#86ab62]" />
                      <span dir={isArabic ? "rtl" : undefined} style={rtlBidiStyle}>
                        {t(`categories.${item.translationKey}.title`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div data-hero-actions className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  className="min-h-12 w-full rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white hover:bg-[#304a43] sm:w-auto"
                  onClick={() => scrollToSection("services")}
                >
                  {t("hero.primaryCta")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full rounded-full border-[#104d49]/15 bg-white/75 px-6 text-sm font-semibold text-[#104d49] hover:bg-white sm:w-auto"
                  onClick={() => scrollToSection("workflow")}
                >
                  {t("hero.secondaryCta")}
                </Button>
                <Link
                  href={readyHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold text-[#104d49] transition hover:text-[#304a43] sm:justify-start"
                >
                  {t("hero.readyLink")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  data-hero-metric
                  className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_-42px_rgba(15,79,72,0.35)]"
                >
                  <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.26em]")}>
                    {t("hero.metrics.catalogLabel")}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#104d49]">
                    {countsQuery.data ? totalCatalogCount.toLocaleString(locale) : "--"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#304a43]">{t("hero.metrics.catalogCopy")}</p>
                </div>
                <div
                  data-hero-metric
                  className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_-42px_rgba(15,79,72,0.35)]"
                >
                  <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.26em]")}>
                    {t("hero.metrics.streamsLabel")}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#104d49]">4</div>
                  <p className="mt-2 text-sm leading-6 text-[#304a43]">{t("hero.metrics.streamsCopy")}</p>
                </div>
                <div
                  data-hero-metric
                  className="rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_60px_-42px_rgba(15,79,72,0.35)]"
                >
                  <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.26em]")}>
                    {t("hero.metrics.followupLabel")}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#104d49]">
                    {t("hero.metrics.followupValue")}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#304a43]">{t("hero.metrics.followupCopy")}</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto min-h-0 w-full max-w-xl lg:max-w-none lg:min-h-[30rem]">
              <div
                data-hero-panel
                className="perf-float-panel group/board relative overflow-hidden rounded-[1.7rem] border border-white/70 p-4 shadow-[0_34px_120px_-50px_rgba(15,79,72,0.48)] sm:rounded-[2rem] sm:p-6"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(15,79,72,0.98) 0%, rgba(19,59,54,0.98) 55%, rgba(9,29,34,0.98) 100%)",
                }}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[#86ab62]" />
                <div className="perf-sheen pointer-events-none absolute inset-y-0 left-[-20%] w-24 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.18)_45%,transparent_100%)] opacity-35" />
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_42%,transparent_70%)] opacity-80" />
                <div className="relative">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className={cn("text-[0.72rem] font-semibold text-[#a9cfc8]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.28em]")}>
                        {t("hero.board.eyebrow")}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-white sm:text-[2rem]">
                        {t("hero.board.title")}
                      </h2>
                    </div>
                    <div className={cn("self-start rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.24em]")}>
                      {t("hero.board.badge")}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 sm:mt-8">
                    {categoryCards.map((card) => (
                      <Link
                        key={card.slug}
                        href={card.href}
                        className={cn(
                          "group/row flex flex-col gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 transition-all duration-300 hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                          isArabic ? "hover:-translate-x-2" : "hover:translate-x-2",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {t(`categories.${card.translationKey}.title`)}
                          </div>
                          <div className="mt-1 text-sm text-[#a9cfc8]">
                            {t(`categories.${card.translationKey}.short`)}
                          </div>
                        </div>
                        <div className={cn("w-full sm:w-auto", isArabic ? "text-right" : "text-left sm:text-right")}>
                          <div className="text-xl font-semibold text-white">
                            {typeof countsQuery.data?.[card.translationKey] === "number"
                              ? countsQuery.data[card.translationKey].toLocaleString(locale)
                              : "--"}
                          </div>
                          <div className={cn("text-[0.72rem] text-[#a9cfc8]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.18em]")}>
                            {t("hero.board.countLabel")}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" ref={servicesRef} className="relative isolate overflow-hidden border-y border-[#d9e6df] bg-[#fbfcfa]">
        <div className="absolute inset-x-0 top-0 h-px bg-white" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(134,171,98,0.11),transparent_42%)]" />
        <div className="perf-drift-slow pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.11)_0%,rgba(16,77,73,0.03)_38%,transparent_70%)]" />
        <div className="perf-drift-reverse pointer-events-none absolute bottom-[-7rem] right-[-5rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(134,171,98,0.12)_0%,rgba(134,171,98,0.03)_40%,transparent_72%)]" />
        {serviceBackdropOrbs.map((orb) => (
          <div
            key={orb.key}
            className={cn(
              orb.motionClass,
              "pointer-events-none absolute rounded-full border border-white/90 opacity-95",
              orb.className,
            )}
            style={{ boxShadow: orb.shadow }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-[12%] rounded-full border border-white/45"
              style={{ boxShadow: orb.innerShadow }}
            />
          </div>
        ))}

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div data-service-intro className="max-w-3xl">
            <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.32em]")}>
              {t("categories.eyebrow")}
            </div>
            <h2 className={cn("font-editorial-display mt-4 text-[clamp(2.3rem,6vw,4.1rem)] leading-[0.92] text-[#104d49]", displayFontClass)}>
              {t("categories.title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#304a43] sm:text-lg">
              {t("categories.copy")}
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
            {categoryCards.map((card, index) => (
              <motion.article
                key={card.slug}
                data-service-card
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -14,
                        rotateX: 3,
                        rotateY: isArabic ? -5 : 5,
                      }
                }
                transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.7 }}
                className="h-full transform-gpu [perspective:1200px]"
              >
                <Link
                  href={card.href}
                  className="group relative flex h-full min-h-[22rem] transform-gpu flex-col overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-[0_34px_80px_-52px_rgba(15,79,72,0.34)] transition-[box-shadow,transform] duration-500 hover:shadow-[0_42px_110px_-52px_rgba(15,79,72,0.42)]"
                  style={{
                    background: `linear-gradient(180deg, ${card.theme.soft} 0%, #ffffff 54%, #ffffff 100%)`,
                    boxShadow: `0 34px 80px -52px ${card.theme.shadow}`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className={cn(
                        "absolute top-8 h-28 w-28 rounded-full opacity-0 transition-[opacity,transform] duration-500 group-hover:opacity-100",
                        isArabic ? "-left-12 -translate-x-6 group-hover:translate-x-0" : "-right-12 translate-x-6 group-hover:translate-x-0",
                      )}
                      style={{ backgroundColor: `${card.theme.accent}26` }}
                    />
                    <div
                      className="absolute inset-x-5 top-0 h-20 translate-y-[-30%] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                      style={{ background: `radial-gradient(circle, ${card.theme.accent}22 0%, transparent 72%)` }}
                    />
                    <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute inset-y-0 left-0 w-1 scale-y-0 rounded-full transition-transform duration-500 group-hover:scale-y-100" style={{ backgroundColor: card.theme.base }} />
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] text-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-3"
                      style={{
                        background: `linear-gradient(145deg, ${card.theme.base} 0%, ${card.theme.secondary} 100%)`,
                      }}
                    >
                      <card.Icon className="h-6 w-6" />
                    </div>
                    <div
                      className={cn(
                        "rounded-full px-3 py-1 text-[0.72rem] font-semibold",
                        isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.2em]",
                      )}
                      style={{
                        color: card.theme.base,
                        backgroundColor: `${card.theme.accent}20`,
                      }}
                    >
                      {t(`categories.${card.translationKey}.eyebrow`)}
                    </div>
                  </div>

                  <div className="relative z-10 mt-8">
                    <div
                      className={cn("text-sm font-semibold", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.22em]")}
                      style={{ color: card.theme.muted }}
                    >
                      {card.countLabel}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#104d49]">
                      {t(`categories.${card.translationKey}.title`)}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#304a43]">
                      {t(`categories.${card.translationKey}.summary`)}
                    </p>
                  </div>

                  <div className="relative z-10 mt-7 flex items-center justify-between gap-3 rounded-[1.2rem] border border-[#104d49]/8 bg-white/70 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="perf-pulse-ring relative h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.theme.accent }} />
                      <span className="text-sm font-semibold text-[#104d49]">
                        {typeof countsQuery.data?.[card.translationKey] === "number"
                          ? countsQuery.data[card.translationKey].toLocaleString(locale)
                          : "--"}
                      </span>
                    </div>
                    <div className="text-[0.72rem] font-semibold text-[#9c9fa2]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto pt-8">
                    <div
                      className="rounded-[1.4rem] border px-4 py-4 transition-transform duration-500 group-hover:-translate-y-1"
                      style={{
                        borderColor: `${card.theme.base}12`,
                        backgroundColor: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <div
                        className={cn("text-[0.72rem] font-semibold", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.22em]")}
                        style={{ color: card.theme.muted }}
                      >
                        {t(`categories.${card.translationKey}.routeLabel`)}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-4 text-sm font-semibold" style={{ color: card.theme.base }}>
                        <span>{t("categories.cardCta")}</span>
                        <ArrowUpRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-500",
                            isArabic
                              ? "group-hover:-translate-x-1 group-hover:-translate-y-0.5"
                              : "group-hover:translate-x-1 group-hover:-translate-y-0.5",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section ref={workflowRef} className="relative isolate overflow-hidden bg-[#104d49] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(134,171,98,0.17),transparent_24%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,#104d49_0%,#0d4440_28%,#0a3734_62%,#072b29_100%)]" />
        <div data-story-current="left" className="perf-drift-slow pointer-events-none absolute left-[-6rem] top-12 h-64 w-64 rounded-full border border-white/10 opacity-60" />
        <div data-story-current="right" className="perf-drift-reverse pointer-events-none absolute right-[-3rem] top-24 h-48 w-48 rounded-full border border-[#86ab62]/25 opacity-70" />
        <div className="pointer-events-none absolute inset-y-0 left-[12%] hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent xl:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(4,19,24,0.34)_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 sm:pb-28 lg:grid lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start lg:gap-16 lg:px-8 lg:pt-28 lg:pb-44">
          <div data-story-pin className="max-w-2xl lg:sticky lg:top-24 lg:self-start">
            <div data-story-intro className="max-w-2xl">
              <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.32em]")}>
                {t("workflow.eyebrow")}
              </div>
              <h2 className={cn("font-editorial-display mt-4 text-[clamp(2.3rem,5vw,4.1rem)] leading-[0.92] text-white", displayFontClass)}>
                {t("workflow.title")}
              </h2>
              <p className="mt-5 text-base leading-8 text-white/82 sm:text-lg">
                {t("workflow.copy")}
              </p>

              <div data-story-intro-panel className="group relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_28px_80px_-50px_rgba(0,0,0,0.45)] transition-transform duration-500 hover:-translate-y-1">
                <div className="perf-sheen pointer-events-none absolute inset-y-0 left-[-25%] w-24 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.14)_45%,transparent_100%)] opacity-20" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="relative flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#86ab62] text-[#104d49] shadow-[0_16px_42px_-24px_rgba(134,171,98,0.7)]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{t("workflow.assuranceTitle")}</div>
                    <div className="mt-2 text-sm leading-7 text-white/74">{t("workflow.assuranceCopy")}</div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.35rem] border border-white/8 bg-black/10 px-4 py-4">
                        <div className={cn("text-[0.68rem] font-semibold text-white/44", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.2em]")}>
                          {t("workflow.step1.eyebrow")}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/84">{t("workflow.step1.proof")}</div>
                      </div>
                      <div className="rounded-[1.35rem] border border-white/8 bg-black/10 px-4 py-4">
                        <div className={cn("text-[0.68rem] font-semibold text-white/44", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.2em]")}>
                          {t("workflow.step4.eyebrow")}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-white/84">{t("workflow.step4.proof")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-story-steps className="relative mt-10 lg:mt-0 lg:pt-10">
            <div className="absolute start-[1.7rem] top-8 h-[calc(100%-4rem)] w-px bg-white/10" />
            <div data-story-line className="absolute start-[1.7rem] top-8 h-[calc(100%-4rem)] w-px origin-top bg-gradient-to-b from-[#86ab62] via-[#d8e7df] to-transparent" />

            <div className="space-y-10 lg:space-y-16 xl:space-y-20">
              {workflowSteps.map((step, index) => (
                <motion.article
                  key={step.key}
                  data-story-step
                  whileHover={prefersReducedMotion ? undefined : { x: isArabic ? -8 : 8, y: -4 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  className={cn(
                    "relative grid gap-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-start",
                    index % 2 === 1 ? "lg:ms-12" : "lg:ms-0",
                  )}
                >
                  <div className="relative flex justify-start sm:justify-center">
                    <div
                      data-story-marker
                      className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#123f3b] shadow-[0_22px_55px_-32px_rgba(0,0,0,0.45)]"
                    >
                      <div className="perf-pulse-ring absolute inset-0 rounded-full border border-white/10" />
                      <div
                        className="absolute inset-[0.45rem] rounded-full opacity-60"
                        style={{ background: `radial-gradient(circle, ${step.accent} 0%, transparent 72%)` }}
                      />
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0e3532] text-white">
                        <step.Icon className="h-[18px] w-[18px]" />
                      </div>
                    </div>
                  </div>
                  <div
                    data-story-card
                    className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.45)] transition-transform duration-300"
                    style={{ backgroundImage: step.glow }}
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 translate-x-8 bg-[linear-gradient(135deg,rgba(134,171,98,0.12),transparent_70%)] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold text-white/78">{step.index}</div>
                            <div className="h-px flex-1 bg-white/10" />
                          </div>
                          <div className={cn("mt-4 text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.08em]" : "uppercase tracking-[0.22em]")}>
                            {t(`workflow.${step.key}.eyebrow`)}
                          </div>
                        </div>
                        <div
                          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 sm:flex"
                          style={{ backgroundColor: `${step.accent}18`, color: step.accent }}
                        >
                          <step.Icon className="h-[18px] w-[18px]" />
                        </div>
                      </div>
                      <h3 className="mt-4 text-[1.65rem] font-semibold leading-[1.18] text-white sm:text-[1.8rem]">
                        {t(`workflow.${step.key}.title`)}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-white/78 sm:text-[0.96rem]">
                        {t(`workflow.${step.key}.copy`)}
                      </p>
                      <div
                        data-story-proof
                        className="mt-5 rounded-[1.35rem] border px-4 py-4 text-sm font-medium leading-6 text-[#eef7f3]"
                        style={{ borderColor: `${step.accent}2b`, backgroundColor: "rgba(5, 18, 21, 0.18)" }}
                      >
                        {t(`workflow.${step.key}.proof`)}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
