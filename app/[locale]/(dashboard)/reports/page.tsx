"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  FlaskConical,
  ScanLine,
  Stethoscope,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { requestsApi } from "@/lib/api/requests";
import type { LabResult, RequestDetails, RequestItem, RequestProviderReport } from "@/lib/api/types";
import { translateEnumValue } from "@/lib/i18n";
import { resolveMediaUrl } from "@/lib/utils/media-url";
import { cn, formatDateTime, normalizeListResponse, triggerBlobDownload } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReportFilter = "ALL" | "DOCTOR" | "LAB" | "IMAGING";

type RequestDetailsWithMeta = RequestDetails & {
  service_name?: string | null;
  package_tests?: Array<{ lab_test_id: string; name?: string | null }>;
};

type ReportsCopy = {
  title: string;
  description: string;
  searchPlaceholder: string;
  searchHint: string;
  empty: string;
  emptyFiltered: string;
  loadError: string;
  requestLabel: string;
  providedBy: string;
  updatedAt: string;
  viewDetails: string;
  hideDetails: string;
  downloadPdf: string;
  doctorSection: string;
  labSection: string;
  imagingSection: string;
  noDoctorData: string;
  noLabData: string;
  noImagingData: string;
  findings: string;
  diagnosis: string;
  treatmentPlan: string;
  recommendations: string;
  procedures: string;
  allergies: string;
  summary: string;
  notes: string;
  labResult: string;
  labUnit: string;
  referenceRange: string;
  testNotes: string;
  imagePreview: string;
  openImage: string;
  filters: Record<ReportFilter, string>;
};

type ReportsHistoryItem = {
  id: string;
  requestId: string;
  request: RequestDetailsWithMeta;
  providerReports: RequestProviderReport[];
  doctorReports: RequestProviderReport[];
  imagingReports: RequestProviderReport[];
  labResults: LabResult[];
  categories: ReportFilter[];
  serviceName: string;
  occurredAt: string;
  searchableText: string;
};

const REPORT_FILTERS: ReportFilter[] = ["ALL", "DOCTOR", "LAB", "IMAGING"];

function mapServiceType(serviceType: string | null | undefined, tEnums: (key: string) => string) {
  return translateEnumValue(serviceType, tEnums);
}

function resolveOccurredAt(request: RequestDetailsWithMeta) {
  return request.closed_at || request.completed_at || request.updated_at || request.created_at;
}

function isImagingReport(report: RequestProviderReport) {
  const reportText = `${report.service_type || ""} ${report.provider_type || ""}`.toUpperCase();
  return ["RADIOLOGY", "RADIOLOGY_TECH"].some((value) => reportText.includes(value));
}

function isLabReport(report: RequestProviderReport) {
  const reportText = `${report.service_type || ""} ${report.provider_type || ""}`.toUpperCase();
  return reportText.includes("LAB");
}

function isDoctorReport(report: RequestProviderReport) {
  if (isImagingReport(report) || isLabReport(report)) {
    return false;
  }

  return [
    report.symptoms_summary,
    report.findings,
    report.diagnosis,
    report.treatment_plan,
    report.recommendations,
    report.procedures_done,
    report.procedures_performed,
  ].some(Boolean);
}

function normalizeReports(reports: RequestProviderReport[]) {
  return [...reports].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  });
}

function resolveServiceName(
  request: RequestDetailsWithMeta,
  providerReports: RequestProviderReport[],
  tEnums: (key: string) => string,
) {
  if (request.service_name) {
    return request.service_name;
  }

  if (request.lab_results?.length === 1 && request.lab_results[0]?.test_name) {
    return request.lab_results[0].test_name;
  }

  const detailedService = providerReports.find((report) => report.service_type)?.service_type;
  return mapServiceType(detailedService || request.service_type, tEnums);
}

