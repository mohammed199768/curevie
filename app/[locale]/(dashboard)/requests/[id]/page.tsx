"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageCircleMore,
  Phone,
  Receipt,
  RotateCcw,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CancelCaseDialog } from "@/components/orders/CancelCaseDialog";
import { CaseProgress } from "@/components/orders/CaseProgress";
import { CaseStatusBadge, PaymentStatusBadge, ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";
import { ProviderAvatar } from "@/components/orders/ProviderAvatar";
import { RateServiceDialog } from "@/components/orders/RateServiceDialog";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  casesApi,
  isInvoiceReleased,
  type CaseAppointment,
  type CaseProviderFile,
  type CaseView,
} from "@/lib/api/cases";
import { downloadProtectedFile, readBlobErrorCode } from "@/lib/download";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { getOrderItemTypeLabel } from "@/lib/order-items";
import { formatDateTime } from "@/lib/utils";

// The socket invalidates this case on every change; the interval is only a fallback.
const FALLBACK_REFETCH_INTERVAL_MS = 60_000;

function useDownload() {
  const t = useTranslations("orderDetail");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = async (key: string, request: Parameters<typeof downloadProtectedFile>[0], fileName: string) => {
    setPendingKey(key);
    try {
      await downloadProtectedFile(request, fileName);
    } catch (error) {
      const code = await readBlobErrorCode(error);
      toast.error(code === "REPORT_NOT_AVAILABLE" || code === "NOT_AVAILABLE" ? t("downloads.notAvailable") : t("downloads.failed"));
    } finally {
      setPendingKey(null);
    }
  };

  return { pendingKey, run };
}

