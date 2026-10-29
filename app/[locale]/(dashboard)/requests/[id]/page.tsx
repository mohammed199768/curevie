"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  CalendarClock,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageCircleMore,
  NotebookPen,
  Phone,
  Receipt,
  RotateCcw,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AmountRow, AppCard, DetailRow, DetailSkeleton, EmptyState, appButton } from "@/components/app/ui";
import { CancelCaseDialog } from "@/components/orders/CancelCaseDialog";
import { CaseProgress, OrderStatusHero } from "@/components/orders/CaseProgress";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";
import { CliqPaymentCard } from "@/components/orders/CliqPaymentCard";
import { ProviderAvatar } from "@/components/orders/ProviderAvatar";
import { RateServiceDialog } from "@/components/orders/RateServiceDialog";
import {
  casesApi,
  isInvoiceReleased,
  type CaseAppointment,
  type CaseProviderFile,
  type CaseServiceLine,
  type CaseView,
} from "@/lib/api/cases";
import { downloadProtectedFile, readBlobErrorCode } from "@/lib/download";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { getOrderItemTypeLabel } from "@/lib/order-items";
import { getCaseReference } from "@/lib/order-stage";
import { cn, formatDateTime } from "@/lib/utils";

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
  className,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={cn(appButton.secondary, "min-h-12", className)} disabled={busy} onClick={onClick}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      {label}
    </button>
  );
}

