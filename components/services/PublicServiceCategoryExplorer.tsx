"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Activity,
  Check,
  ArrowRight,
  Brain,
  Crosshair,
  FlaskConical,
  Heart,
  Package2,
  Plus,
  Search,
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
  nursingCare: Heart,
  homeNursing: Heart,
  physicalTherapy: Activity,
  occupationalTherapy: Brain,
  imaging: Crosshair,
  labDiagnostics: FlaskConical,
  carePrograms: Package2,
} as const;

const categoryTitleFallbacks: Record<PublicServiceCategoryTranslationKey, string> = {
  medicalVisits: "Medical Visits",
  nursingCare: "Home Nursing",
  homeNursing: "Home Nursing",
  physicalTherapy: "Physical Therapy",
  occupationalTherapy: "Occupational Therapy",
  imaging: "Radiology",
  labDiagnostics: "Lab Diagnostics",
  carePrograms: "Care Programs",
};
const STORAGE_KEY = "curevie_selected_services";
const MEDICAL_GROUP_SLUGS = [
  "medical-visits",
  "home-nursing",
  "physical-therapy",
  "occupational-therapy",
] as const;

export function PublicServiceCategoryExplorer({ slug }: { slug: PublicServiceCategorySlug }) {
  const locale = useLocale();
  const t = useTranslations("serviceExplorer");
  const tExplorer = useTranslations("serviceExplorer");
  const tNewRequest = useTranslations("newRequestPage");
  const tEnums = useTranslations("enums");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isArabic = locale === "ar";
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";
  const eyebrowClass = isArabic
    ? "text-xs font-medium normal-case tracking-normal"
    : "text-[0.72rem] font-semibold uppercase tracking-[0.24em]";
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
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return new Set();
      return new Set(JSON.parse(saved) as string[]);
    } catch {
      return new Set();
    }
  });
  const isMedicalGroup = MEDICAL_GROUP_SLUGS.includes(slug as any);

  const dataQuery = useQuery({
    queryKey: ["public-category-explorer", slug],
    queryFn: () => fetchPublicServiceCategoryCatalog(slug),
    staleTime: 10 * 60 * 1000,
  });
  const medicalGroupQueries = useQueries({
    queries: MEDICAL_GROUP_SLUGS.map((groupSlug) => ({
      queryKey: ["public-category-explorer", groupSlug],
      queryFn: () => fetchPublicServiceCategoryCatalog(groupSlug),
      staleTime: 10 * 60 * 1000,
      enabled: isMedicalGroup,
    })),
  });

  const resolveCategoryTitle = (translationKey: PublicServiceCategoryTranslationKey) => {
    const key = `categories.${translationKey}.title` as const;

    try {
      const label = t(key);
      return label && label !== key ? label : categoryTitleFallbacks[translationKey];
    } catch {
      return categoryTitleFallbacks[translationKey];
    }
  };

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
  const allMedicalEntries = useMemo(() => {
    if (!isMedicalGroup) return entries;

    return medicalGroupQueries.flatMap((query, index) => {
      const slugForQuery = MEDICAL_GROUP_SLUGS[index];
      const matchingCategory = PUBLIC_SERVICE_CATEGORIES.find((item) => item.slug === slugForQuery);

      return (query.data?.entries || []).map((entry) => ({
        ...entry,
        categoryName: matchingCategory
          ? resolveCategoryTitle(matchingCategory.translationKey)
          : entry.categoryName,
      }));
    });
  }, [entries, isMedicalGroup, locale, medicalGroupQueries]);

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        if (next.size >= 5) return prev;
        next.add(entryId);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const handleGuestRequestOpenChange = (open: boolean) => {
    setGuestRequestOpen(open);

    if (!open && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      setSelectedEntryIds(new Set());
    }
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
      const catalogGrid = rootRef.current?.querySelector("[data-catalog-grid]");
      const catalogCards = Array.from(rootRef.current?.querySelectorAll("[data-catalog-card]") || []);

      if (heroBadge || heroTitle || heroCopy || heroActions.length || heroNav) {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });

        if (heroBadge) timeline.from(heroBadge, { y: 22, autoAlpha: 0 });
        if (heroTitle) timeline.from(heroTitle, { y: 32, autoAlpha: 0 }, "-=0.45");
        if (heroCopy) timeline.from(heroCopy, { y: 28, autoAlpha: 0 }, "-=0.45");
        if (heroActions.length) timeline.from(heroActions, { y: 18, autoAlpha: 0, stagger: 0.08 }, "-=0.4");
        if (heroNav) timeline.from(heroNav, { y: 18, autoAlpha: 0 }, "-=0.4");
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

  const categoryTitle = resolveCategoryTitle(category.translationKey);
  const categorySubtitle = t(`categories.${category.translationKey}.subtitle`);
  const categoryStory = t(`categories.${category.translationKey}.story`);
  const canOpenGuestRequest = allMedicalEntries.length > 0 && !dataQuery.isLoading && !dataQuery.isError;

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

                <div
                  className="relative mt-6 w-full"
                  style={{ "--nav-bg": category.theme.secondary } as CSSProperties}
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 rounded-s-full"
                    style={{
                      background: `linear-gradient(to right, ${category.theme.secondary}, transparent)`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 rounded-e-full"
                    style={{
                      background: `linear-gradient(to left, ${category.theme.secondary}, transparent)`,
                    }}
                  />

                  <div
                    data-explorer-hero-nav
                    dir={isArabic ? "rtl" : "ltr"}
                    className="overflow-x-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-1.5"
                  >
                    <div className="flex gap-2 w-max mx-auto">
                      {PUBLIC_SERVICE_CATEGORIES.map((navCat) => {
                      const NavIcon = categoryIcons[navCat.translationKey];
                      const isActive = navCat.slug === slug;

                      return (
                        <Button
                          key={navCat.slug}
                          asChild
                          variant="ghost"
                          className={cn(
                            "min-h-11 shrink-0 rounded-full px-4 py-2 transition-all",
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
          <section data-catalog-grid className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredEntries.map((entry) => {
              const isSelected = selectedEntryIds.has(entry.id);
              const typeLabel = entry.type === "service"
                ? translateEnumValue(entry.serviceKind, tEnums)
                : entry.type === "panel"
                  ? tNewRequest("labPanel")
                  : entry.type === "lab"
                    ? t("labels.labTest")
                    : entry.packageScope === "LAB_ONLY"
                      ? tNewRequest("labPackage")
                      : t("labels.comprehensiveBundle");

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
                    className="relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border border-white bg-white"
                    style={{
                      background: "rgba(255, 255, 255, 0.96)",
                      boxShadow: `0 24px 60px -48px ${category.theme.shadow}`,
                      outline: isSelected ? `2px solid ${category.theme.base}` : "none",
                      outlineOffset: isSelected ? "-2px" : "0px",
                    }}
                  >
                    <div className="relative flex h-full flex-col gap-2 p-3">
                      {isSelected ? (
                        <div
                          className="absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: category.theme.base }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 ps-8">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {entry.categoryName || t("labels.curatedForHome")}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: category.theme.base }}
                        >
                          {typeLabel}
                        </span>
                      </div>

                      <h3 className="min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-800 line-clamp-2">
                        {entry.name}
                      </h3>

                      <div className="text-xs text-gray-500">
                        {entry.price === null || entry.price === undefined || !Number.isFinite(entry.price)
                          ? <span className="italic">{t("labels.priceOnRequest")}</span>
                          : <span className="font-semibold text-gray-700">{formatCurrency(entry.price, locale)}</span>}
                      </div>

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleEntry(entry.id);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: isSelected ? "#16a34a" : category.theme.base,
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3" />
                            {tExplorer("selectedCard")}
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            {tExplorer("selectCard")}
                          </>
                        )}
                      </button>
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
          "fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-sm transition-transform duration-300 safe-area-pb",
          selectedEntryIds.size > 0 ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="shrink-0 text-sm font-medium text-gray-700">
            {selectedEntryIds.size} {tExplorer("selectedCount")}
          </span>
          <Button
            onClick={() => {
              setGuestRequestOpen(true);
            }}
            className="shrink-0 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: category.theme.base }}
          >
            {tExplorer("completeRequest")}
          </Button>
        </div>
      </div>

      <GuestServiceRequestDialog
        open={guestRequestOpen}
        onOpenChange={handleGuestRequestOpenChange}
        entries={allMedicalEntries}
        serviceSlug={slug}
        categoryTitle={categoryTitle}
        categoryTheme={category.theme}
        preSelectedEntryIds={Array.from(selectedEntryIds)}
      />
    </div>
  );
}
