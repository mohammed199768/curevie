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
import { cn, formatDateTime } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

const REPORT_FILTERS: ReportFilter[] = ["ALL", "DOCTOR", "LAB", "IMAGING"];
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
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
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
    pendingDownload === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-slate-900">{tPage("title")}</CardTitle>
              <CardDescription className="max-w-3xl text-sm text-slate-600">{tPage("description")}</CardDescription>
            </div>
            <p className="max-w-xl text-sm text-slate-500">{tPage("searchHint")}</p>
          </div>

          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={tPage("searchPlaceholder")}
              className="h-11 rounded-2xl border-slate-200 bg-white/90 px-10 text-sm shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
        </CardHeader>
      </Card>

      {historyQuery.isLoading ? (
        <AppPreloader variant="page" title={tPage("title")} description={tPage("description")} blockCount={4} />
      ) : historyQuery.isError ? (
        <Card className="rounded-[24px] border-red-200 bg-red-50">
          <CardContent className="p-6 text-sm text-red-700">{tPage("loadError")}</CardContent>
        </Card>
      ) : filteredItems.length ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedCaseId === item.caseId;
            const categoryBadges =
              activeFilter === "ALL" ? item.categories : item.categories.filter((category) => category === activeFilter);
            const files = item.view.provider_files;
            const reference = `#${item.caseId.slice(0, 8).toUpperCase()}`;

            return (
              <Card key={item.caseId} className="rounded-[26px] border-slate-200/80 shadow-sm">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setExpandedCaseId(isExpanded ? null : item.caseId)}
                    className="w-full text-start"
                  >
                    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {categoryBadges.map((category) => (
                            <Badge
                              key={`${item.caseId}-${category}`}
                              variant="outline"
                              className="rounded-full border-slate-300 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-600"
                            >
                              {tPage(`filters.${category}`)}
                            </Badge>
                          ))}
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] tracking-wide text-emerald-700"
                          >
                            {tPage("servicesCount", { count: item.services.length })}
                          </Badge>
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            {item.services.map((service) => service.item_name).join(" + ") || tPage("title")}
                          </h2>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span>{tPage("caseLabel")} {reference}</span>
                            <span>{tPage("providedBy")}: {item.providersLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-500 md:text-end">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">{formatDateTime(item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}</p>
                          <p>{tPage("publishedAt")}: {formatDateTime(item.report.published_at || item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-200/80 bg-slate-50/70 p-5">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {item.report.has_pdf ? (
                          <Button
                            variant="outline"
                            disabled={pendingDownload === `report-${item.caseId}`}
                            onClick={() =>
                              void runDownload(`report-${item.caseId}`, () => casesApi.downloadReportPdf(item.caseId), `case-report-${item.caseId.slice(0, 8)}.pdf`)
                            }
                          >
                            {downloadIcon(`report-${item.caseId}`)}
                            {tPage("downloadPdf")}
                          </Button>
                        ) : null}
                        {item.report.has_sick_leave ? (
                          <Button
                            variant="outline"
                            disabled={pendingDownload === `sick-${item.caseId}`}
                            onClick={() =>
                              void runDownload(`sick-${item.caseId}`, () => casesApi.downloadSickLeavePdf(item.caseId), `sick-leave-${item.caseId.slice(0, 8)}.pdf`)
                            }
                          >
                            {downloadIcon(`sick-${item.caseId}`)}
                            {tPage("downloadSickLeave")}
                          </Button>
                        ) : null}
                        <Button variant="ghost" onClick={() => setExpandedCaseId(null)}>
                          {tPage("hideDetails")}
                        </Button>
                      </div>

                      <div className="space-y-5">
                        <section className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-slate-900">
                            <Stethoscope className="h-4 w-4 text-sky-600" />
                            <h3 className="font-semibold">{tPage("includedServices")}</h3>
                          </div>
                          <p className="text-sm text-slate-500">{tPage("includedServicesDescription")}</p>

                          <div className="grid gap-3 lg:grid-cols-2">
                            {item.services.map((service) => (
                              <div key={service.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-slate-900">{service.item_name}</p>
                                    <p className="text-xs text-slate-500">{getOrderItemTypeLabel({ type: service.item_type, serviceKind: service.service_kind }, tOrders)}</p>
                                  </div>
                                  <ServiceStatusBadge status={service.status} />
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tPage("providedBy")}</p>
                                    <p className="mt-1 text-sm text-slate-700">{service.provider_name || "-"}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tPage("completedAt")}</p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {service.completed_at ? formatDateTime(service.completed_at, "dd/MM/yyyy, HH:mm", locale) : "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-slate-900">
                            <FileText className="h-4 w-4 text-emerald-600" />
                            <h3 className="font-semibold">{tPage("sourceFiles")}</h3>
                          </div>
                          <p className="text-sm text-slate-500">{tPage("sourceFilesDescription")}</p>

                          {files.length ? (
                            <div className="space-y-3">
                              {files.map((file: CaseProviderFile) => (
                                <div
                                  key={file.id}
                                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/85 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-slate-600">
                                        {file.file_type}
                                      </Badge>
                                      {file.is_sick_leave ? (
                                        <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] tracking-wide text-amber-700">
                                          {tPage("sickLeave")}
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="text-sm font-medium text-slate-900">{file.original_name || file.service_name || "-"}</p>
                                    <p className="text-xs text-slate-500">
                                      {file.service_name ? `${file.service_name} · ` : ""}
                                      {tPage("uploadedAt")}: {formatDateTime(file.created_at, "dd/MM/yyyy, HH:mm", locale)}
                                    </p>
                                  </div>

                                  <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    disabled={pendingDownload === `file-${file.id}`}
                                    onClick={() =>
                                      void runDownload(`file-${file.id}`, () => casesApi.downloadProviderFile(file), file.original_name || `file-${file.id.slice(0, 8)}`)
                                    }
                                  >
                                    {downloadIcon(`file-${file.id}`)}
                                    {tPage("viewFile")}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">{tPage("noSourceFiles")}</p>
                          )}
                        </section>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end border-t border-slate-200/70 px-5 py-3 text-sm text-slate-500">
                      <span>
                        {REPORT_FILTERS.filter((filter) => filter !== "ALL" && item.categories.includes(filter))
                          .map((filter) => tPage(`filters.${filter}`))
                          .join(" | ")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-[24px] border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            {historyQuery.data?.length ? tPage("emptyFiltered") : tPage("empty")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