function CardTitle({ icon: Icon, children, aside }: { icon?: typeof Receipt; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[17px] font-bold text-foreground">
        {Icon ? <Icon className="h-5 w-5 text-[#5a7a50]" /> : null}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = String(id || "");
  const locale = useLocale();
  const t = useTranslations("orderDetail");
  const tApp = useTranslations("app.detail");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
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
    return (
      <div className="mx-auto max-w-3xl">
        <DetailSkeleton />
      </div>
    );
  }

  if (!view) {
    const notFound = isAxiosError(caseQuery.error) && caseQuery.error.response?.status === 404;
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          illustration="empty-orders"
          title={notFound ? t("notFound") : tCommon("error")}
          action={
            <>
              {!notFound ? (
                <button type="button" className={appButton.secondary} onClick={() => void caseQuery.refetch()}>
                  {tCommon("retry")}
                </button>
              ) : null}
              <Link href={`/${locale}/requests`} className={appButton.primary}>
                {t("backToOrders")}
              </Link>
            </>
          }
        />
      </div>
    );
  }

  const record = view.case;
  const reference = getCaseReference(record.id);
  const areaName = locale.startsWith("ar") ? record.area_name_ar || record.area_name_en : record.area_name_en || record.area_name_ar;
  const appointmentsByService = groupAppointments(view.appointments);
  const filesByService = groupFiles(view.provider_files);
  const activeServices = view.services.filter((service) => service.status !== "CANCELLED");
  const hasLab = activeServices.some((service) => service.service_kind === "LAB");
  const invoiceDetail = invoiceQuery.data;
  const report = reportQuery.data;
  const providers = groupProviders(view.services);
  const cliqInvoice = view.invoice
    ? {
        final_amount: view.invoice.final_amount,
        payment_status: invoiceDetail?.invoice.payment_status ?? view.invoice.payment_status,
        remaining_amount: isInvoiceReleased(view.invoice)
          ? invoiceDetail?.invoice.remaining_amount ?? view.invoice.remaining_amount
          : undefined,
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
      <div className="space-y-4">
        <OrderStatusHero
          status={record.status}
          serviceStatuses={view.services.map((service) => service.status)}
          hasLab={hasLab}
          reference={reference}
          cancelReason={record.cancel_reason}
          meta={
            <div className="flex flex-wrap gap-2 text-[13px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f4] px-3 py-1.5 text-foreground dark:bg-white/5">
                <CalendarClock className="h-4 w-4 text-[#5a7a50]" />
                {record.scheduled_for ? formatDateTime(record.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : t("noPreferredTime")}
              </span>
              {areaName ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f4] px-3 py-1.5 text-foreground dark:bg-white/5">
                  <MapPin className="h-4 w-4 text-[#5a7a50]" />
                  {areaName}
                </span>
              ) : null}
            </div>
          }
        />

        {/* Care team */}
        {record.status !== "CANCELLED" ? (
          <AppCard className="p-5">
            <CardTitle>{tApp("careTeam")}</CardTitle>
            {providers.length ? (
              <div className="mt-3 space-y-3">
                {providers.map((provider) => (
                  <div key={provider.id} className="rounded-2xl bg-[#f6f9f8] p-3.5 dark:bg-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <ProviderAvatar name={provider.name} url={provider.avatarUrl} className="h-14 w-14 ring-2 ring-white dark:ring-transparent" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold text-foreground">{provider.name}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
                          {provider.type ? <ProviderType type={provider.type} /> : null}
                          {provider.rating !== null && provider.ratingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {provider.rating.toFixed(1)}
                              <span className="font-normal text-muted-foreground">({tApp("reviews", { count: provider.ratingCount })})</span>
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{provider.services.join(" · ")}</p>
                      </div>
                    </div>
                    {provider.phone || provider.chatRoomId ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {provider.chatRoomId ? (
                          <Link href={`/${locale}/chat?room=${provider.chatRoomId}`} className={cn(appButton.primary, "min-h-12")}>
                            <MessageCircleMore />
                            {t("chat")}
                          </Link>
                        ) : null}
                        {provider.phone ? (
                          <a href={`tel:${provider.phone}`} className={cn(appButton.secondary, "min-h-12", !provider.chatRoomId && "col-span-2")}>
                            <Phone />
                            {tApp("call")}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{tApp("awaitingTeam")}</p>
            )}
          </AppCard>
        ) : null}

        {/* Items */}
        <AppCard className="p-5">
          <CardTitle aside={<span className="text-[13px] text-muted-foreground">{t("itemsDescription", { count: activeServices.length })}</span>}>
            {t("itemsTitle")}
          </CardTitle>
          <ul className="mt-2 divide-y divide-[var(--app-card-border)]">
            {view.services.map((service) => {
              const appointments = appointmentsByService.get(service.id) || [];
              const files = filesByService.get(service.id) || [];
              const discounted = Number(service.original_price) > Number(service.bundle_price);

              return (
                <li key={service.id} className="space-y-3 py-4 first:pt-3 last:pb-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("text-[15px] font-bold text-foreground", service.status === "CANCELLED" && "text-muted-foreground line-through")}>
                        {service.item_name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {getOrderItemTypeLabel({ type: service.item_type, serviceKind: service.service_kind }, tOrders)}
                        {service.provider_name ? ` · ${service.provider_name}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      {discounted ? (
                        <p className="text-[12px] text-muted-foreground line-through">{formatCurrency(service.original_price, locale)}</p>
                      ) : null}
                      <p className="text-[15px] font-bold tabular-nums">{formatCurrency(service.bundle_price, locale)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ServiceStatusBadge status={service.status} />
                    {!service.provider_id && service.status !== "CANCELLED" ? (
                      <span className="text-[13px] text-muted-foreground">{t("awaitingProvider")}</span>
                    ) : null}
                  </div>

                  {appointments.length ? (
                    <ul className="space-y-1.5">
                      {appointments.map((appointment) => (
                        <li key={appointment.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f6f9f8] px-3 py-2 text-[14px] dark:bg-white/[0.04]">
                          <CalendarClock className="h-4 w-4 text-[#5a7a50]" />
                          <span className="text-muted-foreground">{tOrders(`appointmentTypes.${appointment.type}`)}</span>
                          <span className="font-semibold text-foreground">{formatDateTime(appointment.scheduled_at, "dd/MM/yyyy, HH:mm", locale)}</span>
                          {appointment.notes ? <span className="text-muted-foreground">· {appointment.notes}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {service.my_rating ? (
                    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
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

                  {files.length ? (
                    <FileList
                      files={files}
                      pendingKey={download.pendingKey}
                      onDownload={(file) =>
                        void download.run(`file-${file.id}`, () => casesApi.downloadProviderFile(file), file.original_name || `file-${file.id.slice(0, 8)}`)
                      }
                      locale={locale}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </AppCard>

        {/* Progress */}
        {record.status !== "CANCELLED" ? (
          <AppCard className="p-5">
            <CardTitle>{tApp("progressTitle")}</CardTitle>
            <div className="mt-4">
              <CaseProgress status={record.status} serviceStatuses={view.services.map((service) => service.status)} cancelReason={record.cancel_reason} />
            </div>
          </AppCard>
        ) : null}

        {/* Visit details */}
        <AppCard className="px-5 pb-2 pt-5">
          <CardTitle>{tApp("visitTitle")}</CardTitle>
          <div className="mt-1 divide-y divide-[var(--app-card-border)]">
            <DetailRow icon={MapPin} label={tOrders("area.label")} value={areaName || "-"} />
            <DetailRow icon={MapPin} label={t("address")} value={record.address || "-"} />
            <DetailRow
              icon={CalendarClock}
              label={t("preferredTime")}
              value={record.scheduled_for ? formatDateTime(record.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : t("noPreferredTime")}
            />
            {record.notes ? (
              <DetailRow icon={NotebookPen} label={t("notes")} value={<span className="whitespace-pre-wrap font-medium">{record.notes}</span>} />
            ) : null}
          </div>
        </AppCard>
      </div>

      <div className="mt-4 space-y-4 lg:sticky lg:top-24 lg:mt-0">
        <InvoiceCard
          view={view}
          invoiceDetail={invoiceDetail}
          invoiceLoading={invoiceQuery.isLoading && invoiceReleased}
          locale={locale}
          pendingKey={download.pendingKey}
          onDownload={() => void download.run("invoice", () => casesApi.downloadInvoicePdf(record.id), `invoice-${record.id.slice(0, 8)}.pdf`)}
        />

        <CliqPaymentCard caseStatus={record.status} invoice={cliqInvoice} reference={reference} />

        <AppCard className="p-5">
          <CardTitle icon={FileText}>{t("report.title")}</CardTitle>
          <p className="mt-1.5 text-[14px] leading-6 text-muted-foreground">
            {isClosed ? t("report.description") : t("report.availableAfterClose")}
          </p>
          {isClosed ? (
            <div className="mt-3 flex flex-col gap-2">
              {reportQuery.isLoading ? (
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </div>
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
                <p className="text-[14px] text-muted-foreground">{t("report.notReady")}</p>
              )}
            </div>
          ) : null}
        </AppCard>

        <div className="flex flex-col gap-2.5">
          <Link href={`/${locale}/requests/new?reorder=${record.id}`} className={appButton.soft}>
            <RotateCcw />
            {t("orderAgain")}
          </Link>
          {view.case_actions.can_cancel ? <CancelCaseDialog caseId={record.id} triggerClassName={cn(appButton.danger, "w-full")} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProviderType({ type }: { type: string }) {
  const tEnums = useTranslations("enums");
  return <span>{translateEnumValue(type, tEnums)}</span>;
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
      <p className="text-[13px] font-semibold text-muted-foreground">{t("files.title")}</p>
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-3 rounded-2xl bg-[#f6f9f8] p-3 dark:bg-white/[0.04]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-[#104d49] shadow-sm dark:text-teal-200">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{file.original_name || t(`files.types.${file.file_type}`)}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">
              {file.is_sick_leave ? `${t("files.sickLeave")} · ` : ""}
              {formatDateTime(file.created_at, "dd/MM/yyyy, HH:mm", locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(file)}
            disabled={pendingKey === `file-${file.id}`}
            aria-label={t("files.download")}
            className="app-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-[#104d49] shadow-sm ring-1 ring-[var(--app-card-border)] disabled:opacity-50 dark:text-teal-200"
          >
            {pendingKey === `file-${file.id}` ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          </button>
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
  const tApp = useTranslations("app.detail");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const tInvoices = useTranslations("invoicesPage");
  const invoice = view.invoice;
  const paymentStatus = invoiceDetail?.invoice.payment_status ?? invoice?.payment_status;

  return (
    <AppCard className="p-5">
      <CardTitle icon={Receipt} aside={paymentStatus ? <PaymentStatusBadge status={paymentStatus} size="md" /> : null}>
        {tApp("paymentTitle")}
      </CardTitle>
      <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
        {isInvoiceReleased(invoice) ? t("invoice.released") : t("invoice.estimate")}
      </p>

      {!invoice ? (
        <p className="mt-3 text-[15px] text-muted-foreground">{t("invoice.none")}</p>
      ) : (
        <div className="mt-3">
          {Number(invoice.original_amount) !== Number(invoice.final_amount) ? (
            <AmountRow label={t("invoice.original")} value={formatCurrency(invoice.original_amount, locale)} />
          ) : null}

          {isInvoiceReleased(invoice) && invoiceDetail?.adjustments.length ? (
            <div className="border-t border-dashed border-[var(--app-card-border)] py-1">
              {invoiceDetail.adjustments.map((adjustment) => (
                <AmountRow
                  key={adjustment.id}
                  label={`${t(`invoice.adjustmentTypes.${adjustment.type}`)}${adjustment.reason ? ` · ${adjustment.reason}` : ""}`}
                  value={`${adjustment.type === "DISCOUNT" ? "−" : "+"}${formatCurrency(adjustment.amount, locale)}`}
                  tone={adjustment.type === "DISCOUNT" ? "positive" : "default"}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-1 border-t border-[var(--app-card-border)] pt-2">
            <AmountRow label={t("invoice.final")} value={formatCurrency(invoice.final_amount, locale)} strong />
          </div>

          {isInvoiceReleased(invoice) ? (
            <>
              <AmountRow label={t("invoice.paid")} value={formatCurrency(invoiceDetail?.invoice.total_paid ?? invoice.total_paid, locale)} tone="positive" />
              <AmountRow label={t("invoice.remaining")} value={formatCurrency(invoiceDetail?.invoice.remaining_amount ?? invoice.remaining_amount, locale)} />

              {invoiceLoading ? (
                <div className="mt-2 flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </div>
              ) : invoiceDetail?.payments.length ? (
                <div className="mt-2 space-y-1 rounded-2xl bg-[#f6f9f8] px-3 py-2 dark:bg-white/[0.04]">
                  <p className="pt-1 text-[13px] font-semibold text-muted-foreground">{t("invoice.payments")}</p>
                  {invoiceDetail.payments.map((payment) => (
                    <AmountRow
                      key={payment.id}
                      label={`${tOrders(`paymentMethods.${payment.method}`)} · ${formatDateTime(payment.created_at, "dd/MM/yyyy", locale)}`}
                      value={formatCurrency(payment.amount, locale)}
                    />
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-col gap-2">
                <DownloadButton label={t("invoice.downloadPdf")} busy={pendingKey === "invoice"} onClick={onDownload} />
                <Link href={`/${locale}/invoices/${view.case.id}`} className={cn(appButton.ghost, "w-full")}>
                  {tInvoices("viewDetails")}
                </Link>
              </div>
            </>
          ) : null}
        </div>
      )}
    </AppCard>
  );
}

type ProviderSummary = {
  id: string;
  name: string;
  phone: string | null;
  type: string | null;
  avatarUrl: string | null;
  rating: number | null;
  ratingCount: number;
  chatRoomId: string | null;
  services: string[];
};

function groupProviders(services: CaseServiceLine[]) {
  const map = new Map<string, ProviderSummary>();
  services
    .filter((service) => service.provider_id && service.status !== "CANCELLED")
    .forEach((service) => {
      const key = String(service.provider_id);
      const existing = map.get(key);
      if (existing) {
        existing.services.push(service.item_name);
        existing.chatRoomId = existing.chatRoomId || service.chat_room_id;
        return;
      }
      map.set(key, {
        id: key,
        name: service.provider_name || "-",
        phone: service.provider_phone,
        type: service.provider_type,
        avatarUrl: service.provider_avatar_url,
        rating: service.provider_rating_avg !== null ? Number(service.provider_rating_avg) : null,
        ratingCount: service.provider_rating_count,
        chatRoomId: service.chat_room_id,
        services: [service.item_name],
      });
    });
  return Array.from(map.values());
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
