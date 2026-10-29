"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Crown,
  Loader2,
  MapPin,
  NotebookPen,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppCard, Illustration, Shimmer, appButton } from "@/components/app/ui";
import { AreaPicker } from "@/components/orders/AreaPicker";
import { useAreas } from "@/components/orders/AreaSelect";
import { SchedulePicker, type ScheduleMode } from "@/components/orders/SchedulePicker";
import { PrelaunchRequestPage } from "@/components/shared/PrelaunchNotice";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  casesApi,
  getCaseServiceItemRef,
  MAX_CASE_ITEMS,
  type CaseItemRef,
  type CaseItemType,
  type CaseView,
} from "@/lib/api/cases";
import { getAreaLabel } from "@/lib/api/areas";
import type { ServiceKind } from "@/lib/api/types";
import { formatCurrency } from "@/lib/formatting";
import { BOOKINGS_ENABLED } from "@/lib/launch";
import { fetchOrderCatalog, type OrderCatalogItem } from "@/lib/order-catalog";
import { getOrderErrorMessage } from "@/lib/order-errors";
import {
  dedupeOrderItems,
  getOrderItemTypeLabel,
  isFutureScheduleInput,
  isServiceKind,
  ORDER_ITEM_TYPES,
  orderItemKey,
  parseOrderItemsParam,
  scheduleInputToIso,
  SERVICE_KINDS,
} from "@/lib/order-items";
import { getCaseReference, isolateLtr } from "@/lib/order-stage";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn, formatDateWithWeekday, formatTimeOnly } from "@/lib/utils";

type Translate = (key: string, values?: Record<string, string | number>) => string;
type KindFilter = "ALL" | ServiceKind;
type Step = 1 | 2 | 3;

const SERVICE_KIND_FILTERS: KindFilter[] = ["ALL", ...SERVICE_KINDS];
const INCLUDED_SERVICES_PREVIEW = 4;
const STEP_KEYS = ["what", "where", "review"] as const;

function createVisitSchema(t: Translate, addressRequired: boolean) {
  return z.object({
    area_id: z.string().min(1, t("areaRequired")),
    address: addressRequired
      ? z.string().trim().min(3, t("addressRequired")).max(500)
      : z.string().trim().max(500).refine((value) => !value || value.length >= 3, t("addressRequired")),
    scheduled_for: z.string().optional().refine((value) => isFutureScheduleInput(value), t("scheduledInPast")),
    notes: z.string().trim().max(2000).optional(),
  });
}

type VisitValues = z.infer<ReturnType<typeof createVisitSchema>>;

export default function NewRequestPage() {
  if (!BOOKINGS_ENABLED) {
    return <PrelaunchRequestPage />;
  }

  return (
    <Suspense fallback={null}>
      <NewOrderPage />
    </Suspense>
  );
}

function toMoney(value: number) {
  return Math.round(value * 1000) / 1000;
}

function NewOrderPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("orderForm");
  const tFlow = useTranslations("app.newOrder");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const patient = useAuthStore((state) => state.patient);
  const isVip = Boolean(patient?.is_vip);
  const vipPercent = isVip ? Math.min(Math.max(Number(patient?.vip_discount) || 0, 0), 100) : 0;

  const initialType = searchParams.get("type") === "PACKAGE" ? "PACKAGE" : "SERVICE";
  const initialKind = searchParams.get("kind");
  const [activeType, setActiveType] = useState<CaseItemType>(initialType);
  const [kindFilter, setKindFilter] = useState<KindFilter>(isServiceKind(initialKind) ? initialKind : "ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CaseItemRef[]>([]);
  const [fallbackNames, setFallbackNames] = useState<Record<string, string>>({});
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("asap");
  const [createdView, setCreatedView] = useState<CaseView | null>(null);
  const prefillAppliedRef = useRef(false);

  const reorderCaseId = searchParams.get("reorder");
  const itemsParam = searchParams.get("items");
  const stepParam = Number(searchParams.get("step") || 1);
  const step: Step = stepParam === 2 || stepParam === 3 ? stepParam : 1;

  const catalogQueries = useQueries({
    queries: ORDER_ITEM_TYPES.map((type) => ({
      queryKey: ["order-catalog", type, locale],
      queryFn: () => fetchOrderCatalog(type, locale),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const reorderQuery = useQuery({
    queryKey: ["cases", "detail", reorderCaseId],
    queryFn: () => casesApi.getById(String(reorderCaseId)),
    enabled: Boolean(reorderCaseId),
  });

  const areasQuery = useAreas();

  const catalogByKey = useMemo(() => {
    const map = new Map<string, OrderCatalogItem>();
    catalogQueries.forEach((query) => query.data?.forEach((item) => map.set(item.key, item)));
    return map;
  }, [catalogQueries]);

  const catalogsReady = catalogQueries.every((query) => query.isSuccess);
  const activeQueryIndex = ORDER_ITEM_TYPES.indexOf(activeType);
  const activeQuery = catalogQueries[activeQueryIndex];

  const addressRequired = !patient?.address?.trim();
  const form = useForm<VisitValues>({
    resolver: zodResolver(createVisitSchema(t, addressRequired)),
    defaultValues: {
      area_id: "",
      address: patient?.address || "",
      scheduled_for: "",
      notes: "",
    },
  });

  // A reload in the middle of the flow starts again from the first step (selections live in memory).
  useEffect(() => {
    if (step !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("step");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill items from ?items=TYPE:id,... (catalog pages) or ?reorder=<caseId> ("order again").
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (reorderCaseId && !reorderQuery.isSuccess && !reorderQuery.isError) return;

    prefillAppliedRef.current = true;
    const refs: CaseItemRef[] = parseOrderItemsParam(itemsParam);
    const names: Record<string, string> = {};

    if (reorderQuery.data) {
      const previous = reorderQuery.data;
      previous.services
        .filter((service) => service.status !== "CANCELLED")
        .forEach((service) => {
          const ref = getCaseServiceItemRef(service);
          if (!ref) return;
          refs.push(ref);
          names[orderItemKey(ref)] = service.item_name;
        });

      if (previous.case.area_id) form.setValue("area_id", previous.case.area_id);
      if (previous.case.address) form.setValue("address", previous.case.address);
    }

    setSelected(dedupeOrderItems(refs));
    setFallbackNames(names);
  }, [form, itemsParam, reorderCaseId, reorderQuery.data, reorderQuery.isError, reorderQuery.isSuccess]);

  // Default the area to the one saved on the patient profile.
  useEffect(() => {
    if (form.getValues("area_id") || !patient?.area_id || !areasQuery.data) return;
    if (areasQuery.data.some((area) => area.id === patient.area_id)) {
      form.setValue("area_id", patient.area_id);
    }
  }, [areasQuery.data, form, patient?.area_id]);

  const selectedKeys = useMemo(() => new Set(selected.map(orderItemKey)), [selected]);
  const selectedRows = selected.map((ref) => {
    const key = orderItemKey(ref);
    const item = catalogByKey.get(key) || null;
    return {
      ref,
      key,
      item,
      name: item?.name || fallbackNames[key] || tOrders(`itemTypes.${ref.type}`),
      unavailable: catalogsReady && !item,
    };
  });
  const orderableRows = selectedRows.filter((row) => !row.unavailable);
  const hasUnavailable = selectedRows.some((row) => row.unavailable);
  const estimatedTotal = orderableRows.reduce((sum, row) => sum + Number(row.item?.price || 0), 0);
  const hasUnpriced = orderableRows.some((row) => row.item?.price === null);
  const limitReached = selected.length >= MAX_CASE_ITEMS;
  const vipDiscount = vipPercent > 0 ? toMoney((estimatedTotal * vipPercent) / 100) : 0;
  const payableEstimate = toMoney(estimatedTotal - vipDiscount);

  const visibleItems = useMemo(() => {
    const items = activeQuery?.data || [];
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      if (activeType === "SERVICE" && kindFilter !== "ALL" && item.serviceKind !== kindFilter) return false;
      if (!term) return true;
      return `${item.name} ${item.description || ""} ${item.groupName || ""}`.toLowerCase().includes(term);
    });
  }, [activeQuery?.data, activeType, kindFilter, search]);

  const toggleItem = (item: OrderCatalogItem) => {
    setSelected((current) => {
      if (current.some((ref) => orderItemKey(ref) === item.key)) {
        return current.filter((ref) => orderItemKey(ref) !== item.key);
      }
      if (current.length >= MAX_CASE_ITEMS) {
        toast.error(t("maxItems", { max: MAX_CASE_ITEMS }));
        return current;
      }
      return [...current, { type: item.type, id: item.id }];
    });
  };

  const removeItem = (key: string) => {
    setSelected((current) => current.filter((ref) => orderItemKey(ref) !== key));
  };

  const createMutation = useMutation({
    mutationFn: (values: VisitValues) => {
      const scheduledFor = scheduleInputToIso(values.scheduled_for);
      const address = values.address.trim();
      const notes = values.notes?.trim();

      return casesApi.create({
        area_id: values.area_id,
        ...(address ? { address } : {}),
        ...(scheduledFor ? { scheduled_for: scheduledFor } : {}),
        ...(notes ? { notes } : {}),
        items: orderableRows.map((row) => row.ref),
      });
    },
    onSuccess: async (view) => {
      setCreatedView(view);
      window.scrollTo({ top: 0 });
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: (error) => {
      const message = getOrderErrorMessage(error, tOrders);
      toast.error(message);
    },
  });

  const handleSubmit = (values: VisitValues) => {
    if (!orderableRows.length) {
      toast.error(t("itemsRequired"));
      return;
    }
    createMutation.mutate(values);
  };

  const goToStep = (next: Step) => {
    if (next === step) return;
    if (next < step) {
      // The forward steps were pushed onto the history, so going back keeps the browser/OS back button in sync.
      window.history.go(next - step);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(next));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const continueFromItems = () => {
    if (!orderableRows.length) {
      toast.error(tFlow("emptyCart"));
      return;
    }
    goToStep(2);
  };

  const continueFromVisit = async () => {
    const valid = await form.trigger(["area_id", "address", "scheduled_for", "notes"]);
    if (scheduleMode === "pick" && !form.getValues("scheduled_for")) {
      form.setError("scheduled_for", { message: tFlow("timeRequired") });
      return;
    }
    if (valid) goToStep(3);
  };

  // Guard against landing on a later step without items (e.g. after a refresh).
  const effectiveStep: Step = step > 1 && !orderableRows.length && catalogsReady && !reorderQuery.isLoading ? 1 : step;

  if (createdView) {
    return <OrderSuccess view={createdView} locale={locale} />;
  }

  const areaValue = form.watch("area_id");
  const scheduledValue = form.watch("scheduled_for");
  const addressValue = form.watch("address");
  const notesValue = form.watch("notes");
  const area = (areasQuery.data || []).find((item) => item.id === areaValue);
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto max-w-3xl pb-32">
      <FlowProgress step={effectiveStep} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={effectiveStep}
          initial={reduceMotion ? false : { opacity: 0, x: isRtl ? -18 : 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: isRtl ? 18 : -18 }}
          transition={{ duration: 0.22 }}
          className="mt-5"
        >
          {effectiveStep === 1 ? (
            <section className="space-y-4">
              <h2 className="px-1 text-[24px] font-bold text-foreground">{tFlow("stepTitles.what")}</h2>

              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e9efed] p-1 dark:bg-white/5" role="tablist">
                {ORDER_ITEM_TYPES.map((type) => {
                  const active = type === activeType;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveType(type)}
                      className={cn(
                        "relative min-h-11 rounded-xl text-[15px] font-semibold transition-colors",
                        active ? "text-[#104d49] dark:text-teal-50" : "text-muted-foreground",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="order-type-pill"
                          className="absolute inset-0 rounded-xl bg-card shadow-sm"
                          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                        />
                      ) : null}
                      <span className="relative">{tOrders(`itemTypesPlural.${type}`)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-[52px] w-full rounded-2xl border border-[var(--app-card-border)] bg-card pe-4 ps-12 text-[16px] shadow-sm outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2"
                />
              </div>

              {activeType === "SERVICE" ? (
                <div className="-mx-4 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
                  <div className="flex w-max gap-2">
                    {SERVICE_KIND_FILTERS.map((kind) => {
                      const active = kindFilter === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setKindFilter(kind)}
                          aria-pressed={active}
                          className={cn(
                            "app-press min-h-10 rounded-full px-4 text-[14px] font-semibold transition-colors",
                            active
                              ? "bg-[#104d49] text-white"
                              : "bg-card text-foreground ring-1 ring-[var(--app-card-border)] hover:bg-[#f3f7f5] dark:hover:bg-white/5",
                          )}
                        >
                          {t(`serviceKinds.${kind}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {hasUnavailable ? (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("unavailableNotice")}</span>
                </div>
              ) : null}

              {activeQuery?.isLoading || (reorderCaseId && reorderQuery.isLoading) ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((key) => (
                    <AppCard key={key} className="flex items-center gap-3 p-4">
                      <div className="flex-1 space-y-2">
                        <Shimmer className="h-4 w-2/3" />
                        <Shimmer className="h-3 w-1/2" />
                        <Shimmer className="h-4 w-20" />
                      </div>
                      <Shimmer className="h-11 w-11 rounded-full" />
                    </AppCard>
                  ))}
                </div>
              ) : activeQuery?.isError ? (
                <AppCard className="space-y-3 p-5 text-center">
                  <p className="text-[15px] text-rose-700 dark:text-rose-300">{t("catalogLoadError")}</p>
                  <button type="button" className={appButton.secondary} onClick={() => void activeQuery.refetch()}>
                    {tCommon("retry")}
                  </button>
                </AppCard>
              ) : visibleItems.length === 0 ? (
                <AppCard className="p-8 text-center text-[15px] text-muted-foreground">{t("catalogEmpty")}</AppCard>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleItems.map((item) => (
                    <CatalogItemCard
                      key={item.key}
                      item={item}
                      locale={locale}
                      isSelected={selectedKeys.has(item.key)}
                      disabled={(item.vipOnly && !isVip) || (!selectedKeys.has(item.key) && limitReached)}
                      onToggle={() => toggleItem(item)}
                      t={t}
                      tOrders={tOrders}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {effectiveStep === 2 ? (
            <Form {...form}>
              <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
                <h2 className="px-1 text-[24px] font-bold text-foreground">{tFlow("stepTitles.where")}</h2>

                <AppCard className="space-y-4 p-4 sm:p-5">
                  <FormField
                    control={form.control}
                    name="area_id"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormControl>
                          <AreaPicker value={field.value} onChange={field.onChange} invalid={Boolean(fieldState.error)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <label htmlFor="visit-address" className="block px-1 text-[14px] font-semibold text-foreground">
                          {t("address")}
                        </label>
                        <FormControl>
                          <textarea
                            id="visit-address"
                            {...field}
                            rows={2}
                            placeholder={t("addressPlaceholder")}
                            className="w-full resize-none rounded-2xl border border-[#dbe6e0] bg-card px-4 py-3 text-[16px] leading-6 outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2 dark:border-border"
                          />
                        </FormControl>
                        {!addressRequired ? <p className="px-1 text-[13px] text-muted-foreground">{t("addressHint")}</p> : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AppCard>

                <AppCard className="space-y-3 p-4 sm:p-5">
                  <p className="px-1 text-[17px] font-bold text-foreground">{tFlow("whenTitle")}</p>
                  <FormField
                    control={form.control}
                    name="scheduled_for"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <SchedulePicker
                          mode={scheduleMode}
                          onModeChange={(mode) => {
                            setScheduleMode(mode);
                            form.clearErrors("scheduled_for");
                          }}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            form.clearErrors("scheduled_for");
                          }}
                          invalid={Boolean(fieldState.error)}
                        />
                        <p className="px-1 text-[13px] text-muted-foreground">{t("scheduledForHint")}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AppCard>

                <AppCard className="space-y-2 p-4 sm:p-5">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <label htmlFor="visit-notes" className="block px-1 text-[14px] font-semibold text-foreground">
                          {t("notes")}
                        </label>
                        <FormControl>
                          <textarea
                            id="visit-notes"
                            {...field}
                            rows={3}
                            placeholder={t("notesPlaceholder")}
                            className="w-full resize-none rounded-2xl border border-[#dbe6e0] bg-card px-4 py-3 text-[16px] leading-6 outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2 dark:border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AppCard>
              </form>
            </Form>
          ) : null}

          {effectiveStep === 3 ? (
            <section className="space-y-4">
              <h2 className="px-1 text-[24px] font-bold text-foreground">{tFlow("stepTitles.review")}</h2>

              <AppCard className="overflow-hidden">
                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <p className="text-[17px] font-bold text-foreground">{tFlow("reviewItems")}</p>
                  <button type="button" onClick={() => goToStep(1)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-[#104d49] hover:bg-[#e6f0ee] dark:text-teal-200">
                    {tFlow("edit")}
                  </button>
                </div>
                <ul className="divide-y divide-[var(--app-card-border)] px-5">
                  {orderableRows.map((row) => (
                    <li key={row.key} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-foreground">{row.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {getOrderItemTypeLabel({ type: row.ref.type, serviceKind: row.item?.serviceKind }, tOrders)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
                        {row.item?.price === null || !row.item ? "-" : formatCurrency(row.item.price, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-[var(--app-card-border)] bg-[#f8fbfa] px-5 py-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="text-muted-foreground">{tFlow("subtotal")}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(estimatedTotal, locale)}</span>
                  </div>
                  {vipDiscount > 0 ? (
                    <div className="flex items-center justify-between text-[15px] text-[#3f7a3a] dark:text-lime-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Crown className="h-4 w-4" />
                        {tFlow("vipDiscount", { percent: vipPercent })}
                      </span>
                      <span className="font-semibold tabular-nums">−{formatCurrency(vipDiscount, locale)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[16px] font-bold text-foreground">{t("estimatedTotal")}</span>
                    <span className="text-[20px] font-bold tabular-nums text-foreground">
                      {formatCurrency(payableEstimate, locale)}
                      {hasUnpriced ? " +" : ""}
                    </span>
                  </div>
                  <p className="pt-1 text-[13px] leading-5 text-muted-foreground">{isVip ? t("vipPriceNote") : t("priceNote")}</p>
                </div>
              </AppCard>

              <AppCard className="overflow-hidden">
                <div className="flex items-center justify-between px-5 pb-1 pt-4">
                  <p className="text-[17px] font-bold text-foreground">{tFlow("reviewVisit")}</p>
                  <button type="button" onClick={() => goToStep(2)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-[#104d49] hover:bg-[#e6f0ee] dark:text-teal-200">
                    {tFlow("edit")}
                  </button>
                </div>
                <div className="divide-y divide-[var(--app-card-border)] px-5 pb-2">
                  <ReviewRow icon={MapPin} label={tOrders("area.label")} value={area ? getAreaLabel(area, locale) : "-"} />
                  <ReviewRow
                    icon={MapPin}
                    label={t("address")}
                    value={addressValue?.trim() || patient?.address || "-"}
                    hint={!addressValue?.trim() && patient?.address ? tFlow("savedAddress") : undefined}
                  />
                  <ReviewRow
                    icon={CalendarClock}
                    label={tFlow("timeTitle")}
                    value={
                      scheduledValue
                        ? `${formatDateWithWeekday(scheduledValue, locale)} · ${formatTimeOnly(scheduledValue, locale)}`
                        : tFlow("asap")
                    }
                  />
                  {notesValue?.trim() ? <ReviewRow icon={NotebookPen} label={tFlow("notesTitle")} value={notesValue.trim()} /> : null}
                </div>
              </AppCard>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 md:ps-[260px]">
        <div className="mx-auto max-w-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:px-0">
          <div className="rounded-[24px] border border-[var(--app-card-border)] bg-card/95 p-2.5 shadow-[0_18px_40px_-16px_rgba(16,49,45,0.45)] backdrop-blur-xl">
            {effectiveStep === 1 && selectedRows.length ? (
              <div className="-mt-0.5 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 pt-0.5 no-scrollbar">
                {selectedRows.map((row) => (
                  <span
                    key={row.key}
                    className={cn(
                      "inline-flex max-w-[12rem] shrink-0 items-center gap-1 rounded-full py-1 pe-1 ps-3 text-[12.5px] font-semibold",
                      row.unavailable ? "bg-amber-50 text-amber-800" : "bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100",
                    )}
                  >
                    <span className="truncate">{row.name}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(row.key)}
                      aria-label={`${t("remove")} ${row.name}`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              {effectiveStep > 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep((effectiveStep - 1) as Step)}
                  aria-label={tFlow("back")}
                  className="app-press inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#f1f5f4] text-foreground hover:bg-[#e6eeeb] dark:bg-white/5"
                >
                  <BackIcon className="h-5 w-5" />
                </button>
              ) : null}
              <div className="min-w-0 flex-1 px-2">
                <p className="truncate text-[13px] text-muted-foreground">{tFlow("itemsCount", { count: orderableRows.length })}</p>
                <p className="truncate text-[18px] font-bold tabular-nums text-foreground">
                  {formatCurrency(effectiveStep === 3 ? payableEstimate : estimatedTotal, locale)}
                  {hasUnpriced ? " +" : ""}
                </p>
              </div>
              {effectiveStep === 1 ? (
                <button type="button" onClick={continueFromItems} disabled={!orderableRows.length} className={cn(appButton.primary, "min-w-[8.5rem]")}>
                  {tFlow("continue")}
                </button>
              ) : effectiveStep === 2 ? (
                <button type="button" onClick={() => void continueFromVisit()} className={cn(appButton.primary, "min-w-[8.5rem]")}>
                  {tFlow("continue")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void form.handleSubmit(handleSubmit)()}
                  disabled={createMutation.isPending || !orderableRows.length}
                  className={cn(appButton.primary, "min-w-[9.5rem]")}
                >
                  {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                  {createMutation.isPending ? t("submitting") : t("submit")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowProgress({ step }: { step: Step }) {
  const tFlow = useTranslations("app.newOrder");

  return (
    <div className="px-1">
      <div className="flex items-center justify-between gap-2">
        {STEP_KEYS.map((key, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <div key={key} className={cn("flex min-w-0 items-center gap-2", index < STEP_KEYS.length - 1 && "sm:flex-1")}>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                  done && "bg-[#104d49] text-white dark:bg-teal-300 dark:text-[#0b3f3b]",
                  current && "bg-[#86ab62] text-white",
                  !done && !current && "bg-[#e3ebe8] text-muted-foreground dark:bg-white/10",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : number}
              </span>
              <span className={cn("whitespace-nowrap text-[13px]", current ? "font-bold text-foreground" : "text-muted-foreground")}>
                {tFlow(`steps.${key}`)}
              </span>
              {index < STEP_KEYS.length - 1 ? (
                <span className={cn("hidden h-0.5 flex-1 rounded-full sm:block", done ? "bg-[#104d49] dark:bg-teal-300" : "bg-[#e3ebe8] dark:bg-white/10")} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CatalogItemCard({
  item,
  locale,
  isSelected,
  disabled,
  onToggle,
  t,
  tOrders,
}: {
  item: OrderCatalogItem;
  locale: string;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  t: Translate;
  tOrders: Translate;
}) {
  const blocked = disabled && !isSelected;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={blocked}
      aria-pressed={isSelected}
      className={cn(
        "app-press app-card flex w-full items-start gap-3 p-4 text-start transition-[box-shadow,border-color] disabled:opacity-55",
        isSelected && "border-[#104d49] ring-1 ring-[#104d49] dark:border-teal-300 dark:ring-teal-300",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.vipOnly ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] px-2 py-0.5 text-[11.5px] font-bold text-[#8a5200] dark:bg-amber-500/15 dark:text-amber-200">
              <Crown className="h-3 w-3" />
              {t("vipOnly")}
            </span>
          ) : null}
          <span className="text-[12.5px] font-medium text-muted-foreground">
            {item.groupName || getOrderItemTypeLabel({ type: item.type, serviceKind: item.serviceKind }, tOrders)}
          </span>
        </div>
        <p className="mt-1 text-[16px] font-bold leading-6 text-foreground">{item.name}</p>
        {item.description ? <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-5 text-muted-foreground">{item.description}</p> : null}
        {item.includedServices.length ? (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground/80">{t("includedServices", { count: item.includedServices.length })}: </span>
            {item.includedServices.slice(0, INCLUDED_SERVICES_PREVIEW).join(locale === "ar" ? "، " : ", ")}
            {item.includedServices.length > INCLUDED_SERVICES_PREVIEW
              ? ` ${t("moreServices", { count: item.includedServices.length - INCLUDED_SERVICES_PREVIEW })}`
              : ""}
          </p>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold tabular-nums text-[#104d49] dark:text-teal-100">
            {item.price === null ? t("priceOnRequest") : formatCurrency(item.price, locale)}
          </span>
          {item.savings !== null ? (
            <span className="rounded-full bg-[#e5f5ea] px-2 py-0.5 text-[12px] font-bold text-[#1c6e3d] dark:bg-emerald-500/15 dark:text-emerald-200">
              {t("youSave", { amount: formatCurrency(item.savings, locale) })}
            </span>
          ) : null}
        </div>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
          isSelected ? "bg-[#104d49] text-white dark:bg-teal-300 dark:text-[#0b3f3b]" : "bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100",
        )}
      >
        {isSelected ? <Check className="h-5 w-5" strokeWidth={2.6} /> : <Plus className="h-5 w-5" strokeWidth={2.4} />}
      </span>
      <span className="sr-only">{isSelected ? t("added") : t("add")}</span>
    </button>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f4] text-[#104d49] dark:bg-white/5 dark:text-teal-200">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function OrderSuccess({ view, locale }: { view: CaseView; locale: string }) {
  const tFlow = useTranslations("app.newOrder");
  const tOrders = useTranslations("orders");
  const reduceMotion = useReducedMotion();
  const reference = getCaseReference(view.case.id);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-2 py-6 text-center"
    >
      <Illustration name="order-placed" priority className="h-52 w-auto" sizes="240px" />
      <h1 className="mt-6 text-[26px] font-bold text-foreground">{tFlow("successTitle")}</h1>
      <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{tFlow("successDescription")}</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e6f0ee] px-4 py-2 text-[15px] font-bold text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
        {tOrders("reference", { reference: isolateLtr(reference) })}
      </div>
      {view.invoice ? (
        <p className="mt-3 text-[15px] text-muted-foreground">
          <span className="font-bold tabular-nums text-foreground">{formatCurrency(view.invoice.final_amount, locale)}</span>
        </p>
      ) : null}
      <div className="mt-8 flex w-full flex-col gap-2.5">
        <Link href={`/${locale}/requests/${view.case.id}`} className={appButton.primary}>
          {tFlow("trackOrder")}
        </Link>
        <Link href={`/${locale}/dashboard`} className={appButton.secondary}>
          {tFlow("backHome")}
        </Link>
      </div>
    </motion.div>
  );
}
