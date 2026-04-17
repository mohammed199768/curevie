"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Activity,
  Brain,
  CheckCircle2,
  Crosshair,
  FlaskConical,
  Heart,
  Home,
  Package2,
  Shield,
  Stethoscope,
} from "lucide-react";
import { GuestServiceRequestDialog } from "@/components/services/GuestServiceRequestDialog";
import { onGuestRequestDialogOpen } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  fetchPublicServiceCategoryCatalog,
  fetchPublicServiceCounts,
  PUBLIC_SERVICE_CATEGORIES,
} from "@/lib/public-service-categories";

const categoryIcons = {
  medicalVisits: Stethoscope,
  imaging: Crosshair,
  labDiagnostics: FlaskConical,
  carePrograms: Package2,
  nursingCare: Heart,
  physicalTherapy: Activity,
  occupationalTherapy: Brain,
} as const;

export function PublicHomeExperience() {
  const locale = useLocale();
  const t = useTranslations("homeExperience");
  const prefersReducedMotion = useReducedMotion();
  const isArabic = locale === "ar";
  const rtlBidiStyle = isArabic ? ({ unicodeBidi: "plaintext" } as const) : undefined;
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const workflowRef = useRef<HTMLElement | null>(null);
  const [guestRequestOpen, setGuestRequestOpen] = useState(false);

  const countsQuery = useQuery({
    queryKey: ["public-home", "service-counts"],
    queryFn: fetchPublicServiceCounts,
    staleTime: 10 * 60 * 1000,
  });
  const homeCategoryQueries = useQueries({
    queries: PUBLIC_SERVICE_CATEGORIES.map((category) => ({
      queryKey: ["home-guest-request", locale, category.slug],
      queryFn: () => fetchPublicServiceCategoryCatalog(category.slug, locale),
      staleTime: 10 * 60 * 1000,
    })),
  });


  useLayoutEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) return undefined;

    gsap.registerPlugin(ScrollTrigger);
    const isMobileWorkflow = window.matchMedia("(max-width: 767px)").matches;

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

      heroTimeline
        .from("[data-hero-badge]", { y: 28, autoAlpha: 0 })
        .from("[data-hero-title-line]", { yPercent: 100, autoAlpha: 0, stagger: 0.12 }, "-=0.55")
        .from("[data-hero-copy]", { y: 30, autoAlpha: 0 }, "-=0.55")
        .from("[data-hero-marquee]", { y: 18, autoAlpha: 0 }, "-=0.45")
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
        duration: isMobileWorkflow ? 0.8 : 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: workflowRef.current,
          start: "top 70%",
        },
      });

      if (!isMobileWorkflow) {
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
      }

      const storySteps = gsap.utils.toArray<HTMLElement>("[data-story-step]");
      storySteps.forEach((step) => {
        const marker = step.querySelector<HTMLElement>("[data-story-marker]");
        const card = step.querySelector<HTMLElement>("[data-story-card]");
        const proof = step.querySelector<HTMLElement>("[data-story-proof]");

        if (marker) {
          if (isMobileWorkflow) {
            gsap.from(marker, {
              y: 18,
              autoAlpha: 0,
              scale: 0.92,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: {
                trigger: step,
                start: "top 88%",
                once: true,
              },
            });
          } else {
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
        }

        if (card) {
          if (isMobileWorkflow) {
            gsap.from(card, {
              y: 28,
              autoAlpha: 0,
              duration: 0.65,
              ease: "power2.out",
              scrollTrigger: {
                trigger: step,
                start: "top 88%",
                once: true,
              },
            });
          } else {
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
        }

        if (proof) {
          if (isMobileWorkflow) {
            gsap.from(proof, {
              y: 16,
              autoAlpha: 0,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: {
                trigger: step,
                start: "top 82%",
                once: true,
              },
            });
          } else {
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
        }
      });

      if (!isMobileWorkflow) {
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
      }
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
  const heroTickerCards = isArabic ? [...categoryCards].reverse() : categoryCards;
  const heroMarqueeStyle = isArabic ? ({ animationDuration: "18s" } as const) : undefined;
  const renderHeroTickerItem = (item: (typeof categoryCards)[number], key: string) => (
    <div
      key={key}
      className={cn(
        "flex min-w-max items-center gap-2.5 rounded-full border border-[#104d49]/8 bg-[#f3f7f5] px-3 py-2 font-semibold text-[#104d49] sm:gap-3",
        isArabic
          ? "flex-row-reverse whitespace-nowrap text-[0.76rem] tracking-normal sm:text-[0.82rem]"
          : "text-[0.68rem] uppercase tracking-[0.18em] sm:text-[0.72rem] sm:tracking-[0.22em]",
      )}
    >
      <item.Icon className="h-3.5 w-3.5 text-[#86ab62]" />
      <span dir={isArabic ? "rtl" : undefined} style={rtlBidiStyle}>
        {t(`categories.${item.translationKey}.title`)}
      </span>
    </div>
  );


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
  const boardTickerItems = [...heroTickerCards, ...heroTickerCards];
  const homeDialogEntries = useMemo(
    () =>
      homeCategoryQueries.flatMap((query, index) => {
        const category = PUBLIC_SERVICE_CATEGORIES[index];
        const localizedCategoryTitle = t(`categories.${category.translationKey}.title`);

        return (query.data?.entries || []).map((entry) => ({
          ...entry,
          categoryName: localizedCategoryTitle,
        }));
      }),
    [homeCategoryQueries, t],
  );
  const homeRequestTheme = {
    base: "#104d49",
    secondary: "#304a43",
    accent: "#86ab62",
    soft: "rgba(16, 77, 73, 0.08)",
    muted: "#9c9fa2",
    shadow: "rgba(16, 77, 73, 0.24)",
  } as const;
  const isHomeRequestLoading = homeCategoryQueries.some((query) => query.isLoading);
  const canOpenHomeRequest = homeDialogEntries.length > 0;
  const heroTitleLines = [
    ...(isArabic
      ? [
          {
            key: "line-1",
            segments: [{ text: t("hero.titleLineOne"), className: "" }],
            colorClass: "text-[#104d49]",
            sizeClass:
              "text-[clamp(1.95rem,12vw,4.05rem)] leading-[1.02] sm:text-[clamp(2.18rem,9.4vw,4.05rem)]",
          },
          {
            key: "line-2",
            segments: [{ text: t("hero.titleLineTwo"), className: "" }],
            colorClass: "text-[#104d49]",
            sizeClass:
              "text-[clamp(2rem,12.2vw,4.12rem)] leading-[1.02] sm:text-[clamp(2.22rem,9.6vw,4.12rem)]",
          },
          {
            key: "line-3",
            segments: [{ text: t("hero.titleAccent"), className: "" }],
            colorClass: "text-[#86ab62]",
            fontClass: "",
            sizeClass:
              "text-[clamp(2.05rem,12.6vw,4.18rem)] leading-[1.02] sm:text-[clamp(2.28rem,9.8vw,4.18rem)]",
          },
        ]
      : [
          {
            key: "line-1",
            segments: [{ text: t("hero.titleLineOne"), className: "" }],
            colorClass: "text-[#104d49]",
            sizeClass:
              "text-[clamp(2rem,8.8vw,4.85rem)] leading-[0.94] sm:text-[clamp(2.65rem,7.2vw,5.15rem)]",
          },
          {
            key: "line-2",
            segments: [
              { text: `${t("hero.titleLineTwo")} `, className: "text-[#104d49]" },
              { text: t("hero.titleAccent"), className: "text-[#86ab62] italic" },
            ],
            colorClass: "text-[#104d49]",
            sizeClass:
              "text-[clamp(2rem,8.8vw,4.85rem)] leading-[0.94] sm:text-[clamp(2.65rem,7.2vw,5.15rem)]",
          },
        ]),
  ];

  const openHomeRequestDialog = () => {
    if (!guestRequestOpen) {
      onGuestRequestDialogOpen({
        service_slug: "medical-visits",
        locale,
      });
    }

    setGuestRequestOpen(true);
  };


  return (
    <>
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

              <h1
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(isArabic ? "space-y-0 text-right" : "space-y-1 text-balance")}
              >
                {heroTitleLines.map((line) => (
                  <span
                    key={line.key}
                    className={cn("block overflow-hidden", isArabic ? "py-2" : "py-0")}
                  >
                    <span
                      data-hero-title-line
                      dir={isArabic ? "rtl" : undefined}
                      style={rtlBidiStyle}
                      className={cn(
                        "block max-w-full font-editorial-display will-change-transform",
                        displayFontClass,
                        line.sizeClass,
                        line.colorClass,
                        line.fontClass,
                      )}
                    >
                      {line.segments.map((segment, index) => (
                        <span key={`${line.key}-${index}`} className={segment.className}>
                          {segment.text}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </h1>

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
                  "mt-6 overflow-hidden border border-[#104d49]/10 bg-white/80 px-4 shadow-[0_20px_60px_-40px_rgba(16,77,73,0.28)] sm:mt-8",
                  isArabic ? "rounded-[1.75rem]" : "rounded-full",
                )}
              >
                {isArabic ? (
                  <div className="relative py-2.5 sm:py-3">
                    <div
                      dir="ltr"
                      style={heroMarqueeStyle}
                      className="perf-marquee-rtl-lane flex w-max items-center gap-2.5 sm:gap-3"
                    >
                      {heroTickerCards.map((item, index) => renderHeroTickerItem(item, `hero-ar-primary-${item.slug}-${index}`))}
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center">
                      <div
                        dir="ltr"
                        style={heroMarqueeStyle}
                        className="perf-marquee-rtl-lane-alt flex w-max items-center gap-2.5 sm:gap-3"
                      >
                        {heroTickerCards.map((item, index) => renderHeroTickerItem(item, `hero-ar-secondary-${item.slug}-${index}`))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    dir="ltr"
                    className="perf-marquee-track perf-marquee flex w-max items-center gap-2.5 py-2.5 sm:gap-3 sm:py-3"
                  >
                    {boardTickerItems.map((item, index) => renderHeroTickerItem(item, `hero-en-${item.slug}-${index}`))}
                  </div>
                )}
              </div>

              <div data-hero-actions className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={openHomeRequestDialog}
                  disabled={isHomeRequestLoading && !canOpenHomeRequest}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white transition hover:bg-[#304a43] hover:shadow-[0_8px_32px_-8px_rgba(16,77,73,0.4)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                >
                  {t("hero.requestCta")}
                </button>
                <Link
                  href={`/${locale}/register`}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#104d49]/12 bg-white/88 px-6 text-center text-sm font-semibold text-[#104d49] transition hover:bg-white sm:w-auto"
                >
                  {t("hero.secondaryCta")}
                </Link>
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
                      <Link
                        href={`/${locale}/services`}
                        className="group/title mt-3 inline-flex items-center gap-2 text-xl font-semibold text-white transition hover:text-[#d8ebe2] sm:text-[2rem]"
                      >
                        <h2 className="underline decoration-white/18 underline-offset-8 transition group-hover/title:decoration-white/60">
                          {t("hero.board.title")}
                        </h2>
                      </Link>
                    </div>
                    <div className={cn("self-start rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.24em]")}>
                      {t("hero.board.badge")}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 sm:mt-8 sm:space-y-3">
                    {categoryCards.map((card) => (
                      <Link
                        key={card.slug}
                        href={card.href}
                        className={cn(
                          "group/row flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-white/5 px-3 py-3 transition-all duration-300 hover:bg-white/10 sm:rounded-[1.35rem] sm:px-4 sm:py-4",
                          isArabic ? "hover:-translate-x-2" : "hover:translate-x-2",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={cn("flex items-center gap-2.5", isArabic ? "flex-row-reverse justify-between" : "justify-between")}>
                            <div className="min-w-0 text-[0.9rem] font-semibold leading-5 text-white sm:text-sm">
                              {t(`categories.${card.translationKey}.title`)}
                            </div>
                            <div
                              className={cn(
                                "shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[0.62rem] font-semibold leading-none text-[#d8ebe2] sm:px-2.5 sm:text-[0.68rem]",
                                isArabic ? "tracking-[0.03em]" : "uppercase tracking-[0.16em]",
                              )}
                            >
                              {card.countLabel}
                            </div>
                          </div>
                          <div className="mt-1 text-[0.76rem] leading-[1.15rem] text-[#a9cfc8] sm:text-sm sm:leading-5">
                            {t(`categories.${card.translationKey}.short`)}
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
            <div className="absolute start-[1.7rem] top-8 hidden h-[calc(100%-4rem)] w-px bg-white/10 md:block" />
            <div
              data-story-line
              className="absolute start-[1.7rem] top-8 hidden h-[calc(100%-4rem)] w-px origin-top bg-gradient-to-b from-[#86ab62] via-[#d8e7df] to-transparent md:block"
            />

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

      <GuestServiceRequestDialog
        open={guestRequestOpen}
        onOpenChange={setGuestRequestOpen}
        entries={homeDialogEntries}
        serviceSlug="medical-visits"
        categoryTitle={t("hero.requestDialogTitle")}
        categoryTheme={homeRequestTheme}
      />
    </>
  );
}
