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
  ScanLine,
  Search,
  Stethoscope,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  casesApi,
  type PatientCase,
  type PatientCaseProviderFile,
  type PatientCaseReport,
  type PatientCaseService,
} from "@/lib/api/cases";
import { cn, formatDateTime, triggerBlobDownload } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ReportFilter = "ALL" | "DOCTOR" | "LAB" | "IMAGING";

type ReportsArchiveItem = {
  id: string;
  caseId: string;
  caseDetail: PatientCase;
  report: PatientCaseReport;
  services: PatientCaseService[];
  categories: Array<Exclude<ReportFilter, "ALL">>;
  occurredAt: string;
  serviceSummary: string;
  searchableText: string;
  providersLabel: string;
};

type ReportsCopy = {
  title: string;
  description: string;
  searchPlaceholder: string;
  searchHint: string;
  empty: string;
  emptyFiltered: string;
  loadError: string;
  caseLabel: string;
  providedBy: string;
  publishedAt: string;
  viewDetails: string;
  hideDetails: string;
  downloadPdf: string;
  includedServices: string;
  includedServicesDescription: string;
  serviceReference: string;
  serviceCategory: string;
  serviceStatus: string;
  completedAt: string;
  createdAt: string;
  sourceFiles: string;
  sourceFilesDescription: string;
  noSourceFiles: string;
  noFilesForService: string;
  viewFile: string;
  uploadedAt: string;
  sickLeave: string;
  servicesCount: string;
  filters: Record<ReportFilter, string>;
};

const REPORT_FILTERS: ReportFilter[] = ["ALL", "DOCTOR", "LAB", "IMAGING"];
const IMAGING_MATCHER = /(xray|x-ray|radiology|scan|mri|ct|ultrasound|sonar|اشعة|أشعة|تصوير)/i;
const LAB_MATCHER = /(lab|laboratory|تحاليل|تحليل|مختبر|فحص|test)/i;

function getServiceFilter(service: PatientCaseService): Exclude<ReportFilter, "ALL"> {
  const serviceKind = String(service.service_kind || "").toUpperCase();
  const haystack = `${service.service_name || ""} ${service.service_category_name || ""}`;

  if (serviceKind === "LAB" || LAB_MATCHER.test(haystack)) {
    return "LAB";
  }

  if (serviceKind === "RADIOLOGY" || IMAGING_MATCHER.test(haystack)) {
    return "IMAGING";
  }

  return "DOCTOR";
}

function getServiceCategories(services: PatientCaseService[]) {
  const uniqueCategories = new Set<Exclude<ReportFilter, "ALL">>();
  services.forEach((service) => uniqueCategories.add(getServiceFilter(service)));
  return Array.from(uniqueCategories);
}

function buildServiceSummary(services: PatientCaseService[]) {
  if (!services.length) {
    return "Clinical report";
  }

  if (services.length === 1) {
    return services[0].service_name;
  }

  if (services.length === 2) {
    return `${services[0].service_name} + ${services[1].service_name}`;
  }

  return `${services[0].service_name} + ${services.length - 1} more`;
}

function buildProvidersLabel(services: PatientCaseService[]) {
  const providerNames = Array.from(
    new Set(services.map((service) => service.provider_name).filter((value): value is string => Boolean(value))),
  );

  if (!providerNames.length) {
    return "-";
  }

  if (providerNames.length <= 2) {
    return providerNames.join(" • ");
  }

  return `${providerNames.slice(0, 2).join(" • ")} +${providerNames.length - 2}`;
}

