"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Crosshair,
  FlaskConical,
  Package2,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestServiceRequestDialog } from "@/components/services/GuestServiceRequestDialog";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn } from "@/lib/utils";
import {
  buildAuthRedirectHref,
  fetchPublicServiceCategoryCatalog,
  getPublicServiceCategory,
  getPublicServiceCategoryAnalyticsKind,
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategoryTranslationKey,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { onGuestRequestDialogOpen, onServiceCategoryView } from "@/lib/analytics";

const categoryIcons = {
  medicalVisits: Stethoscope,
  imaging: Crosshair,
  labDiagnostics: FlaskConical,
  carePrograms: Package2,
} as const;

const categoryTitleFallbacks: Record<PublicServiceCategoryTranslationKey, string> = {
  medicalVisits: "Medical Visits",
  imaging: "Radiology",
  labDiagnostics: "Lab Diagnostics",
  carePrograms: "Care Programs",
};
const SELECT_CARD_LABEL = "\u0627\u062E\u062A\u0631";
const SELECTED_CARD_LABEL = "\u0645\u062D\u062F\u062F";
const SELECTED_SERVICES_LABEL = "\u062E\u062F\u0645\u0629 \u0645\u062D\u062F\u062F\u0629";
const REQUEST_SELECTED_LABEL = "\u0637\u0644\u0628 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u062D\u062F\u062F\u0629";

export function PublicServiceCategoryExplorer({ slug }: { slug: PublicServiceCategorySlug }) {
  const locale = useLocale();
  const t = useTranslations("serviceExplorer");
  const tNewRequest = useTranslations("newRequestPage");
  const tEnums = useTranslations("enums");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isArabic = locale === "ar";
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";
  const eyebrowClass = isArabic
    ? "text-xs font-medium normal-case tracking-normal"
    : "text-[0.72rem] font-semibold uppercase tracking-[0.24em]";
  const detailLabelClass = isArabic
    ? "text-xs font-medium normal-case tracking-normal"
    : "text-[0.72rem] font-semibold uppercase tracking-[0.22em]";
  const heroBadgeClass = isArabic
    ? "text-xs font-medium normal-case tracking-normal"
    : "text-xs font-semibold uppercase tracking-[0.3em]";
  const navButtonLabelClass = isArabic
    ? "text-sm font-medium normal-case tracking-normal"
    : "text-sm font-semibold normal-case tracking-normal sm:text-xs sm:font-bold sm:tracking-wide";

  const category = getPublicServiceCategory(slug);
  const analyticsServiceKind = getPublicServiceCategoryAnalyticsKind(slug);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [guestRequestOpen, setGuestRequestOpen] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const dataQuery = useQuery({
    queryKey: ["public-category-explorer", slug],
    queryFn: () => fetchPublicServiceCategoryCatalog(slug),
    staleTime: 10 * 60 * 1000,
  });

  const entries = useMemo(() => {
    const data = dataQuery.data?.entries || [];
    if (slug === "lab-diagnostics") {
      return data.filter((entry) => entry.type === "panel" || (entry.type === "package" && entry.packageScope === "LAB_ONLY"));
    }
    return data;
  }, [dataQuery.data?.entries, slug]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return entries;

    return entries.filter((entry) =>
      [entry.name, entry.description || "", entry.categoryName || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [entries, search]);

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        if (next.size >= 5) return prev;
        next.add(entryId);
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const heroBadge = rootRef.current?.querySelector("[data-explorer-hero-badge]");
      const heroTitle = rootRef.current?.querySelector("[data-explorer-hero-title]");
      const heroCopy = rootRef.current?.querySelector("[data-explorer-hero-copy]");
      const heroActions = Array.from(rootRef.current?.querySelectorAll("[data-explorer-hero-actions] > *") || []);
      const heroNav = rootRef.current?.querySelector("[data-explorer-hero-nav]");
      const heroPanel = rootRef.current?.querySelector("[data-explorer-hero-panel]");
      const catalogGrid = rootRef.current?.querySelector("[data-catalog-grid]");
      const catalogCards = Array.from(rootRef.current?.querySelectorAll("[data-catalog-card]") || []);

      if (heroBadge || heroTitle || heroCopy || heroActions.length || heroNav || heroPanel) {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });

        if (heroBadge) timeline.from(heroBadge, { y: 22, autoAlpha: 0 });
        if (heroTitle) timeline.from(heroTitle, { y: 32, autoAlpha: 0 }, "-=0.45");
        if (heroCopy) timeline.from(heroCopy, { y: 28, autoAlpha: 0 }, "-=0.45");
        if (heroActions.length) timeline.from(heroActions, { y: 18, autoAlpha: 0, stagger: 0.08 }, "-=0.4");
        if (heroNav) timeline.from(heroNav, { y: 18, autoAlpha: 0 }, "-=0.4");
        if (heroPanel) timeline.from(heroPanel, { y: 36, autoAlpha: 0, scale: 0.96 }, "-=0.55");
      }

      if (catalogGrid && catalogCards.length) {
        gsap.from(catalogCards, {
          y: 46,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: catalogGrid,
            start: "top 80%",
          },
        });
      }
    }, rootRef);

    return () => context.revert();
  }, [slug]);

  useEffect(() => {
    if (!analyticsServiceKind) {
      return;
    }

    onServiceCategoryView({
      service_slug: slug,
      service_kind: analyticsServiceKind,
      locale,
    });
  }, [analyticsServiceKind, locale, slug]);

  if (!category) {
    return null;
  }

  const CategoryIcon = categoryIcons[category.translationKey];
  const secondaryHref = isAuthenticated
    ? `/${locale}/dashboard`
    : buildAuthRedirectHref(locale, category.defaultRequestPreset, "register");

  const resolveCategoryTitle = (translationKey: PublicServiceCategoryTranslationKey) => {
    const key = `categories.${translationKey}.title` as const;

    try {
      const label = t(key);
      return label && label !== key ? label : categoryTitleFallbacks[translationKey];
    } catch {
      return categoryTitleFallbacks[translationKey];
    }
  };

  const categoryTitle = resolveCategoryTitle(category.translationKey);
  const categorySubtitle = t(`categories.${category.translationKey}.subtitle`);
  const categoryStory = t(`categories.${category.translationKey}.story`);
  const canOpenGuestRequest = entries.length > 0 && !dataQuery.isLoading && !dataQuery.isError;

  const openGuestRequestDialog = () => {
    if (!canOpenGuestRequest) return;

    if (!guestRequestOpen) {
      onGuestRequestDialogOpen({
        service_slug: slug,
        locale,
      });
    }

    setGuestRequestOpen(true);
  };

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[#f8f6ef] pb-16 text-slate-950"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${category.theme.accent}18, transparent 20%), radial-gradient(circle at 88% 12%, ${category.theme.base}14, transparent 18%), linear-gradient(180deg, #f8f6ef 0%, #fbfcfa 46%, #f7faf8 100%)`,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-12">
        <div
          className="overflow-hidden rounded-[2.4rem] border border-white/70"
          style={{
            background: `linear-gradient(135deg, ${category.theme.base} 0%, ${category.theme.secondary} 58%, #0f172a 100%)`,
            boxShadow: `0 36px 120px -60px ${category.theme.shadow}`,
          }}
        >
          <div className="relative overflow-hidden px-4 py-6 md:px-8 md:py-12">
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: category.theme.accent }} />
            <div className="absolute -right-10 top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end lg:gap-8">
              <div className="relative z-10 min-w-0">
                <div
                  data-explorer-hero-badge
                  className={cn(
                    "inline-flex min-h-11 items-center gap-3 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-white backdrop-blur",
                    heroBadgeClass,
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900">
                    <CategoryIcon className="h-4 w-4" />
                  </span>
                  {t(`categories.${category.translationKey}.eyebrow`)}
                </div>

                <div data-explorer-hero-title className="mt-6 min-w-0 max-w-full">
                  <div className={cn("text-white", isArabic ? "text-xs font-medium normal-case tracking-normal" : "text-sm font-semibold uppercase tracking-[0.24em]")}>
                    Curevie
                  </div>
                  <h1 className={cn("font-editorial-display mt-4 max-w-full text-2xl leading-tight text-white md:text-4xl md:leading-[0.92]", displayFontClass)}>
                    {categoryTitle}
                  </h1>
                </div>

                <p
                  data-explorer-hero-copy
                  className="mt-5 max-w-2xl whitespace-normal break-words text-sm leading-7 text-white md:text-base md:leading-8"
                >
                  {categorySubtitle}
                </p>

                <div data-explorer-hero-actions className="mt-8 flex flex-col gap-3 md:flex-row md:flex-wrap">
                  <Button
                    type="button"
                    className="min-h-12 rounded-full border border-white/14 px-6 text-sm font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: category.theme.accent }}
                    onClick={openGuestRequestDialog}
                    disabled={!canOpenGuestRequest}
                  >
                    {t("actions.startRequest")}
                  </Button>
                  <Button asChild variant="outline" className="min-h-12 rounded-full border-white/15 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/15">
                    <Link href={secondaryHref}>
                      {isAuthenticated ? t("actions.goToDashboard") : t("actions.createAccount")}
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div
                    data-explorer-hero-nav
                    dir={isArabic ? "rtl" : "ltr"}
                    className="inline-flex min-w-max gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm sm:rounded-full"
                  >
                    {PUBLIC_SERVICE_CATEGORIES.map((navCat) => {
                      const NavIcon = categoryIcons[navCat.translationKey];
                      const isActive = navCat.slug === slug;

                      return (
                        <Button
                          key={navCat.slug}
                          asChild
                          variant="ghost"
                          className={cn(
                            "min-h-10 shrink-0 rounded-xl px-2.5 py-2 transition-all sm:rounded-full sm:px-3",
                            navButtonLabelClass,
                            isActive
                              ? "bg-white text-slate-950 shadow-sm hover:bg-white/90"
                              : "text-white/80 hover:bg-white/15 hover:text-white",
                          )}
                        >
                          <Link href={`/${locale}/services/${navCat.slug}`}>
                            <NavIcon className="me-2 h-4 w-4" />
                            {resolveCategoryTitle(navCat.translationKey)}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div data-explorer-hero-panel className="relative z-10 mt-4 grid min-w-0 w-full gap-4 md:grid-cols-2 lg:mt-0 lg:w-auto lg:grid-cols-3">
                <div className="min-w-0 rounded-[2rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <div className={cn("text-white", isArabic ? "text-xs font-medium normal-case tracking-normal" : "text-[0.72rem] font-semibold uppercase tracking-[0.22em]")}>
                    {t("stats.liveCatalog")}
                  </div>
                  <div className="mt-3 text-4xl font-semibold text-white">
                    {typeof dataQuery.data?.total === "number" ? dataQuery.data.total.toLocaleString(locale) : "--"}
                  </div>
                  <p className="mt-3 max-w-full whitespace-normal break-words text-sm leading-7 text-white">{categoryStory}</p>
                </div>

                <div className="grid min-w-0 gap-4 md:contents">
                  <div className="min-w-0 rounded-[1.6rem] border border-white/12 bg-black/10 p-5">
                    <div className={cn("text-white", isArabic ? "text-xs font-medium normal-case tracking-normal" : "text-[0.72rem] font-semibold uppercase tracking-[0.22em]")}>
                      {t("stats.searchReady")}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">{t("stats.searchReadyValue")}</div>
                    <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-7 text-white">{t("stats.searchReadyCopy")}</p>
                  </div>
                  <div className="min-w-0 rounded-[1.6rem] border border-white/12 bg-black/10 p-5">
                    <div className={cn("text-white", isArabic ? "text-xs font-medium normal-case tracking-normal" : "text-[0.72rem] font-semibold uppercase tracking-[0.22em]")}>
                      {t("stats.requestPath")}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">{t("stats.requestPathValue")}</div>
                    <p className="mt-2 max-w-full whitespace-normal break-words text-sm leading-7 text-white">{t("stats.requestPathCopy")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#dae5df] bg-white/85 p-4 shadow-[0_28px_80px_-58px_rgba(15,79,72,0.26)] backdrop-blur sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <div className={cn(eyebrowClass)} style={{ color: category.theme.muted }}>
                {t("catalog.eyebrow")}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[#12312d]">{t("catalog.title")}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#617672]">{t("catalog.copy")}</p>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("catalog.searchPlaceholder")}
                className="h-14 w-full rounded-full border border-[#dde7e2] bg-[#f7faf8] ps-11 pe-5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
        </section>

        {dataQuery.isLoading ? (
          <section data-catalog-grid className="mt-8">
            <AppPreloader
              variant="page"
              title={categoryTitle}
              description={categoryStory}
              blockCount={4}
              className="border-[#dae5df] bg-white/90"
            />
          </section>
        ) : dataQuery.isError ? (
          <section className="mt-8 rounded-[2rem] border border-[#eed2d2] bg-white p-8 text-center shadow-[0_22px_70px_-56px_rgba(15,79,72,0.26)]">
            <div className={cn(isArabic ? "text-xs font-medium normal-case tracking-normal text-[#9f6b6b]" : "text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#9f6b6b]")}>
              {t("error.eyebrow")}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">{t("error.title")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("error.copy")}</p>
            <Button
              type="button"
              className="mt-6 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
              onClick={() => dataQuery.refetch()}
            >
              {t("error.retry")}
            </Button>
          </section>
        ) : filteredEntries.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-[#dae5df] bg-white p-8 text-center shadow-[0_22px_70px_-56px_rgba(15,79,72,0.26)]">
            <div className={cn(eyebrowClass)} style={{ color: category.theme.muted }}>
              {t("empty.eyebrow")}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">{t("empty.title")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("empty.copy")}</p>
          </section>
        ) : (
          <section data-catalog-grid className="mt-8 grid gap-5 lg:grid-cols-2">
            {filteredEntries.map((entry) => {
              const isSelected = selectedEntryIds.has(entry.id);
              return (
                <motion.article
                  key={entry.id}
                  data-catalog-card
                  onClick={() => toggleEntry(entry.id)}
                  whileHover={{ y: -7, scale: 1.008 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="h-full cursor-pointer"
                >
                  <div
                    className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white bg-white"
                    style={{
                      background: `linear-gradient(180deg, ${category.theme.soft} 0%, #ffffff 44%, #ffffff 100%)`,
                      boxShadow: `0 30px 82px -58px ${category.theme.shadow}`,
                      outline: isSelected ? `2px solid ${category.theme.base}` : "none",
                      outlineOffset: isSelected ? "-2px" : "0px",
                    }}
                  >
                    {isSelected ? (
                      <div
                        className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg"
                        style={{ backgroundColor: category.theme.base }}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 pe-16">
                      <div>
                        <div className={cn(detailLabelClass)} style={{ color: category.theme.muted }}>
                          {entry.categoryName || t("labels.curatedForHome")}
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#12312d]">{entry.name}</h3>
                      </div>
                      <div
                        className={cn(
                          "rounded-full px-3 py-1",
                          isArabic ? "text-xs font-medium normal-case tracking-normal" : "text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
                        )}
                        style={{
                          color: category.theme.base,
                          backgroundColor: `${category.theme.accent}22`,
                        }}
                      >
                        {entry.type === "service"
                          ? translateEnumValue(entry.serviceKind, tEnums)
                          : entry.type === "panel"
                            ? tNewRequest("labPanel")
                          : entry.type === "lab"
                            ? t("labels.labTest")
                            : entry.packageScope === "LAB_ONLY"
                              ? tNewRequest("labPackage")
                              : t("labels.comprehensiveBundle")}
                      </div>
                    </div>

                    <div className="px-5">
                      <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_20px_56px_-48px_rgba(15,79,72,0.26)]">
                        <div className={cn(detailLabelClass)} style={{ color: category.theme.muted }}>
                          {t("labels.price")}
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[#12312d]">
                          {entry.price === null || entry.price === undefined || !Number.isFinite(entry.price)
                            ? t("labels.priceOnRequest")
                            : formatCurrency(entry.price, locale)}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[#617672]">
                          {entry.description || t("labels.defaultDescription")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                      <div className="space-y-3 rounded-[1.5rem] border border-[#e7eeea] bg-[#fbfcfa] p-4">
                        {entry.type === "service" ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">{t("labels.serviceMode")}</span>
                              <span className="font-semibold text-[#12312d]">
                                {translateEnumValue(entry.serviceKind, tEnums)}
                              </span>
                            </div>
                          </>
                        ) : null}

                        {entry.type === "lab" ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">{t("labels.unit")}</span>
                              <span className="font-semibold text-[#12312d]">{entry.unit || "-"}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">{t("labels.referenceRange")}</span>
                              <span className="max-w-[62%] text-right font-semibold leading-6 text-[#12312d]">
                                {entry.referenceRange || "-"}
                              </span>
                            </div>
                          </>
                        ) : null}

                        {entry.type === "panel" ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">{t("labels.includedTests")}</span>
                              <span className="font-semibold text-[#12312d]">
                                {entry.testsCount.toLocaleString(locale)}
                              </span>
                            </div>
                            {entry.testsPreview.length ? (
                              <div className="pt-1">
                                <div className={cn(isArabic ? "text-xs font-medium normal-case tracking-normal text-[#7b8d89]" : "text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#7b8d89]")}>
                                  {t("labels.preview")}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {entry.testsPreview.map((testName) => (
                                    <span
                                      key={`${entry.id}-${testName}`}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12312d]"
                                    >
                                      {testName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {entry.type === "package" ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">
                                {entry.packageScope === "LAB_ONLY" ? tNewRequest("labPanels") : t("labels.includedServices")}
                              </span>
                              <span className="font-semibold text-[#12312d]">
                                {entry.servicesCount.toLocaleString(locale)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#7b8d89]">{t("labels.includedTests")}</span>
                              <span className="font-semibold text-[#12312d]">
                                {entry.testsCount.toLocaleString(locale)}
                              </span>
                            </div>
                            {(entry.servicesPreview.length || entry.testsPreview.length) ? (
                              <div className="pt-1">
                                <div className={cn(isArabic ? "text-xs font-medium normal-case tracking-normal text-[#7b8d89]" : "text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#7b8d89]")}>
                                  {t("labels.preview")}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {entry.servicesPreview.map((serviceName) => (
                                    <span
                                      key={`${entry.id}-${serviceName}`}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12312d]"
                                    >
                                      {serviceName}
                                    </span>
                                  ))}
                                  {entry.testsPreview.map((testName) => (
                                    <span
                                      key={`${entry.id}-${testName}`}
                                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12312d]"
                                    >
                                      {testName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>

                      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm text-[#617672]">
                          <ShieldCheck className="h-4 w-4" style={{ color: category.theme.base }} />
                          <span>{t("labels.requestReady")}</span>
                        </div>
                        <Button
                          type="button"
                          className="min-h-11 rounded-full px-5 text-sm font-semibold text-white hover:opacity-90"
                          style={{ backgroundColor: isSelected ? "#15803d" : category.theme.base }}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleEntry(entry.id);
                          }}
                        >
                          {isSelected ? SELECTED_CARD_LABEL : SELECT_CARD_LABEL}
                          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </section>
        )}

        <section className="mt-10">
          <div
            className="overflow-hidden rounded-[2rem] border border-[#dbe6e0] px-5 py-6 shadow-[0_28px_80px_-58px_rgba(15,79,72,0.26)] sm:px-6"
            style={{
              background: `linear-gradient(135deg, ${category.theme.soft} 0%, #ffffff 100%)`,
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className={cn(eyebrowClass)} style={{ color: category.theme.muted }}>
                  {t("bottomBand.eyebrow")}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-[#12312d]">{t("bottomBand.title")}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#617672]">{t("bottomBand.copy")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-11 rounded-full px-5 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: category.theme.base }}
                  onClick={openGuestRequestDialog}
                  disabled={!canOpenGuestRequest}
                >
                  {t("actions.startRequest")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button asChild variant="outline" className="min-h-11 rounded-full border-[#dbe6e0] bg-white px-5 text-sm font-semibold text-[#12312d] hover:bg-white">
                  <Link href={`/${locale}`}>{t("actions.backHome")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 px-4 py-3 shadow-lg backdrop-blur transition-transform duration-300",
          selectedEntryIds.size > 0 ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedEntryIds.size} {SELECTED_SERVICES_LABEL}
          </span>
          <Button
            onClick={openGuestRequestDialog}
            style={{ backgroundColor: category.theme.base }}
            className="rounded-full px-6 text-sm font-semibold text-white"
          >
            {REQUEST_SELECTED_LABEL}
          </Button>
        </div>
      </div>

      <GuestServiceRequestDialog
        open={guestRequestOpen}
        onOpenChange={setGuestRequestOpen}
        entries={entries}
        serviceSlug={slug}
        categoryTitle={categoryTitle}
        categoryTheme={category.theme}
        preSelectedEntryIds={Array.from(selectedEntryIds)}
      />
    </div>
  );
}
