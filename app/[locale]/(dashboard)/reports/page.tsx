"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  ScanLine,
  Search,
  Stethoscope,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  casesApi,
  type CaseListRow,
  type CaseProviderFile,
  type CaseReport,
  type CaseServiceLine,
  type CaseView,
} from "@/lib/api/cases";
import { downloadProtectedFile } from "@/lib/download";
import { getOrderItemTypeLabel } from "@/lib/order-items";
import { getCaseReference } from "@/lib/order-stage";
import { cn, formatDateTime } from "@/lib/utils";
import { AppCard, EmptyState, ListSkeleton, appButton } from "@/components/app/ui";
import { ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";

type ReportFilter = "ALL" | "DOCTOR" | "LAB" | "IMAGING";

type ReportsArchiveItem = {
  caseId: string;
  view: CaseView;
  report: CaseReport;
  services: CaseServiceLine[];
  categories: Array<Exclude<ReportFilter, "ALL">>;
  occurredAt: string;
  searchableText: string;
  providersLabel: string;
};

const MAX_CASE_PAGES = 10;

function getServiceFilter(service: CaseServiceLine): Exclude<ReportFilter, "ALL"> {
  if (service.service_kind === "LAB") return "LAB";
  if (service.service_kind === "RADIOLOGY") return "IMAGING";
  return "DOCTOR";
}

function getServiceCategories(services: CaseServiceLine[]) {
  return Array.from(new Set(services.map(getServiceFilter)));
}

function buildProvidersLabel(services: CaseServiceLine[]) {
  const providerNames = Array.from(
    new Set(services.map((service) => service.provider_name).filter((value): value is string => Boolean(value))),
  );

  if (!providerNames.length) return "-";
  if (providerNames.length <= 2) return providerNames.join(" • ");
  return `${providerNames.slice(0, 2).join(" • ")} +${providerNames.length - 2}`;
}

function buildSearchableText(view: CaseView) {
  return [
    view.case.id,
    view.case.lead_provider_name,
    view.case.notes,
    ...view.services.flatMap((service) => [service.item_name, service.provider_name, service.provider_type, service.status]),
    ...view.provider_files.flatMap((file) => [file.service_name, file.provider_name, file.original_name]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function fetchClosedCases() {
  const rows: CaseListRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await casesApi.list({ page, limit: 100, status: ["CLOSED"] });
    rows.push(...result.cases);
    totalPages = Math.max(1, Math.ceil(result.total / Math.max(result.limit || 100, 1)));
    page += 1;
  } while (page <= totalPages && page <= MAX_CASE_PAGES);

  return rows;
}

function FilterButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: typeof Stethoscope;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "app-press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
        active
          ? "bg-[#104d49] text-white"
          : "bg-card text-foreground ring-1 ring-[var(--app-card-border)] hover:bg-[#f3f7f5] dark:hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", active ? "bg-white/20" : "bg-[#f1f5f4] text-muted-foreground dark:bg-white/10")}>
        {count}
      </span>
    </button>
  );
}