function buildSearchableText(
  request: RequestDetailsWithMeta,
  providerReports: RequestProviderReport[],
  labResults: LabResult[],
  serviceName: string,
) {
  return [
    request.id,
    request.provider_name,
    request.service_name,
    serviceName,
    request.service_type,
    ...(request.package_tests || []).flatMap((test) => [test.name]),
    ...(request.package_services || []).flatMap((service) => [service.name, service.category_name, service.service_kind]),
    ...providerReports.flatMap((report) => [
      report.provider_name,
      report.provider_type,
      report.findings,
      report.diagnosis,
      report.recommendations,
      report.imaging_notes,
      report.lab_notes,
      report.notes,
    ]),
    ...labResults.flatMap((result) => [result.test_name, result.result, result.notes, result.reference_range, result.flag]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isImageUrl(url?: string | null) {
  if (!url) return false;
  return !url.toLowerCase().includes(".pdf");
}

function ReportField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white/80 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
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

async function fetchAllClosedRequests() {
  const firstPage = normalizeListResponse<RequestItem>(
    (await requestsApi.list({ page: 1, limit: 100, status: "CLOSED" })).data,
  );
  const totalPages = firstPage.pagination.pages || firstPage.pagination.total_pages || 1;

  if (totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      requestsApi.list({ page: index + 2, limit: 100, status: "CLOSED" }),
    ),
  );

  return [
    ...firstPage.data,
    ...remainingPages.flatMap((response) => normalizeListResponse<RequestItem>(response.data).data),
  ];
}

export default function ReportsPage() {
  const locale = useLocale();
  const tPage = useTranslations("reportsPage");
  const tEnums = useTranslations("enums");
  const copy: ReportsCopy = {
    title: tPage("title"),
    description: tPage("description"),
    searchPlaceholder: tPage("searchPlaceholder"),
    searchHint: tPage("searchHint"),
    empty: tPage("empty"),
    emptyFiltered: tPage("emptyFiltered"),
    loadError: tPage("loadError"),
    requestLabel: tPage("requestLabel"),
    providedBy: tPage("providedBy"),
    updatedAt: tPage("updatedAt"),
    viewDetails: tPage("viewDetails"),
    hideDetails: tPage("hideDetails"),
    downloadPdf: tPage("downloadPdf"),
    doctorSection: tPage("doctorSection"),
    labSection: tPage("labSection"),
    imagingSection: tPage("imagingSection"),
    noDoctorData: tPage("noDoctorData"),
    noLabData: tPage("noLabData"),
    noImagingData: tPage("noImagingData"),
    findings: tPage("findings"),
    diagnosis: tPage("diagnosis"),
    treatmentPlan: tPage("treatmentPlan"),
    recommendations: tPage("recommendations"),
    procedures: tPage("procedures"),
    allergies: tPage("allergies"),
    summary: tPage("summary"),
    notes: tPage("notes"),
    labResult: tPage("labResult"),
    labUnit: tPage("labUnit"),
    referenceRange: tPage("referenceRange"),
    testNotes: tPage("testNotes"),
    imagePreview: tPage("imagePreview"),
    openImage: tPage("openImage"),
    filters: {
      ALL: tPage("filters.ALL"),
      DOCTOR: tPage("filters.DOCTOR"),
      LAB: tPage("filters.LAB"),
      IMAGING: tPage("filters.IMAGING"),
    },
  };
  const [activeFilter, setActiveFilter] = useState<ReportFilter>("ALL");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["reports", "history", locale],
    queryFn: async (): Promise<ReportsHistoryItem[]> => {
      const requests = await fetchAllClosedRequests();

      const entries = await Promise.all(
        requests.map(async (request) => {
          const [requestResult, providerReportsResult] = await Promise.allSettled([
            requestsApi.getById(request.id),
            requestsApi.listProviderReports(request.id),
          ]);

          if (requestResult.status !== "fulfilled") {
            return null;
          }

          const detailedRequest = requestResult.value.data as RequestDetailsWithMeta;
          const providerReports =
            providerReportsResult.status === "fulfilled" ? normalizeReports(providerReportsResult.value.data.data || []) : [];
          const doctorReports = providerReports.filter(isDoctorReport);
          const imagingReports = providerReports.filter(isImagingReport);
          const labResults = [...(detailedRequest.lab_results || [])].sort((a, b) => {
            const aTime = new Date(a.created_at).getTime();
            const bTime = new Date(b.created_at).getTime();
            return bTime - aTime;
          });

          const categories: ReportFilter[] = [];
          if (doctorReports.length || detailedRequest.service_type === "MEDICAL") {
            categories.push("DOCTOR");
          }
          if (labResults.length || detailedRequest.service_type === "LAB" || detailedRequest.service_type === "PACKAGE") {
            categories.push("LAB");
          }
          if (imagingReports.length || String(detailedRequest.service_type || "").toUpperCase() === "RADIOLOGY") {
            categories.push("IMAGING");
          }

          if (!categories.length) {
            return null;
          }

          const serviceName = resolveServiceName(detailedRequest, providerReports, tEnums);

          return {
            id: detailedRequest.id,
            requestId: detailedRequest.id,
            request: detailedRequest,
            providerReports,
            doctorReports,
            imagingReports,
            labResults,
            categories,
            serviceName,
            occurredAt: resolveOccurredAt(detailedRequest),
            searchableText: buildSearchableText(detailedRequest, providerReports, labResults, serviceName),
          } satisfies ReportsHistoryItem;
        }),
      );

      return entries
        .filter((entry): entry is ReportsHistoryItem => Boolean(entry))
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    },
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
      return activeFilter === "ALL" || item.categories.includes(activeFilter);
    });
  }, [activeFilter, historyQuery.data]);

  const filterOptions = [
    { key: "ALL" as const, icon: CalendarDays, label: copy.filters.ALL, count: filterCounts.ALL },
    { key: "DOCTOR" as const, icon: Stethoscope, label: copy.filters.DOCTOR, count: filterCounts.DOCTOR },
    { key: "LAB" as const, icon: FlaskConical, label: copy.filters.LAB, count: filterCounts.LAB },
    { key: "IMAGING" as const, icon: ScanLine, label: copy.filters.IMAGING, count: filterCounts.IMAGING },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-slate-900">{copy.title}</CardTitle>
              <CardDescription className="max-w-2xl text-sm text-slate-600">{copy.description}</CardDescription>
            </div>
            <p className="text-sm text-slate-500">{copy.searchHint}</p>
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
            const isExpanded = expandedRequestId === item.requestId;
            const categoryBadges =
              activeFilter === "ALL" ? item.categories : item.categories.filter((category) => category === activeFilter);

            return (
              <Card key={item.requestId} className="rounded-[26px] border-slate-200/80 shadow-sm">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setExpandedRequestId(isExpanded ? null : item.requestId)}
                    className="w-full text-start"
                  >
                    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {categoryBadges.map((category) => (
                            <Badge
                              key={`${item.requestId}-${category}`}
                              variant="outline"
                              className="rounded-full border-slate-300 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-600"
                            >
                              {copy.filters[category]}
                            </Badge>
                          ))}
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">{item.serviceName}</h2>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span>
                              {copy.requestLabel} #{item.requestId.slice(0, 8)}
                            </span>
                            <span>
                              {copy.providedBy}: {item.request.provider_name || item.doctorReports[0]?.provider_name || "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-500 md:text-end">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">{formatDateTime(item.occurredAt, "dd/MM/yyyy, HH:mm", locale)}</p>
                          <p>
                            {copy.updatedAt}: {formatDateTime(item.request.updated_at, "dd/MM/yyyy, HH:mm", locale)}
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
                            const response = await requestsApi.downloadMedicalPdf(item.requestId);
                            triggerBlobDownload(response.data, `medical-report-${item.requestId.slice(0, 8)}.pdf`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          {copy.downloadPdf}
                        </Button>
                        <Button variant="ghost" onClick={() => setExpandedRequestId(null)}>
                          {copy.hideDetails}
                        </Button>
                      </div>

                      <div className="space-y-5">
                        {(activeFilter === "ALL" || activeFilter === "DOCTOR") && (
                          <section className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-slate-900">
                              <Stethoscope className="h-4 w-4 text-sky-600" />
                              <h3 className="font-semibold">{copy.doctorSection}</h3>
                            </div>

                            {item.doctorReports.length ? (
                              <div className="space-y-4">
                                {item.doctorReports.map((report) => (
                                  <div key={report.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-slate-900">{report.provider_name || item.request.provider_name || "-"}</p>
                                        <p className="text-xs text-slate-500">{formatDateTime(report.updated_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                                      </div>
                                      <StatusBadge value={report.report_type} />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <ReportField label={copy.summary} value={report.symptoms_summary} />
                                      <ReportField label={copy.findings} value={report.findings} />
                                      <ReportField label={copy.diagnosis} value={report.diagnosis} />
                                      <ReportField label={copy.treatmentPlan} value={report.treatment_plan} />
                                      <ReportField label={copy.recommendations} value={report.recommendations} />
                                      <ReportField label={copy.procedures} value={report.procedures_done || report.procedures_performed} />
                                      <ReportField label={copy.allergies} value={report.patient_allergies || report.allergies_noted} />
                                      <ReportField label={copy.notes} value={report.notes || report.nurse_notes} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">{copy.noDoctorData}</p>
                            )}
                          </section>
                        )}

                        {(activeFilter === "ALL" || activeFilter === "IMAGING") && (
                          <section className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-slate-900">
                              <ScanLine className="h-4 w-4 text-amber-600" />
                              <h3 className="font-semibold">{copy.imagingSection}</h3>
                            </div>

                            {item.imagingReports.length ? (
                              <div className="space-y-4">
                                {item.imagingReports.map((report) => (
                                  <div key={report.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-slate-900">{report.provider_name || item.request.provider_name || "-"}</p>
                                        <p className="text-xs text-slate-500">{formatDateTime(report.updated_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                                      </div>
                                      <StatusBadge value={item.request.service_type} />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <ReportField label={copy.findings} value={report.findings} />
                                      <ReportField label={copy.diagnosis} value={report.diagnosis} />
                                      <ReportField label={copy.recommendations} value={report.recommendations} />
                                      <ReportField label={copy.notes} value={report.imaging_notes || report.notes} />
                                    </div>

                                    {(() => {
                                      const previewImageUrl = resolveMediaUrl(report.image_url);

                                      if (!previewImageUrl || !isImageUrl(report.image_url)) {
                                        return null;
                                      }

                                      return (
                                        <div className="mt-4 space-y-2">
                                          <p className="text-sm font-medium text-slate-700">{copy.imagePreview}</p>
                                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={previewImageUrl}
                                              alt={copy.imagePreview}
                                              className="max-h-[420px] w-full object-contain"
                                            />
                                          </div>
                                          <a
                                            href={previewImageUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800"
                                          >
                                            {copy.openImage}
                                          </a>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">{copy.noImagingData}</p>
                            )}
                          </section>
                        )}
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

