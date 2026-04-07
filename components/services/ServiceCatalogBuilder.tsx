"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import {
  Activity,
  Brain,
  Check,
  CheckCircle2,
  Crosshair,
  FlaskConical,
  Heart,
  Stethoscope,
  X,
} from "lucide-react";
import { labPanelsApi } from "@/lib/api/lab-panels";
import { requestsApi } from "@/lib/api/requests";
import { servicesApi } from "@/lib/api/services";
import type { LabPanelItem, ServiceItem } from "@/lib/api/types";
import {
  CATEGORY_LABELS,
  SERVICE_CATALOG_TABS,
  type ServiceCatalogSlug,
  type ServiceCatalogTab,
} from "@/lib/service-catalog-config";
import { useAuthStore } from "@/lib/stores/auth.store";
import { normalizeListResponse } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATALOG_TAB_ICONS: Record<string, React.ElementType> = {
  "medical-visits": Stethoscope,
  "nursing-care": Heart,
  "physical-therapy": Activity,
  "occupational-therapy": Brain,
  "imaging": Crosshair,
  "lab-diagnostics": FlaskConical,
};

// Maps ServiceCatalogSlug → exact service_categories.name value in DB
const CATEGORY_NAME_MAP: Partial<Record<string, string>> = {
  "medical-visits":       "خدمات طبية منزلية",
  "nursing-care":         "رعاية تمريضية منزلية",
  "physical-therapy":     "العلاج الطبيعي",
  "occupational-therapy": "العلاج الوظيفي",
  "imaging":              "أشعة منزلية",
  // "lab-diagnostics" handled by source === "lab" branch
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogEntry {
  id: string;
  name: string;
  description: string | null;
}

interface ServiceCatalogBuilderProps {
  initialSlug: ServiceCatalogSlug;
  locale: string;
}

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

function HeroSection({
  activeTab,
  activeSlug,
  tabs,
  onSelectSlug,
  locale,
}: {
  activeTab: ServiceCatalogTab;
  activeSlug: string;
  tabs: typeof SERVICE_CATALOG_TABS;
  onSelectSlug: (slug: ServiceCatalogSlug) => void;
  locale: string;
}) {
  const isAr = locale === "ar";
  const rootRef = useRef<HTMLDivElement>(null);
  const CategoryIcon = CATALOG_TAB_ICONS[activeSlug] ?? Stethoscope;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });

      const badge = rootRef.current?.querySelector("[data-hero-badge]");
      const title = rootRef.current?.querySelector("[data-hero-title]");
      const copy  = rootRef.current?.querySelector("[data-hero-copy]");
      const nav   = rootRef.current?.querySelector("[data-hero-nav]");

      if (badge) tl.from(badge, { y: 22, autoAlpha: 0 });
      if (title) tl.from(title, { y: 32, autoAlpha: 0 }, "-=0.45");
      if (copy)  tl.from(copy,  { y: 28, autoAlpha: 0 }, "-=0.45");
      if (nav)   tl.from(nav,   { y: 18, autoAlpha: 0 }, "-=0.4");
    }, rootRef);

    return () => ctx.revert();
  }, [activeSlug]);

  return (
    <div
      ref={rootRef}
      className="bg-[#f8f6ef]"
      style={{
        backgroundImage: `
          radial-gradient(circle at top left, ${activeTab.theme.accent}18, transparent 20%),
          radial-gradient(circle at 88% 12%, ${activeTab.theme.base}14, transparent 18%),
          linear-gradient(180deg, #f8f6ef 0%, #fbfcfa 46%, #f7faf8 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-12">
        {/* Dark hero card */}
        <div
          className="overflow-hidden rounded-[2.4rem] border border-white/70"
          style={{
            background: `linear-gradient(135deg, ${activeTab.theme.base} 0%, ${activeTab.theme.secondary} 58%, #0f172a 100%)`,
            boxShadow: `0 36px 120px -60px ${activeTab.theme.shadow}`,
          }}
        >
          <div className="relative overflow-hidden px-4 py-10 md:px-8 md:py-14">
            {/* Accent top bar */}
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: activeTab.theme.accent }}
            />
            {/* Blur orbs */}
            <div className="absolute -right-10 top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10 max-w-2xl">
              {/* Eyebrow badge */}
              <div
                data-hero-badge
                className="inline-flex min-h-11 items-center gap-3 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-white backdrop-blur"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900">
                  <CategoryIcon className="h-4 w-4" />
                </span>
                {isAr ? activeTab.hero.eyebrow.ar : activeTab.hero.eyebrow.en}
              </div>

              {/* Title */}
              <div data-hero-title className="mt-6">
                <div className="text-xs font-medium uppercase tracking-widest text-white/70">
                  Curevie
                </div>
                <h1 className="mt-3 text-3xl font-bold leading-tight text-white md:text-5xl">
                  {isAr ? activeTab.hero.title.ar : activeTab.hero.title.en}
                </h1>
              </div>

              {/* Summary */}
              <p
                data-hero-copy
                className="mt-5 text-sm leading-7 text-white/80 md:text-base md:leading-8"
              >
                {isAr ? activeTab.hero.summary.ar : activeTab.hero.summary.en}
              </p>

              {/* Category nav strip */}
              <div className="mt-8 -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div
                  data-hero-nav
                  dir={isAr ? "rtl" : "ltr"}
                  className="inline-flex min-w-max gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm sm:rounded-full"
                >
                  {tabs.map((tab) => {
                    const TabIcon = CATALOG_TAB_ICONS[tab.slug] ?? Stethoscope;
                    const isActive = tab.slug === activeSlug;
                    return (
                      <button
                        key={tab.slug}
                        type="button"
                        onClick={() => onSelectSlug(tab.slug)}
                        className={cn(
                          "inline-flex min-h-10 shrink-0 items-center rounded-xl px-2.5 py-2 text-sm font-medium transition-all sm:rounded-full sm:px-3",
                          isActive
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-white/80 hover:bg-white/15 hover:text-white",
                        )}
                      >
                        <TabIcon className="me-2 h-4 w-4" />
                        {isAr
                          ? (CATEGORY_LABELS[tab.slug]?.ar ?? tab.slug)
                          : (CATEGORY_LABELS[tab.slug]?.en ?? tab.slug)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServiceGrid
// ---------------------------------------------------------------------------

function ServiceGrid({
  entries,
  isLoading,
  selectedServices,
  onToggle,
  locale,
}: {
  entries: CatalogEntry[];
  isLoading: boolean;
  selectedServices: Map<string, { name: string; categorySlug: ServiceCatalogSlug }>;
  onToggle: (id: string, name: string) => void;
  locale: string;
}) {
  const isAr = locale === "ar";

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!entries.length) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        {isAr ? "لا توجد خدمات متاحة" : "No services available"}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const isSelected = selectedServices.has(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onToggle(entry.id, entry.name)}
              className={cn(
                "rounded-2xl border-2 p-5 text-start transition-all duration-200",
                "hover:shadow-md active:scale-[0.98]",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold leading-snug text-foreground">{entry.name}</p>
                  {entry.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30",
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// StickyCartBar
// ---------------------------------------------------------------------------

function StickyCartBar({
  count,
  onReview,
  locale,
}: {
  count: number;
  onReview: () => void;
  locale: string;
}) {
  const isAr = locale === "ar";
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">
          {isAr
            ? `${count} خدمة مختارة`
            : `${count} service${count > 1 ? "s" : ""} selected`}
        </p>
        <button
          type="button"
          onClick={onReview}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isAr ? "إتمام الطلب" : "Complete Request"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewDialog
// ---------------------------------------------------------------------------

function ReviewDialog({
  isOpen,
  onClose,
  selectedServices,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedServices: Map<string, { name: string; categorySlug: ServiceCatalogSlug }>;
  locale: string;
}) {
  const isAr = locale === "ar";
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const patient = useAuthStore((state) => state.patient);

  const [name, setName] = useState(patient?.full_name ?? "");
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [address, setAddress] = useState(patient?.address ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Sync form fields when dialog opens or auth state changes
  useEffect(() => {
    if (isOpen) {
      setName(isAuthenticated && patient ? (patient.full_name ?? "") : "");
      setPhone(isAuthenticated && patient ? (patient.phone ?? "") : "");
      setAddress(isAuthenticated && patient ? (patient.address ?? "") : "");
      setSuccessId(null);
    }
  }, [isOpen, isAuthenticated, patient]);

  function buildNotes(): string {
    const lines = Array.from(selectedServices.values()).map(({ name: n }) => `• ${n}`);
    return (isAr ? "الخدمات المطلوبة:\n" : "Requested services:\n") + lines.join("\n");
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !address.trim()) return;

    const firstServiceId = selectedServices.keys().next().value as string | undefined;
    if (!firstServiceId) return;

    setIsSubmitting(true);
    try {
      const notes = buildNotes();

      // Always use public (guest) flow to avoid auth redirect issues.
      // Admin receives all requests and can link to patient account manually.
      const result = await requestsApi.createPublic({
        request_type: "GUEST",
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_address: address.trim(),
        service_type: "MEDICAL",
        service_id: firstServiceId,
        notes,
      });

      const requestId = result.data?.request?.id ?? "submitted";
      setSuccessId(requestId);
    } catch {
      // keep dialog open on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  if (successId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold">
            {isAr ? "تم إرسال طلبك!" : "Request Submitted!"}
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {isAr ? "سيتواصل معك فريقنا قريباً" : "Our team will contact you shortly"}
          </p>
          <button
            type="button"
            onClick={() => { onClose(); setSuccessId(null); }}
            className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground"
          >
            {isAr ? "حسناً" : "Done"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="text-lg font-bold">
            {isAr ? "مراجعة الطلب" : "Review Request"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              {isAr ? "الخدمات المختارة" : "Selected Services"}
            </p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {Array.from(selectedServices.entries()).map(([id, { name: n }]) => (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isAr ? "الاسم الكامل" : "Full Name"}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder={isAr ? "الاسم الكامل" : "Full name"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isAr ? "رقم الهاتف" : "Phone Number"}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder={isAr ? "رقم الهاتف" : "Phone number"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isAr ? "العنوان" : "Address"}
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder={isAr ? "العنوان التفصيلي" : "Full address"}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !phone.trim() || !address.trim()}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting
              ? (isAr ? "جاري الإرسال..." : "Submitting...")
              : (isAr ? "تأكيد وإرسال الطلب" : "Confirm & Submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServiceCatalogBuilder (main export)
// ---------------------------------------------------------------------------

function normalizeServiceEntries(items: ServiceItem[]): CatalogEntry[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? null,
  }));
}

function normalizeLabPanelEntries(items: LabPanelItem[], locale: string): CatalogEntry[] {
  return items.map((item) => ({
    id: item.id,
    name: locale === "ar"
      ? (item.name_ar || item.name_en)
      : (item.name_en || item.name_ar),
    description: locale === "ar"
      ? (item.description_ar ?? item.description_en ?? null)
      : (item.description_en ?? item.description_ar ?? null),
  }));
}

export function ServiceCatalogBuilder({ initialSlug, locale }: ServiceCatalogBuilderProps) {
  const [activeSlug, setActiveSlug] = useState<ServiceCatalogSlug>(initialSlug);
  const [selectedServices, setSelectedServices] = useState<
    Map<string, { name: string; categorySlug: ServiceCatalogSlug }>
  >(new Map());
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const activeTab = SERVICE_CATALOG_TABS.find((t) => t.slug === activeSlug)!;

  const { data: rawEntries, isLoading } = useQuery({
    queryKey: ["service-catalog", activeSlug],
    queryFn: async (): Promise<CatalogEntry[]> => {
      if (activeTab.source === "lab") {
        const response = await labPanelsApi.listPublic({ limit: 100, is_active: true });
        const items = normalizeListResponse(response.data).data;
        return normalizeLabPanelEntries(items, locale);
      }

      const response = await servicesApi.listPublic({
        limit: 200,
        service_kind: activeTab.serviceKind === "RADIOLOGY" ? "RADIOLOGY" : "MEDICAL",
      });
      const allItems = normalizeListResponse(response.data).data as ServiceItem[];

      // Client-side filter by DB category name
      const categoryNameFilter = CATEGORY_NAME_MAP[activeSlug];
      const filtered = categoryNameFilter
        ? allItems.filter((s) => s.category_name === categoryNameFilter)
        : allItems;

      return filtered.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const entries = rawEntries ?? [];

  function handleToggle(serviceId: string, serviceName: string) {
    setSelectedServices((prev) => {
      const next = new Map(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.set(serviceId, { name: serviceName, categorySlug: activeSlug });
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <HeroSection
        activeTab={activeTab}
        activeSlug={activeSlug}
        tabs={SERVICE_CATALOG_TABS}
        onSelectSlug={setActiveSlug}
        locale={locale}
      />

      <ServiceGrid
        entries={entries}
        isLoading={isLoading}
        selectedServices={selectedServices}
        onToggle={handleToggle}
        locale={locale}
      />

      {selectedServices.size > 0 && (
        <StickyCartBar
          count={selectedServices.size}
          onReview={() => setIsReviewOpen(true)}
          locale={locale}
        />
      )}

      <ReviewDialog
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        selectedServices={selectedServices}
        locale={locale}
      />
    </div>
  );
}
