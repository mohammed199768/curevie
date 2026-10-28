"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Crown, Loader2, Plus, Search, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AreaSelect, useAreas } from "@/components/orders/AreaSelect";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { PrelaunchRequestPage } from "@/components/shared/PrelaunchNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  casesApi,
  getCaseServiceItemRef,
  MAX_CASE_ITEMS,
  type CaseItemRef,
  type CaseItemType,
} from "@/lib/api/cases";
import type { ServiceKind } from "@/lib/api/types";
import { formatCurrency } from "@/lib/formatting";
import { BOOKINGS_ENABLED } from "@/lib/launch";
import { fetchOrderCatalog, type OrderCatalogItem } from "@/lib/order-catalog";
import { getOrderErrorMessage } from "@/lib/order-errors";
import {
  dedupeOrderItems,
  getMinScheduleInputValue,
  getOrderItemTypeLabel,
  isFutureScheduleInput,
  ORDER_ITEM_TYPES,
  orderItemKey,
  parseOrderItemsParam,
  scheduleInputToIso,
  SERVICE_KINDS,
} from "@/lib/order-items";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn } from "@/lib/utils";

type Translate = (key: string, values?: Record<string, string | number>) => string;
type KindFilter = "ALL" | ServiceKind;

const SERVICE_KIND_FILTERS: KindFilter[] = ["ALL", ...SERVICE_KINDS];
const INCLUDED_SERVICES_PREVIEW = 4;

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

function NewOrderPage() {
  const locale = useLocale();
  const t = useTranslations("orderForm");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const patient = useAuthStore((state) => state.patient);
  const isVip = Boolean(patient?.is_vip);

  const [activeType, setActiveType] = useState<CaseItemType>("SERVICE");
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CaseItemRef[]>([]);
  const [fallbackNames, setFallbackNames] = useState<Record<string, string>>({});
  const prefillAppliedRef = useRef(false);

  const reorderCaseId = searchParams.get("reorder");
  const itemsParam = searchParams.get("items");

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
      toast.success(t("success"));
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push(`/${locale}/requests/${view.case.id}`);
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

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button asChild variant="outline" className="min-h-11 rounded-full">
            <Link href={`/${locale}/requests`}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("backToOrders")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>{t("catalogTitle")}</CardTitle>
              <CardDescription>{t("catalogDescription")}</CardDescription>
            </div>

            <Tabs value={activeType} onValueChange={(value) => setActiveType(value as CaseItemType)} dir={locale === "ar" ? "rtl" : "ltr"}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
                {ORDER_ITEM_TYPES.map((type) => (
                  <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
                    {tOrders(`itemTypesPlural.${type}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {activeType === "SERVICE" ? (
              <div className="flex flex-wrap gap-2">
                {SERVICE_KIND_FILTERS.map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={kindFilter === kind ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setKindFilter(kind)}
                  >
                    {t(`serviceKinds.${kind}`)}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 rounded-2xl ps-10"
              />
            </div>
          </CardHeader>

          <CardContent>
            {activeQuery?.isLoading ? (
              <AppPreloader variant="panel" title={tCommon("loading")} blockCount={3} blockVariant="line" />
            ) : activeQuery?.isError ? (
              <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="text-destructive">{t("catalogLoadError")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void activeQuery.refetch()}>
                  {tCommon("retry")}
                </Button>
              </div>
            ) : visibleItems.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("catalogEmpty")}</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {visibleItems.map((item) => {
                  const isSelected = selectedKeys.has(item.key);
                  const blockedForVip = item.vipOnly && !isVip;
                  const disabled = blockedForVip || (!isSelected && limitReached);

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl border p-3 transition",
                        isSelected ? "border-primary bg-primary/5" : "border-border/70 bg-background",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium leading-6">{item.name}</p>
                          {item.groupName ? <p className="text-xs text-muted-foreground">{item.groupName}</p> : null}
                        </div>
                        {item.vipOnly ? (
                          <Badge variant="outline" className="shrink-0 gap-1 border-amber-200 bg-amber-50 text-amber-800">
                            <Crown className="h-3 w-3" />
                            {t("vipOnly")}
                          </Badge>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                      ) : null}
                      {item.includedServices.length ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("includedServices", { count: item.includedServices.length })}
                          </p>
                          <ul className="list-disc space-y-0.5 ps-4 text-xs leading-5 text-foreground/80">
                            {item.includedServices.slice(0, INCLUDED_SERVICES_PREVIEW).map((name, index) => (
                              <li key={`${item.key}-${index}`}>{name}</li>
                            ))}
                          </ul>
                          {item.includedServices.length > INCLUDED_SERVICES_PREVIEW ? (
                            <p className="text-xs text-muted-foreground">
                              {t("moreServices", { count: item.includedServices.length - INCLUDED_SERVICES_PREVIEW })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold">
                            {item.price === null ? t("priceOnRequest") : formatCurrency(item.price, locale)}
                          </span>
                          {item.savings !== null ? (
                            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
                              {t("youSave", { amount: formatCurrency(item.savings, locale) })}
                            </Badge>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "secondary" : "default"}
                          className="rounded-full"
                          disabled={disabled && !isSelected}
                          onClick={() => toggleItem(item)}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {isSelected ? t("added") : t("add")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {t("selectedTitle")}
              </CardTitle>
              <CardDescription>{t("maxItems", { max: MAX_CASE_ITEMS })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reorderCaseId && reorderQuery.isLoading ? (
                <AppPreloader variant="inline" title={tCommon("loading")} className="w-full justify-start" />
              ) : null}

              {selectedRows.length ? (
                <ul className="space-y-2">
                  {selectedRows.map((row) => (
                    <li
                      key={row.key}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm",
                        row.unavailable ? "border-amber-200 bg-amber-50/60" : "border-border/70",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.unavailable
                            ? t("unavailable")
                            : getOrderItemTypeLabel({ type: row.ref.type, serviceKind: row.item?.serviceKind }, tOrders)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {row.item ? (
                          <span className="text-xs font-semibold">
                            {row.item.price === null ? "-" : formatCurrency(row.item.price, locale)}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeItem(row.key)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                          aria-label={t("remove")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{t("selectedEmpty")}</p>
              )}

              {hasUnavailable ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("unavailableNotice")}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{t("estimatedTotal")}</span>
                <span className="font-semibold">
                  {formatCurrency(estimatedTotal, locale)}
                  {hasUnpriced ? " +" : ""}
                </span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{isVip ? t("vipPriceNote") : t("priceNote")}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{t("visitTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                  <FormField
                    control={form.control}
                    name="area_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tOrders("area.label")}</FormLabel>
                        <FormControl>
                          <AreaSelect value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("address")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder={t("addressPlaceholder")} />
                        </FormControl>
                        {!addressRequired ? <FormDescription>{t("addressHint")}</FormDescription> : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduled_for"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("scheduledFor")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" min={getMinScheduleInputValue()} />
                        </FormControl>
                        <FormDescription>{t("scheduledForHint")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("notes")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder={t("notesPlaceholder")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="min-h-12 w-full rounded-full"
                    disabled={createMutation.isPending || !orderableRows.length}
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {createMutation.isPending ? t("submitting") : t("submit")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