export default function ReportsPage() {
  const locale = useLocale();
  const tPage = useTranslations("reportsPage");
  const tOrders = useTranslations("orders");

  const [activeFilter, setActiveFilter] = useState<ReportFilter>("ALL");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pendingDownload, setPendingDownload] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  const historyQuery = useQuery({
    queryKey: ["cases", "list", "reports-archive"],
    queryFn: async (): Promise<ReportsArchiveItem[]> => {
      const closedCases = await fetchClosedCases();

      const entries = await Promise.all(
        closedCases.map(async (row) => {
          const [detailResult, reportResult] = await Promise.allSettled([
            casesApi.getById(row.id),
            casesApi.getReport(row.id),
          ]);

          if (detailResult.status !== "fulfilled" || reportResult.status !== "fulfilled") {
            return null;
          }

          const view = detailResult.value;
          const report = reportResult.value;

          if (!report || report.status !== "PUBLISHED") {
            return null;
          }

          const services = view.services.filter((service) => service.status !== "CANCELLED");

          return {
            caseId: view.case.id,
            view,
            report,
            services,
            categories: getServiceCategories(services),
            occurredAt: report.published_at || view.case.closed_at || view.case.updated_at || view.case.created_at,
            searchableText: buildSearchableText(view),
            providersLabel: buildProvidersLabel(services),
          } satisfies ReportsArchiveItem;
        }),
      );

      return entries
        .filter((entry): entry is ReportsArchiveItem => entry !== null)
        .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
    },
    staleTime: 60_000,
  });

  const filterCounts = useMemo(() => {
    const items = historyQuery.data || [];
    return {
      ALL: items.length,
      DOCTOR: items.filter((item) => item.categories.includes("DOCTOR")).length,
      LAB: items.filter((item) => item.categories.includes("LAB")).length,
      IMAGING: items.filter((item) => item.categories.includes("IMAGING")).length,
    };
  }, [historyQuery.data]);

  const filteredItems = useMemo(() => {
    return (historyQuery.data || []).filter((item) => {
      const matchesFilter = activeFilter === "ALL" || item.categories.includes(activeFilter);
      const matchesSearch = !deferredSearch || item.searchableText.includes(deferredSearch);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, deferredSearch, historyQuery.data]);

  const filterOptions = [
    { key: "ALL" as const, icon: CalendarDays },
    { key: "DOCTOR" as const, icon: Stethoscope },
    { key: "LAB" as const, icon: FlaskConical },
    { key: "IMAGING" as const, icon: ScanLine },
  ];

  const runDownload = async (key: string, request: Parameters<typeof downloadProtectedFile>[0], fileName: string) => {
    setPendingDownload(key);
    try {
      await downloadProtectedFile(request, fileName);
    } catch {
      toast.error(tPage("downloadFailed"));
    } finally {
      setPendingDownload(null);
    }
  };

  const downloadIcon = (key: string) =>
    pendingDownload === key ? <Loader2 className="animate-spin" /> : <Download />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="hidden px-1 text-[26px] font-bold text-foreground md:block">{tPage("title")}</p>
      <p className="px-1 text-[14px] leading-6 text-muted-foreground">{tPage("description")}</p>

      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={tPage("searchPlaceholder")}
          className="h-[52px] w-full rounded-2xl border border-[var(--app-card-border)] bg-card pe-4 ps-12 text-[16px] shadow-sm outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        <div className="flex w-max gap-2 pb-1">
          {filterOptions.map((filter) => (
            <FilterButton
              key={filter.key}
              active={activeFilter === filter.key}
              count={filterCounts[filter.key]}
              icon={filter.icon}
              label={tPage(`filters.${filter.key}`)}
              onClick={() => setActiveFilter(filter.key)}
            />
          ))}
        </div>
      </div>

      {historyQuery.isLoading ? (
        <ListSkeleton rows={3} />
      ) : historyQuery.isError ? (
        <AppCard className="p-6 text-[15px] text-rose-700 dark:text-rose-300">{tPage("loadError")}</AppCard>
      ) : filteredItems.length ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isExpanded = expandedCaseId === item.caseId;
            const files = item.view.provider_files;
            const reference = getCaseReference(item.caseId);

            return (
              <AppCard key={item.caseId} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedCaseId(isExpanded ? null : item.caseId)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-start gap-3 p-4 text-start hover:bg-[#fafcfb] dark:hover:bg-white/[0.03]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f1fb] text-[#1d5fa8] dark:bg-sky-500/15 dark:text-sky-200">
                    <FileText className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[16px] font-bold leading-6 text-foreground">
                      {item.services.map((service) => service.item_name).join(" + ") || tPage("title")}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {tPage("caseLabel")} {reference} · {formatDateTime(item.occurredAt, "dd/MM/yyyy", locale)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.categories.map((category) => (
                        <span key={`${item.caseId}-${category}`} className="rounded-full bg-[#f1f5f4] px-2.5 py-1 text-[12px] font-semibold text-[#3d5a54] dark:bg-white/5 dark:text-slate-200">
                          {tPage(`filters.${category}`)}
                        </span>
                      ))}
                      {item.report.has_sick_leave ? (
                        <span className="rounded-full bg-[#fff4e0] px-2.5 py-1 text-[12px] font-semibold text-[#8a5200] dark:bg-amber-500/15 dark:text-amber-200">
                          {tPage("sickLeave")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>

                <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
                  {item.report.has_pdf ? (
                    <button
                      type="button"
                      className={cn(appButton.primary, "min-h-12")}
                      disabled={pendingDownload === `report-${item.caseId}`}
                      onClick={() =>
                        void runDownload(`report-${item.caseId}`, () => casesApi.downloadReportPdf(item.caseId), `case-report-${item.caseId.slice(0, 8)}.pdf`)
                      }
                    >
                      {downloadIcon(`report-${item.caseId}`)}
                      {tPage("downloadPdf")}
                    </button>
                  ) : null}
                  {item.report.has_sick_leave ? (
                    <button
                      type="button"
                      className={cn(appButton.secondary, "min-h-12")}
                      disabled={pendingDownload === `sick-${item.caseId}`}
                      onClick={() =>
                        void runDownload(`sick-${item.caseId}`, () => casesApi.downloadSickLeavePdf(item.caseId), `sick-leave-${item.caseId.slice(0, 8)}.pdf`)
                      }
                    >
                      {downloadIcon(`sick-${item.caseId}`)}
                      {tPage("downloadSickLeave")}
                    </button>
                  ) : null}
                </div>

                {isExpanded ? (
                  <div className="space-y-4 border-t border-[var(--app-card-border)] bg-[#f8fbfa] p-4 dark:bg-white/[0.02]">
                    <p className="text-[13px] text-muted-foreground">
                      {tPage("providedBy")}: <span className="font-semibold text-foreground">{item.providersLabel}</span>
                      {" · "}
                      {tPage("publishedAt")}: {formatDateTime(item.report.published_at || item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}
                    </p>

                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                        <Stethoscope className="h-4 w-4 text-[#5a7a50]" />
                        {tPage("includedServices")}
                      </h3>
                      <div className="space-y-2">
                        {item.services.map((service) => (
                          <div key={service.id} className="rounded-2xl bg-card p-3.5 ring-1 ring-[var(--app-card-border)]">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-foreground">{service.item_name}</p>
                                <p className="text-[13px] text-muted-foreground">
                                  {getOrderItemTypeLabel({ type: service.item_type, serviceKind: service.service_kind }, tOrders)}
                                  {service.provider_name ? ` · ${service.provider_name}` : ""}
                                </p>
                              </div>
                              <ServiceStatusBadge status={service.status} />
                            </div>
                            <p className="mt-2 text-[13px] text-muted-foreground">
                              {tPage("completedAt")}: {service.completed_at ? formatDateTime(service.completed_at, "dd/MM/yyyy, HH:mm", locale) : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                        <FileText className="h-4 w-4 text-[#5a7a50]" />
                        {tPage("sourceFiles")}
                      </h3>
                      {files.length ? (
                        <div className="space-y-2">
                          {files.map((file: CaseProviderFile) => (
                            <div key={file.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-[var(--app-card-border)]">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold text-foreground">{file.original_name || file.service_name || "-"}</p>
                                <p className="truncate text-[12.5px] text-muted-foreground">
                                  {file.is_sick_leave ? `${tPage("sickLeave")} · ` : ""}
                                  {file.service_name ? `${file.service_name} · ` : ""}
                                  {formatDateTime(file.created_at, "dd/MM/yyyy", locale)}
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label={tPage("viewFile")}
                                className="app-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#e6f0ee] px-4 text-[14px] font-semibold text-[#104d49] disabled:opacity-50 dark:bg-teal-500/15 dark:text-teal-100"
                                disabled={pendingDownload === `file-${file.id}`}
                                onClick={() =>
                                  void runDownload(`file-${file.id}`, () => casesApi.downloadProviderFile(file), file.original_name || `file-${file.id.slice(0, 8)}`)
                                }
                              >
                                {downloadIcon(`file-${file.id}`)}
                                {tPage("viewFile")}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[14px] text-muted-foreground">{tPage("noSourceFiles")}</p>
                      )}
                    </section>
                  </div>
                ) : null}
              </AppCard>
            );
          })}
        </div>
      ) : (
        <EmptyState
          illustration="empty-orders"
          title={historyQuery.data?.length ? tPage("emptyFiltered") : tPage("empty")}
        />
      )}
    </div>
  );
}
