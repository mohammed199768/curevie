"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock, MapPin, Plus, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppCard, EmptyState, ForwardChevron, ListSkeleton, PageIntro, appButton } from "@/components/app/ui";
import { CaseStatusBadge, PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { casesApi, type CaseListRow, type CaseStatus } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { getCaseReference, isolateLtr } from "@/lib/order-stage";
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

const STATUS_ACCENT: Record<CaseStatus, string> = {
  PENDING: "bg-[#f0a020]",
  ACCEPTED: "bg-[#104d49]",
  IN_PROGRESS: "bg-[#86ab62]",
  COMPLETED: "bg-[#22a05a]",
  CLOSED: "bg-[#c4c8ca]",
  CANCELLED: "bg-[#e5484d]",
};

function OrderCard({
  item,
  locale,
  index,
  reduceMotion,
  tPage,
  tOrders,
}: {
  item: CaseListRow;
  locale: string;
  index: number;
  reduceMotion: boolean;
  tPage: Translator;
  tOrders: Translator;
}) {
  const reference = getCaseReference(item.id);
  const itemNames = (item.item_names || []).filter(Boolean);
  const title = itemNames[0] || tOrders("reference", { reference: isolateLtr(reference) });
  const extraCount = Math.max(0, itemNames.length - 1);
  const areaName = locale.startsWith("ar") ? item.area_name_ar || item.area_name_en : item.area_name_en || item.area_name_ar;

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.04 }}
      className="app-card relative overflow-hidden"
    >
      <span aria-hidden="true" className={cn("absolute inset-y-4 start-0 w-1 rounded-e-full", STATUS_ACCENT[item.status])} />
      <Link href={`/${locale}/requests/${item.id}`} className="app-press block px-5 pb-4 pt-4 hover:bg-[#fafcfb] dark:hover:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3">
          <CaseStatusBadge status={item.status} size="sm" />
          <span className="text-[13px] text-muted-foreground">{formatRelativeTime(item.updated_at || item.created_at, locale)}</span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[17px] font-bold leading-6 text-foreground">
              {title}
              {extraCount ? (
                <span className="ms-1.5 text-[14px] font-medium text-muted-foreground">{tPage("moreItems", { count: extraCount })}</span>
              ) : null}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground" dir="auto">
              {reference} · {formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)}
            </p>
          </div>
          <ForwardChevron className="mt-1 shrink-0 text-muted-foreground/60" />
        </div>

        {item.status === "CANCELLED" && item.cancel_reason ? (
          <p className="mt-2 line-clamp-2 text-[14px] text-muted-foreground">{item.cancel_reason}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          {areaName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#5a7a50]" />
              {areaName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-[#5a7a50]" />
            {item.scheduled_for ? formatDateTime(item.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : tPage("notScheduled")}
          </span>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--app-card-border)] px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[16px] font-bold tabular-nums text-foreground">
            {item.final_amount !== null ? formatCurrency(item.final_amount, locale) : "-"}
          </span>
          {item.payment_status && item.status !== "CANCELLED" ? <PaymentStatusBadge status={item.payment_status} /> : null}
        </div>
        <Link
          href={`/${locale}/requests/new?reorder=${item.id}`}
          className="app-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[#104d49] hover:bg-[#e6f0ee] dark:text-teal-200 dark:hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" />
          {tPage("orderAgain")}
        </Link>
      </div>
    </motion.article>
  );
}

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("requestsPage");
  const tOrders = useTranslations("orders");
  const tHome = useTranslations("app.home");
  const locale = useLocale();
  const reduceMotion = Boolean(useReducedMotion());

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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageIntro
        title={t("title")}
        className="hidden md:flex"
        action={
          <Link href={`/${locale}/requests/new`} className={cn(appButton.primary, "min-h-12")}>
            <Plus />
            {t("newRequest")}
          </Link>
        }
      />

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        <div className="flex w-max gap-2 pb-1" role="tablist">
          {FILTER_KEYS.map((key) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeFilter(key)}
                className={cn(
                  "app-press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
                  active
                    ? "bg-[#104d49] text-white shadow-[0_8px_18px_-10px_rgba(16,77,73,0.8)]"
                    : "bg-card text-foreground ring-1 ring-[var(--app-card-border)] hover:bg-[#f3f7f5] dark:hover:bg-white/5",
                )}
              >
                {filterLabel(key)}
                {active && query.data ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[12px] font-bold">{total}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : query.isError && !query.data ? (
        <AppCard className="p-6 text-center">
          <p className="text-[17px] font-bold">{tCommon("error")}</p>
          <p className="mt-1 text-[15px] text-muted-foreground">{tPage("loadError")}</p>
          <button type="button" className={cn(appButton.secondary, "mt-4")} onClick={() => void query.refetch()}>
            {tPage("tryAgain")}
          </button>
        </AppCard>
      ) : rows.length ? (
        <div className={cn("space-y-3 transition-opacity", query.isFetching && query.isPlaceholderData && "opacity-60")}>
          {rows.map((item, index) => (
            <OrderCard
              key={item.id}
              item={item}
              index={index}
              locale={locale}
              reduceMotion={reduceMotion}
              tPage={tPage}
              tOrders={tOrders}
            />
          ))}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className={cn(appButton.secondary, "min-h-11 px-4")}
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {tCommon("prev")}
              </button>
              <span className="text-center text-[13px] text-muted-foreground">
                {tPage("showingResults", { from: pageStart, to: pageEnd, total })}
              </span>
              <button
                type="button"
                className={cn(appButton.secondary, "min-h-11 px-4")}
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                {tCommon("next")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          illustration="empty-orders"
          title={hasFiltersApplied ? tPage("noFilteredRequestsTitle") : tHome("emptyTitle")}
          description={hasFiltersApplied ? tPage("noFilteredRequestsDescription") : tPage("emptyDescription")}
          action={
            <>
              <Link href={`/${locale}/requests/new`} className={appButton.primary}>
                <Plus />
                {t("bookFirst")}
              </Link>
              {hasFiltersApplied ? (
                <button type="button" className={appButton.secondary} onClick={() => changeFilter("ALL")}>
                  {tPage("clearFilters")}
                </button>
              ) : null}
            </>
          }
        />
      )}
    </div>
  );
}
