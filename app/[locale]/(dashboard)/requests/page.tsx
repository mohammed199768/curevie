"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CalendarClock, CheckCheck, MapPin, Plus, RotateCcw, Search, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CaseStatusBadge, PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { casesApi, type CaseListRow, type CaseStatus } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";

type FilterKey = "ALL" | "ACTIVE" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CLOSED" | "CANCELLED";
type Translator = (key: string, values?: Record<string, string | number>) => string;

const PAGE_SIZE = 8;

/** Status filter sent to the server as ?status=A,B */
const FILTER_STATUSES: Record<FilterKey, CaseStatus[] | undefined> = {
  ALL: undefined,
  ACTIVE: ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
  PENDING: ["PENDING"],
  IN_PROGRESS: ["ACCEPTED", "IN_PROGRESS"],
  COMPLETED: ["COMPLETED"],
  CLOSED: ["CLOSED"],
  CANCELLED: ["CANCELLED"],
};

const FILTER_KEYS: FilterKey[] = ["ALL", "ACTIVE", "PENDING", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED"];

const STATUS_LINES: Record<string, string> = {
  PENDING: "from-amber-300 via-amber-500 to-orange-400",
  ACCEPTED: "from-sky-300 via-sky-500 to-cyan-400",
  IN_PROGRESS: "from-cyan-300 via-cyan-500 to-emerald-400",
  COMPLETED: "from-emerald-300 via-emerald-500 to-teal-400",
  CLOSED: "from-slate-300 via-slate-500 to-slate-400",
  CANCELLED: "from-rose-300 via-rose-500 to-red-400",
};

function OrderCard({
  item,
  locale,
  prefersReducedMotion,
  tPage,
  tOrders,
}: {
  item: CaseListRow;
  locale: string;
  prefersReducedMotion: boolean;
  tPage: Translator;
  tOrders: Translator;
}) {
  const reference = `#${item.id.slice(0, 8).toUpperCase()}`;
  const itemNames = (item.item_names || []).filter(Boolean);
  const title = itemNames[0] || tOrders("reference", { reference });
  const extraCount = Math.max(0, itemNames.length - 1);
  const areaName = locale.startsWith("ar") ? item.area_name_ar || item.area_name_en : item.area_name_en || item.area_name_ar;

  return (
    <motion.article
      layout
      initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <Card className="relative overflow-hidden rounded-[1.8rem] border-border/70 shadow-[0_22px_70px_-52px_rgba(15,23,42,0.45)]">
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", STATUS_LINES[item.status] || STATUS_LINES.PENDING)} />
        <CardContent className="relative space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <CaseStatusBadge status={item.status} />
              {item.payment_status ? <PaymentStatusBadge status={item.payment_status} /> : null}
            </div>
            <div className="text-end">
              <p className="text-sm font-semibold text-foreground">{reference}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(item.updated_at || item.created_at, locale)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
              {extraCount ? <span className="ms-2 text-sm font-medium text-muted-foreground">{tPage("moreItems", { count: extraCount })}</span> : null}
            </h2>
            {item.status === "CANCELLED" && item.cancel_reason ? (
              <p className="text-sm text-muted-foreground">{item.cancel_reason}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label={tPage("createdLabel")} value={formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)} />
            <Tile
              label={tPage("scheduledLabel")}
              value={item.scheduled_for ? formatDateTime(item.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : tPage("notScheduled")}
            />
            <Tile label={tPage("providerLabel")} value={item.lead_provider_name || tPage("pendingAssignment")} />
            <Tile label={tPage("totalLabel")} value={item.final_amount !== null ? formatCurrency(item.final_amount, locale) : "-"} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {areaName ? (
                <>
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{areaName}</span>
                </>
              ) : (
                <>
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span>{tPage("updatedLabel", { time: formatRelativeTime(item.updated_at || item.created_at, locale) })}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11 rounded-full px-5">
                <Link href={`/${locale}/requests/new?reorder=${item.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  {tPage("orderAgain")}
                </Link>
              </Button>
              <Button asChild className="min-h-11 rounded-full px-5">
                <Link href={`/${locale}/requests/${item.id}`}>
                  <ArrowUpRight className="h-4 w-4" />
                  {tPage("viewDetails")}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("requestsPage");
  const tOrders = useTranslations("orders");
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("ALL");

  const query = useQuery({
    queryKey: ["cases", "list", { page, limit: PAGE_SIZE, status: statusFilter }],
    queryFn: () => casesApi.list({ page, limit: PAGE_SIZE, status: FILTER_STATUSES[statusFilter] }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const rows = query.data?.cases || [];
  const total = query.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFiltersApplied = statusFilter !== "ALL";
  const pageStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const changeFilter = (filter: FilterKey) =>
    startTransition(() => {
      setStatusFilter(filter);
      setPage(1);
    });

  const filterLabel = (key: FilterKey) => {
    if (key === "ALL") return tPage("all");
    if (key === "ACTIVE") return tPage("activeFilter");
    return tOrders(`caseStatus.${key}`);
  };

  if (query.isLoading) {
    return <AppPreloader variant="page" title={t("title")} description={tPage("summaryDescription")} blockCount={4} />;
  }

  if (query.isError && !query.data) {
    return (
      <Card className="rounded-[1.8rem] border-border/70 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.45)]">
        <CardHeader>
          <CardTitle>{tCommon("error")}</CardTitle>
          <CardDescription>{tPage("loadError")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void query.refetch()}>{tPage("tryAgain")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-border/70 shadow-[0_36px_90px_-58px_rgba(15,23,42,0.45)]">
        <CardContent className="relative p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_32%)]" />
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/85 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur">
                <Shield className="h-3.5 w-3.5" />
                {tPage("summaryEyebrow")}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.45rem]">{t("title")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">{tPage("summaryDescription")}</p>
              </div>
            </div>
            <Button asChild className="min-h-12 rounded-full px-6">
              <Link href={`/${locale}/requests/new`}>
                <Plus className="h-5 w-5" />
                {t("newRequest")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-border/70 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.38)]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold">{tPage("filtersTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tPage("filtersDescription")}</p>
            </div>
            {hasFiltersApplied ? (
              <Button variant="ghost" className="min-h-11 self-start rounded-full px-4" onClick={() => changeFilter("ALL")}>
                {tPage("clearFilters")}
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTER_KEYS.map((key) => {
              const active = statusFilter === key;

              return (
                <Button
                  key={key}
                  variant={active ? "default" : "outline"}
                  className={cn("min-h-11 shrink-0 rounded-full px-4", !active && "border-border/70 bg-background/90")}
                  onClick={() => changeFilter(key)}
                >
                  <span>{filterLabel(key)}</span>
                  {active ? (
                    <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {total}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {rows.length ? (
        <div className={cn("space-y-4", query.isFetching && query.isPlaceholderData && "opacity-70")}>
          <div className="grid gap-4">
            {rows.map((item) => (
              <OrderCard
                key={item.id}
                item={item}
                locale={locale}
                prefersReducedMotion={Boolean(prefersReducedMotion)}
                tPage={tPage}
                tOrders={tOrders}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/70 bg-background/90 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-muted-foreground">
              {tPage("showingResults", { from: pageStart, to: pageEnd, total })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="min-h-11 rounded-full px-4"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {tCommon("prev")}
              </Button>
              <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                {tCommon("pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                className="min-h-11 rounded-full px-4"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                {tCommon("next")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-[1.9rem] border-border/70 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.42)]">
          <CardContent className="relative p-8 text-center sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_34%)]" />
            <div className="relative mx-auto max-w-xl">
              <div className="mx-auto flex size-16 items-center justify-center rounded-[1.5rem] border border-primary/15 bg-primary/10 text-primary shadow-sm">
                {hasFiltersApplied ? <Search className="h-6 w-6" /> : <CheckCheck className="h-6 w-6" />}
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                {hasFiltersApplied ? tPage("noFilteredRequestsTitle") : t("noRequests")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {hasFiltersApplied ? tPage("noFilteredRequestsDescription") : tPage("emptyDescription")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {hasFiltersApplied ? (
                  <Button variant="outline" className="min-h-11 rounded-full px-5" onClick={() => changeFilter("ALL")}>
                    {tPage("clearFilters")}
                  </Button>
                ) : null}
                <Button asChild className="min-h-11 rounded-full px-5">
                  <Link href={`/${locale}/requests/new`}>
                    <Plus className="h-4 w-4" />
                    {t("bookFirst")}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