function buildSearchableText(caseDetail: PatientCase, services: PatientCaseService[]) {
  return [
    caseDetail.id,
    caseDetail.patient_name,
    caseDetail.lead_provider_name,
    caseDetail.notes,
    ...services.flatMap((service) => [
      service.service_name,
      service.service_category_name,
      service.provider_name,
      service.provider_type,
      service.notes,
      service.status,
      ...service.provider_files.flatMap((file) => [file.service_name, file.provider_name, getFileName(file.file_url)]),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getFileName(fileUrl?: string | null) {
  if (!fileUrl) return "";
  const normalizedUrl = fileUrl.split("?")[0] || "";
  return normalizedUrl.split("/").pop() || normalizedUrl;
}

function getServiceReference(serviceId: string) {
  return `#${serviceId.slice(0, 8)}`;
}

function sortFiles(files: PatientCaseProviderFile[]) {
  return [...files].sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

async function fetchAllCases() {
  const firstPageResponse = await casesApi.list({ page: 1, limit: 100 });
  const firstPage = firstPageResponse.data;
  const totalPages = firstPage.pagination.pages || firstPage.pagination.total_pages || 1;

  if (totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => casesApi.list({ page: index + 2, limit: 100 })),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((response) => response.data.data),
  ];
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
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function ReportsPage() {
  const locale = useLocale();
  const tPage = useTranslations("reportsPage");
  const copy: ReportsCopy = {
    title: tPage("title"),
    description: tPage("description"),
    searchPlaceholder: tPage("searchPlaceholder"),
    searchHint: tPage("searchHint"),
    empty: tPage("empty"),
    emptyFiltered: tPage("emptyFiltered"),
    loadError: tPage("loadError"),
    caseLabel: tPage("caseLabel"),
    providedBy: tPage("providedBy"),
    publishedAt: tPage("publishedAt"),
    viewDetails: tPage("viewDetails"),
    hideDetails: tPage("hideDetails"),
    downloadPdf: tPage("downloadPdf"),
    includedServices: tPage("includedServices"),
    includedServicesDescription: tPage("includedServicesDescription"),
    serviceReference: tPage("serviceReference"),
    serviceCategory: tPage("serviceCategory"),
    serviceStatus: tPage("serviceStatus"),
    completedAt: tPage("completedAt"),
    createdAt: tPage("createdAt"),
    sourceFiles: tPage("sourceFiles"),
    sourceFilesDescription: tPage("sourceFilesDescription"),
    noSourceFiles: tPage("noSourceFiles"),
    noFilesForService: tPage("noFilesForService"),
    viewFile: tPage("viewFile"),
    uploadedAt: tPage("uploadedAt"),
    sickLeave: tPage("sickLeave"),
    servicesCount: tPage("servicesCount"),
    filters: {
      ALL: tPage("filters.ALL"),
      DOCTOR: tPage("filters.DOCTOR"),
      LAB: tPage("filters.LAB"),
      IMAGING: tPage("filters.IMAGING"),
    },
  };

  const [activeFilter, setActiveFilter] = useState<ReportFilter>("ALL");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  const historyQuery = useQuery({
    queryKey: ["patient", "reports", "history", locale],
    queryFn: async (): Promise<ReportsArchiveItem[]> => {
      const cases = await fetchAllCases();
      const closedCases = cases.filter((caseItem) => caseItem.status === "CLOSED");

      const entries = await Promise.all(
        closedCases.map(async (caseItem) => {
          const [detailResult, reportResult] = await Promise.allSettled([
            casesApi.getById(caseItem.id),
            casesApi.getReport(caseItem.id),
          ]);

          if (detailResult.status !== "fulfilled" || reportResult.status !== "fulfilled") {
            return null;
          }

          const caseDetail = detailResult.value.data;
          const report = reportResult.value.data;

          if (!report || report.status !== "PUBLISHED") {
            return null;
          }

          const services = caseDetail.services || [];
          const categories = getServiceCategories(services);

          return {
            id: caseDetail.id,
            caseId: caseDetail.id,
            caseDetail,
            report,
            services,
            categories,
            occurredAt: report.published_at || caseDetail.closed_at || caseDetail.updated_at || caseDetail.created_at,
            serviceSummary: buildServiceSummary(services),
            searchableText: buildSearchableText(caseDetail, services),
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
    { key: "ALL" as const, icon: CalendarDays, label: copy.filters.ALL, count: filterCounts.ALL },
    { key: "DOCTOR" as const, icon: Stethoscope, label: copy.filters.DOCTOR, count: filterCounts.DOCTOR },
    { key: "LAB" as const, icon: FlaskConical, label: copy.filters.LAB, count: filterCounts.LAB },
    { key: "IMAGING" as const, icon: ScanLine, label: copy.filters.IMAGING, count: filterCounts.IMAGING },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-slate-900">{copy.title}</CardTitle>
              <CardDescription className="max-w-3xl text-sm text-slate-600">{copy.description}</CardDescription>
            </div>
            <p className="max-w-xl text-sm text-slate-500">{copy.searchHint}</p>
          </div>

          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 rounded-2xl border-slate-200 bg-white/90 px-10 text-sm shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <FilterButton
                key={filter.key}
                active={activeFilter === filter.key}
                count={filter.count}
                icon={filter.icon}
                label={filter.label}
                onClick={() => setActiveFilter(filter.key)}
              />
            ))}
          </div>
        </CardHeader>
      </Card>

      {historyQuery.isLoading ? (
        <AppPreloader variant="page" title={copy.title} description={copy.description} blockCount={4} />
      ) : historyQuery.isError ? (
        <Card className="rounded-[24px] border-red-200 bg-red-50">
          <CardContent className="p-6 text-sm text-red-700">{copy.loadError}</CardContent>
        </Card>
      ) : filteredItems.length ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedCaseId === item.caseId;
            const categoryBadges =
              activeFilter === "ALL" ? item.categories : item.categories.filter((category) => category === activeFilter);
            const hasAnyFiles = item.services.some((service) => service.provider_files.length > 0);

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
                              {copy.filters[category]}
                            </Badge>
                          ))}
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] tracking-wide text-emerald-700"
                          >
                            {copy.servicesCount.replace("{count}", String(item.services.length))}
                          </Badge>
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">{item.serviceSummary}</h2>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span>
                              {copy.caseLabel} #{item.caseId.slice(0, 8)}
                            </span>
                            <span>
                              {copy.providedBy}: {item.providersLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-500 md:text-end">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">
                            {formatDateTime(item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}
                          </p>
                          <p>
                            {copy.publishedAt}: {formatDateTime(item.report.published_at || item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-200/80 bg-slate-50/70 p-5">
                      <div className="mb-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const response = await casesApi.downloadReportPdf(item.caseId);
                            triggerBlobDownload(response.data, `case-report-${item.caseId.slice(0, 8)}.pdf`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          {copy.downloadPdf}
                        </Button>
                        <Button variant="ghost" onClick={() => setExpandedCaseId(null)}>
                          {copy.hideDetails}
                        </Button>
                      </div>

                      <div className="space-y-5">
                        <section className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-slate-900">
                            <Stethoscope className="h-4 w-4 text-sky-600" />
                            <h3 className="font-semibold">{copy.includedServices}</h3>
                          </div>
                          <p className="text-sm text-slate-500">{copy.includedServicesDescription}</p>

                          <div className="grid gap-3 lg:grid-cols-2">
                            {item.services.map((service) => (
                              <div key={service.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-slate-900">{service.service_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {copy.serviceReference}: {getServiceReference(service.id)}
                                    </p>
                                  </div>
                                  <StatusBadge value={service.status} />
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.serviceCategory}</p>
                                    <p className="mt-1 text-sm text-slate-700">{copy.filters[getServiceFilter(service)]}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.providedBy}</p>
                                    <p className="mt-1 text-sm text-slate-700">{service.provider_name || "-"}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.createdAt}</p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {formatDateTime(service.created_at, "dd/MM/yyyy, HH:mm", locale)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.completedAt}</p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {service.completed_at
                                        ? formatDateTime(service.completed_at, "dd/MM/yyyy, HH:mm", locale)
                                        : "-"}
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
                            <h3 className="font-semibold">{copy.sourceFiles}</h3>
                          </div>
                          <p className="text-sm text-slate-500">{copy.sourceFilesDescription}</p>

                          {hasAnyFiles ? (
                            <div className="space-y-4">
                              {item.services.map((service) => {
                                const files = sortFiles(service.provider_files);

                                return (
                                  <div key={`${service.id}-files`} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-slate-900">{service.service_name}</p>
                                        <p className="text-xs text-slate-500">
                                          {copy.serviceReference}: {getServiceReference(service.id)}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="rounded-full border-slate-300 bg-white px-3 py-1 text-[11px] tracking-wide text-slate-600"
                                      >
                                        {copy.filters[getServiceFilter(service)]}
                                      </Badge>
                                    </div>

                                    {files.length ? (
                                      <div className="space-y-3">
                                        {files.map((file) => {
                                          const fileUrl = casesApi.resolveMediaUrl(file.file_url);

                                          return (
                                            <div
                                              key={file.id}
                                              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/85 p-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                              <div className="space-y-1">
                                                <div className="flex flex-wrap gap-2">
                                                  <Badge
                                                    variant="outline"
                                                    className="rounded-full border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-slate-600"
                                                  >
                                                    {file.file_type}
                                                  </Badge>
                                                  {file.is_sick_leave ? (
                                                    <Badge
                                                      variant="outline"
                                                      className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] tracking-wide text-amber-700"
                                                    >
                                                      {copy.sickLeave}
                                                    </Badge>
                                                  ) : null}
                                                </div>
                                                <p className="text-sm font-medium text-slate-900">{getFileName(file.file_url)}</p>
                                                <p className="text-xs text-slate-500">
                                                  {copy.uploadedAt}: {formatDateTime(file.created_at, "dd/MM/yyyy, HH:mm", locale)}
                                                </p>
                                              </div>

                                              {fileUrl ? (
                                                <a
                                                  href={fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                                >
                                                  {copy.viewFile}
                                                </a>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-500">{copy.noFilesForService}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">{copy.noSourceFiles}</p>
                          )}
                        </section>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end border-t border-slate-200/70 px-5 py-3 text-sm text-slate-500">
                      <span>
                        {REPORT_FILTERS.filter((filter) => filter !== "ALL" && item.categories.includes(filter))
                          .map((filter) => copy.filters[filter])
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
            {historyQuery.data?.length ? copy.emptyFiltered : copy.empty}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