function DownloadButton({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="min-h-11 rounded-full" disabled={busy} onClick={onClick}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = String(id || "");
  const locale = useLocale();
  const t = useTranslations("orderDetail");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const download = useDownload();

  const caseQuery = useQuery({
    queryKey: ["cases", "detail", caseId],
    queryFn: () => casesApi.getById(caseId),
    enabled: Boolean(caseId),
    refetchInterval: FALLBACK_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => !(isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });

  const view = caseQuery.data;
  const isClosed = view?.case.status === "CLOSED";
  const invoiceReleased = isInvoiceReleased(view?.invoice ?? null);

  const invoiceQuery = useQuery({
    queryKey: ["cases", "invoice", caseId],
    queryFn: () => casesApi.getInvoice(caseId),
    enabled: Boolean(caseId) && invoiceReleased,
  });

  const reportQuery = useQuery({
    queryKey: ["cases", "report", caseId],
    queryFn: async () => {
      try {
        return await casesApi.getReport(caseId);
      } catch (error) {
        if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(caseId) && isClosed,
  });

  if (caseQuery.isLoading) {
    return <AppPreloader variant="page" title={tCommon("loading")} blockCount={4} />;
  }

  if (!view) {
    const notFound = isAxiosError(caseQuery.error) && caseQuery.error.response?.status === 404;
    return (
      <Card className="rounded-[1.5rem]">
        <CardHeader>
          <CardTitle>{notFound ? t("notFound") : tCommon("error")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!notFound ? <Button variant="outline" onClick={() => void caseQuery.refetch()}>{tCommon("retry")}</Button> : null}
          <Button asChild>
            <Link href={`/${locale}/requests`}>{t("backToOrders")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const record = view.case;
  const reference = `#${record.id.slice(0, 8).toUpperCase()}`;
  const areaName = locale.startsWith("ar") ? record.area_name_ar || record.area_name_en : record.area_name_en || record.area_name_ar;
  const appointmentsByService = groupAppointments(view.appointments);
  const filesByService = groupFiles(view.provider_files);
  const activeServices = view.services.filter((service) => service.status !== "CANCELLED");
  const firstChatRoom = view.services.find((service) => service.chat_room_id)?.chat_room_id;
  const invoiceDetail = invoiceQuery.data;
  const report = reportQuery.data;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Link href={`/${locale}/requests`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("backToOrders")}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{tOrders("reference", { reference })}</h1>
                <CaseStatusBadge status={record.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("createdAt", { date: formatDateTime(record.created_at, "dd/MM/yyyy, HH:mm", locale) })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {firstChatRoom ? (
                <Button asChild variant="outline" className="min-h-11 rounded-full">
                  <Link href={`/${locale}/chat?room=${firstChatRoom}`}>
                    <MessageCircleMore className="h-4 w-4" />
                    {t("openChat")}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="min-h-11 rounded-full">
                <Link href={`/${locale}/requests/new?reorder=${record.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  {t("orderAgain")}
                </Link>
              </Button>
              {view.case_actions.can_cancel ? <CancelCaseDialog caseId={record.id} /> : null}
            </div>
          </div>

          <CaseProgress
            status={record.status}
            serviceStatuses={view.services.map((service) => service.status)}
            cancelReason={record.cancel_reason}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile icon={MapPin} label={tOrders("area.label")} value={areaName || "-"} />
            <InfoTile icon={MapPin} label={t("address")} value={record.address || "-"} />
            <InfoTile
              icon={CalendarClock}
              label={t("preferredTime")}
              value={record.scheduled_for ? formatDateTime(record.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : t("noPreferredTime")}
            />
            <InfoTile
              icon={Receipt}
              label={t("total")}
              value={view.invoice ? formatCurrency(view.invoice.final_amount, locale) : "-"}
            />
          </div>

          {record.notes ? (
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t("notes")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{record.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("itemsTitle")}</CardTitle>
          <CardDescription>{t("itemsDescription", { count: activeServices.length })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {view.services.map((service) => {
            const appointments = appointmentsByService.get(service.id) || [];
            const ratingAverage = service.provider_rating_avg !== null ? Number(service.provider_rating_avg) : null;
            const discounted = Number(service.original_price) > Number(service.bundle_price);

            return (
              <div key={service.id} className="space-y-3 rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{service.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getOrderItemTypeLabel({ type: service.item_type, serviceKind: service.service_kind }, tOrders)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end text-sm">
                      {discounted ? (
                        <p className="text-xs text-muted-foreground line-through">{formatCurrency(service.original_price, locale)}</p>
                      ) : null}
                      <p className="font-semibold">{formatCurrency(service.bundle_price, locale)}</p>
                    </div>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                </div>

                {service.provider_id ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <ProviderAvatar name={service.provider_name} url={service.provider_avatar_url} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{service.provider_name}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {service.provider_type ? <span>{translateEnumValue(service.provider_type, tEnums)}</span> : null}
                          {ratingAverage !== null && service.provider_rating_count > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {ratingAverage.toFixed(1)} ({service.provider_rating_count})
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {service.provider_phone ? (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={`tel:${service.provider_phone}`} dir="ltr">
                            <Phone className="h-4 w-4" />
                            {service.provider_phone}
                          </a>
                        </Button>
                      ) : null}
                      {service.chat_room_id ? (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <Link href={`/${locale}/chat?room=${service.chat_room_id}`}>
                            <MessageCircleMore className="h-4 w-4" />
                            {t("chat")}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : service.status !== "CANCELLED" ? (
                  <p className="text-xs text-muted-foreground">{t("awaitingProvider")}</p>
                ) : null}

                {appointments.length ? (
                  <ul className="space-y-1 text-sm">
                    {appointments.map((appointment) => (
                      <li key={appointment.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        <span>{tOrders(`appointmentTypes.${appointment.type}`)}:</span>
                        <span className="font-medium text-foreground">
                          {formatDateTime(appointment.scheduled_at, "dd/MM/yyyy, HH:mm", locale)}
                        </span>
                        {appointment.notes ? <span>· {appointment.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {service.my_rating ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {t("rating.yourRating", { rating: service.my_rating })}
                    {service.my_rating_comment ? ` · ${service.my_rating_comment}` : ""}
                  </p>
                ) : service.actions.can_rate ? (
                  <RateServiceDialog
                    caseId={record.id}
                    serviceId={service.id}
                    serviceName={service.item_name}
                    providerName={service.provider_name}
                  />
                ) : null}

                {(filesByService.get(service.id) || []).length ? (
                  <FileList
                    files={filesByService.get(service.id) || []}
                    pendingKey={download.pendingKey}
                    onDownload={(file) =>
                      void download.run(`file-${file.id}`, () => casesApi.downloadProviderFile(file), file.original_name || `file-${file.id.slice(0, 8)}`)
                    }
                    locale={locale}
                  />
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvoiceCard
          view={view}
          invoiceDetail={invoiceDetail}
          invoiceLoading={invoiceQuery.isLoading && invoiceReleased}
          locale={locale}
          pendingKey={download.pendingKey}
          onDownload={() => void download.run("invoice", () => casesApi.downloadInvoicePdf(record.id), `invoice-${record.id.slice(0, 8)}.pdf`)}
        />

        <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("report.title")}
            </CardTitle>
            <CardDescription>{isClosed ? t("report.description") : t("report.availableAfterClose")}</CardDescription>
          </CardHeader>
          {isClosed ? (
            <CardContent className="flex flex-wrap gap-2">
              {reportQuery.isLoading ? (
                <AppPreloader variant="inline" title={tCommon("loading")} className="w-full justify-start" />
              ) : report && report.status === "PUBLISHED" && (report.has_pdf || report.has_sick_leave) ? (
                <>
                  {report.has_pdf ? (
                    <DownloadButton
                      label={t("report.download")}
                      busy={download.pendingKey === "report"}
                      onClick={() => void download.run("report", () => casesApi.downloadReportPdf(record.id), `case-report-${record.id.slice(0, 8)}.pdf`)}
                    />
                  ) : null}
                  {report.has_sick_leave ? (
                    <DownloadButton
                      label={t("report.sickLeave")}
                      busy={download.pendingKey === "sick-leave"}
                      onClick={() => void download.run("sick-leave", () => casesApi.downloadSickLeavePdf(record.id), `sick-leave-${record.id.slice(0, 8)}.pdf`)}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("report.notReady")}</p>
              )}
            </CardContent>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function FileList({
  files,
  pendingKey,
  onDownload,
  locale,
}: {
  files: CaseProviderFile[];
  pendingKey: string | null;
  onDownload: (file: CaseProviderFile) => void;
  locale: string;
}) {
  const t = useTranslations("orderDetail");

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("files.title")}</p>
      {files.map((file) => (
        <div key={file.id} className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.original_name || t(`files.types.${file.file_type}`)}</p>
            <p className="text-xs text-muted-foreground">
              {file.is_sick_leave ? `${t("files.sickLeave")} · ` : ""}
              {file.provider_name ? `${file.provider_name} · ` : ""}
              {formatDateTime(file.created_at, "dd/MM/yyyy, HH:mm", locale)}
            </p>
          </div>
          <DownloadButton label={t("files.download")} busy={pendingKey === `file-${file.id}`} onClick={() => onDownload(file)} />
        </div>
      ))}
    </div>
  );
}

function InvoiceCard({
  view,
  invoiceDetail,
  invoiceLoading,
  locale,
  pendingKey,
  onDownload,
}: {
  view: CaseView;
  invoiceDetail: Awaited<ReturnType<typeof casesApi.getInvoice>> | undefined;
  invoiceLoading: boolean;
  locale: string;
  pendingKey: string | null;
  onDownload: () => void;
}) {
  const t = useTranslations("orderDetail");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const invoice = view.invoice;

  return (
    <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          {t("invoice.title")}
        </CardTitle>
        <CardDescription>{isInvoiceReleased(invoice) ? t("invoice.released") : t("invoice.estimate")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!invoice ? (
          <p className="text-muted-foreground">{t("invoice.none")}</p>
        ) : (
          <>
            <Row label={t("invoice.original")} value={formatCurrency(invoice.original_amount, locale)} />
            <Row label={t("invoice.final")} value={formatCurrency(invoice.final_amount, locale)} strong />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("invoice.paymentStatus")}</span>
              <PaymentStatusBadge status={invoice.payment_status} />
            </div>

            {isInvoiceReleased(invoice) ? (
              <>
                <Row label={t("invoice.paid")} value={formatCurrency(invoiceDetail?.invoice.total_paid ?? invoice.total_paid, locale)} />
                <Row label={t("invoice.remaining")} value={formatCurrency(invoiceDetail?.invoice.remaining_amount ?? invoice.remaining_amount, locale)} />

                {invoiceLoading ? (
                  <AppPreloader variant="inline" title={tCommon("loading")} className="w-full justify-start" />
                ) : invoiceDetail ? (
                  <>
                    {invoiceDetail.adjustments.length ? (
                      <div className="space-y-1 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground">{t("invoice.adjustments")}</p>
                        {invoiceDetail.adjustments.map((adjustment) => (
                          <Row
                            key={adjustment.id}
                            label={`${t(`invoice.adjustmentTypes.${adjustment.type}`)}${adjustment.reason ? ` · ${adjustment.reason}` : ""}`}
                            value={`${adjustment.type === "DISCOUNT" ? "−" : "+"}${formatCurrency(adjustment.amount, locale)}`}
                          />
                        ))}
                      </div>
                    ) : null}
                    {invoiceDetail.payments.length ? (
                      <div className="space-y-1 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground">{t("invoice.payments")}</p>
                        {invoiceDetail.payments.map((payment) => (
                          <Row
                            key={payment.id}
                            label={`${tOrders(`paymentMethods.${payment.method}`)} · ${formatDateTime(payment.created_at, "dd/MM/yyyy", locale)}`}
                            value={formatCurrency(payment.amount, locale)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <DownloadButton label={t("invoice.downloadPdf")} busy={pendingKey === "invoice"} onClick={onDownload} />
                </div>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{value}</span>
    </div>
  );
}

function groupAppointments(appointments: CaseAppointment[]) {
  const map = new Map<string, CaseAppointment[]>();
  [...appointments]
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
    .forEach((appointment) => {
      map.set(appointment.case_service_id, [...(map.get(appointment.case_service_id) || []), appointment]);
    });
  return map;
}

function groupFiles(files: CaseProviderFile[]) {
  const map = new Map<string, CaseProviderFile[]>();
  files.forEach((file) => {
    map.set(file.case_service_id, [...(map.get(file.case_service_id) || []), file]);
  });
  return map;
}
