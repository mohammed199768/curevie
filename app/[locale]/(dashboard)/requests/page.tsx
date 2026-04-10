"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { casesApi, type PatientCase } from "@/lib/api/cases";
import type { RequestStatus } from "@/lib/api/types";
import { translateEnumValue } from "@/lib/i18n";
import { cn, formatDateTime, formatRelativeTime, normalizeListResponse } from "@/lib/utils";

type FilterKey = "ALL" | "ACTIVE" | "PENDING" | "IN_PROGRESS" | "CLOSED";
type Translator = (key: string, values?: Record<string, string | number>) => string;
type NormalizedRequest = {
  id: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  notes: string;
  service_name: string;
  service_type: "MEDICAL";
  scheduled_at: string | null;
  provider_name: string | null;
  assigned_provider_id: string | null;
  workflow_stage: null;
  service_description: string;
};

const PAGE_SIZE = 8;
const ACTIVE_STATUSES = new Set<RequestStatus>(["PENDING", "ACCEPTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]);

const REQUEST_SURFACES: Record<
  string,
  {
    panel: string;
    badge: string;
    line: string;
    glow: string;
  }
> = {
  PENDING: {
    panel: "border-amber-200/70 bg-amber-50/55 dark:border-amber-900/40 dark:bg-amber-950/10",
    badge: "border-amber-200/80 bg-amber-100/90 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200",
    line: "from-amber-300 via-amber-500 to-orange-400",
    glow: "bg-amber-400/12",
  },
  ASSIGNED: {
    panel: "border-sky-200/70 bg-sky-50/55 dark:border-sky-900/40 dark:bg-sky-950/10",
    badge: "border-sky-200/80 bg-sky-100/90 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200",
    line: "from-sky-300 via-sky-500 to-cyan-400",
    glow: "bg-sky-400/12",
  },
  IN_PROGRESS: {
    panel: "border-cyan-200/70 bg-cyan-50/60 dark:border-cyan-900/40 dark:bg-cyan-950/10",
    badge: "border-cyan-200/80 bg-cyan-100/90 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/50 dark:text-cyan-200",
    line: "from-cyan-300 via-cyan-500 to-emerald-400",
    glow: "bg-cyan-400/12",
  },
  COMPLETED: {
    panel: "border-emerald-200/70 bg-emerald-50/55 dark:border-emerald-900/40 dark:bg-emerald-950/10",
    badge: "border-emerald-200/80 bg-emerald-100/90 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200",
    line: "from-emerald-300 via-emerald-500 to-teal-400",
    glow: "bg-emerald-400/12",
  },
  CLOSED: {
    panel: "border-slate-200/80 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-950/20",
    badge: "border-slate-200/90 bg-slate-100/90 text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-200",
    line: "from-slate-300 via-slate-500 to-slate-400",
    glow: "bg-slate-400/10",
  },
  CANCELLED: {
    panel: "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/10",
    badge: "border-rose-200/80 bg-rose-100/90 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200",
    line: "from-rose-300 via-rose-500 to-red-400",
    glow: "bg-rose-400/12",
  },
  DEFAULT: {
    panel: "border-border/70 bg-background/90",
    badge: "border-border/80 bg-background/90 text-foreground",
    line: "from-primary/20 via-primary to-emerald-400",
    glow: "bg-primary/10",
  },
};

function matchesFilter(status: RequestStatus, filter: FilterKey) {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return ACTIVE_STATUSES.has(status);
  return status === filter;
}

function getRequestSurface(status?: string | null) {
  return REQUEST_SURFACES[String(status || "").toUpperCase()] || REQUEST_SURFACES.DEFAULT;
}

function normalizeCase(c: PatientCase): NormalizedRequest {
  return {
    id: c.id,
    status: String(c.status || "PENDING") as RequestStatus,
    created_at: c.created_at,
    updated_at: c.updated_at ?? c.created_at,
    notes: c.notes ?? "",
    service_name: c.services?.[0]?.service_name ?? "",
    service_type: "MEDICAL",
    scheduled_at: c.appointments?.[0]?.scheduled_at ?? null,
    provider_name: c.lead_provider_name ?? null,
    assigned_provider_id: c.lead_provider_id ?? null,
    workflow_stage: null,
    service_description: c.services?.[0]?.service_description ?? "",
  };
}



function RequestCard({
  item,
  locale,
  prefersReducedMotion,
  tEnums,
  tPage,
}: {
  item: NormalizedRequest;
  locale: string;
  prefersReducedMotion: boolean;
  tEnums: Translator;
  tPage: Translator;
}) {
  const surface = getRequestSurface(item.status);
  const requestNumber = item.id.slice(0, 8);
  const serviceLabel = item.service_name || translateEnumValue(item.service_type, tEnums);
  const visibleWorkflowStage =
    item.workflow_stage === "PUBLISHED" && item.status === "CLOSED" ? "CLOSED" : item.workflow_stage;
  const stageLabel = visibleWorkflowStage ? translateEnumValue(visibleWorkflowStage, tEnums) : tPage("noWorkflowStage");
  const providerLabel = item.provider_name || tPage("pendingAssignment");
  const scheduledLabel = item.scheduled_at ? formatDateTime(item.scheduled_at, "dd/MM/yyyy, HH:mm", locale) : tPage("notScheduled");
  const description =
    item.notes?.trim() ||
    item.service_description?.trim() ||
    tPage("cardDefaultDescription", { status: translateEnumValue(item.status, tEnums) });

  return (
    <motion.article
      layout
      initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="group"
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-[1.8rem] border shadow-[0_22px_70px_-52px_rgba(15,23,42,0.45)] transition-transform duration-300 group-hover:-translate-y-1",
          surface.panel,
        )}
      >
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", surface.line)} />
        <div className={cn("pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full blur-3xl", surface.glow)} />

        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={item.status} />
                {visibleWorkflowStage && visibleWorkflowStage !== "CLOSED" ? (
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", surface.badge)}>
                    {translateEnumValue(visibleWorkflowStage, tEnums)}
                  </span>
                ) : null}
              </div>

              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {tPage("requestNumber")}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">#{requestNumber}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(item.updated_at || item.created_at, locale)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.4rem]">{serviceLabel}</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{tPage("createdLabel")}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>
              </div>

              <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{tPage("scheduledLabel")}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{scheduledLabel}</p>
              </div>

              <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{tPage("providerLabel")}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{providerLabel}</p>
              </div>

              <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{tPage("stageLabel")}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{stageLabel}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-primary" />
                <span>{tPage("updatedLabel", { time: formatRelativeTime(item.updated_at || item.created_at, locale) })}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild className="min-h-11 rounded-full px-5">
                  <Link href={`/${locale}/requests/${item.id}`}>
                    <ArrowUpRight className="h-4 w-4" />
                    {tPage("viewDetails")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const tPage = useTranslations("requestsPage");
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("ALL");

  const query = useQuery({
    queryKey: ["patient-requests-dashboard"],
    queryFn: async () => {
      const payload = normalizeListResponse<PatientCase>((await casesApi.list({ limit: 100 })).data);
      return {
        ...payload,
        data: payload.data.map(normalizeCase),
      };
    },
    staleTime: 30_000,
  });

  const allRows = useMemo(() => {
    const rows = query.data?.data || [];
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [query.data?.data]);

  const filterCounts = useMemo(() => {
    return {
      ALL: allRows.length,
      ACTIVE: allRows.filter((row) => ACTIVE_STATUSES.has(row.status)).length,
      PENDING: allRows.filter((row) => row.status === "PENDING").length,
      IN_PROGRESS: allRows.filter((row) => row.status === "IN_PROGRESS").length,
      CLOSED: allRows.filter((row) => row.status === "CLOSED").length,
    };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => matchesFilter(row.status, statusFilter));
  }, [allRows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const currentRows = pagedRows.filter((row) => ACTIVE_STATUSES.has(row.status));
  const archivedRows = pagedRows.filter((row) => !ACTIVE_STATUSES.has(row.status));
  const latestRequest = allRows[0] || null;
  const hasFiltersApplied = statusFilter !== "ALL";
  const pageStart = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredRows.length);

  const filterOptions: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "ALL", label: tPage("all"), count: filterCounts.ALL },
    { key: "ACTIVE", label: tPage("activeFilter"), count: filterCounts.ACTIVE },
    { key: "PENDING", label: translateEnumValue("PENDING", tEnums), count: filterCounts.PENDING },
    { key: "IN_PROGRESS", label: translateEnumValue("IN_PROGRESS", tEnums), count: filterCounts.IN_PROGRESS },
    { key: "CLOSED", label: translateEnumValue("CLOSED", tEnums), count: filterCounts.CLOSED },
  ];

  if (query.isLoading) {
    return <AppPreloader variant="page" title={t("title")} description={tPage("summaryDescription")} blockCount={4} />;
  }

  if (query.isError) {
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
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="overflow-hidden rounded-[2rem] border-border/70 shadow-[0_36px_90px_-58px_rgba(15,23,42,0.45)]">
          <CardContent className="relative p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_32%)]" />
            <div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/85 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur">
                  <Shield className="h-3.5 w-3.5" />
                  {tPage("summaryEyebrow")}
                </div>

                <div className="space-y-3">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.45rem]">{t("title")}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">
                      {tPage("summaryDescription")}
                    </p>
                  </div>

                  {latestRequest ? (
                    <div className="rounded-[1.55rem] border border-white/70 bg-background/88 p-4 shadow-sm backdrop-blur">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{tPage("latestRequest")}</p>
                          <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                            {latestRequest.service_name || translateEnumValue(latestRequest.service_type, tEnums)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {tPage("latestRequestDescription", {
                              time: formatRelativeTime(latestRequest.updated_at || latestRequest.created_at, locale),
                            })}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={latestRequest.service_type} />
                          <StatusBadge value={latestRequest.status} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {latestRequest ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto min-h-[8.75rem] justify-start rounded-[1.65rem] border-white/70 bg-background/88 p-0 text-start shadow-sm backdrop-blur hover:bg-background"
                  >
                    <Link href={`/${locale}/requests/${latestRequest.id}`} className="flex h-full w-full flex-col justify-between gap-6 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{tPage("openLatest")}</span>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{tPage("latestRequest")}</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                          {latestRequest.service_name || translateEnumValue(latestRequest.service_type, tEnums)}
                        </p>
                      </div>
                    </Link>
                  </Button>
                ) : null}

                <Button
                  asChild
                  className={cn(
                    "h-auto min-h-[8.75rem] justify-start rounded-[1.65rem] p-0 text-start shadow-[0_24px_70px_-50px_rgba(14,165,233,0.6)]",
                    !latestRequest && "sm:col-span-2 xl:col-span-1",
                  )}
                >
                  <Link href={`/${locale}/requests/new`} className="flex h-full w-full flex-col justify-between gap-6 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-primary-foreground">{t("newRequest")}</span>
                      <Plus className="h-5 w-5 shrink-0 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/70">{tPage("summaryEyebrow")}</p>
                      <p className="mt-2 text-lg font-semibold tracking-tight text-primary-foreground">{t("newRequest")}</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.04 }}
      >
        <Card className="rounded-[1.8rem] border-border/70 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.38)]">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold">{tPage("filtersTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tPage("filtersDescription")}</p>
              </div>
              {hasFiltersApplied ? (
                <Button
                  variant="ghost"
                  className="min-h-11 self-start rounded-full px-4"
                  onClick={() =>
                    startTransition(() => {
                      setStatusFilter("ALL");
                      setPage(1);
                    })
                  }
                >
                  {tPage("clearFilters")}
                </Button>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map((option) => {
                const active = statusFilter === option.key;

                return (
                  <Button
                    key={option.key}
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "min-h-11 shrink-0 rounded-full px-4",
                      !active && "border-border/70 bg-background/90",
                    )}
                    onClick={() =>
                      startTransition(() => {
                        setStatusFilter(option.key);
                        setPage(1);
                      })
                    }
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {option.count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {filteredRows.length ? (
        <div className="space-y-6">
          {currentRows.length ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{tPage("currentRequestsTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{tPage("currentRequestsDescription")}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {currentRows.length}
                </span>
              </div>

              <div className="grid gap-4">
                {currentRows.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    prefersReducedMotion={Boolean(prefersReducedMotion)}
                    tEnums={tEnums}
                    tPage={tPage}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {archivedRows.length ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{tPage("archivedRequestsTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{tPage("archivedRequestsDescription")}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {archivedRows.length}
                </span>
              </div>

              <div className="grid gap-4">
                {archivedRows.map((item) => (
                  <RequestCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    prefersReducedMotion={Boolean(prefersReducedMotion)}
                    tEnums={tEnums}
                    tPage={tPage}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/70 bg-background/90 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-muted-foreground">
              {tPage("showingResults", {
                from: pageStart,
                to: pageEnd,
                total: filteredRows.length,
              })}
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
                  <Button
                    variant="outline"
                    className="min-h-11 rounded-full px-5"
                    onClick={() =>
                      startTransition(() => {
                        setStatusFilter("ALL");
                        setPage(1);
                      })
                    }
                  >
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
