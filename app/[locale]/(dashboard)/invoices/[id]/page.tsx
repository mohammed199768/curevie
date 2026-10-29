"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Download, Loader2, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AmountRow, AppCard, DetailSkeleton, EmptyState, appButton } from "@/components/app/ui";
import { PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { CliqPaymentCard } from "@/components/orders/CliqPaymentCard";
import { casesApi } from "@/lib/api/cases";
import { downloadProtectedFile } from "@/lib/download";
import { formatCurrency } from "@/lib/formatting";
import { getCaseReference, isolateLtr } from "@/lib/order-stage";
import { cn, formatDateTime } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = String(id || "");
  const locale = useLocale();
  const tPage = useTranslations("invoiceDetailPage");
  const tOrders = useTranslations("orders");
  const tDetail = useTranslations("orderDetail");
  const tApp = useTranslations("app.invoices");
  const [downloading, setDownloading] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ["cases", "invoice", caseId],
    queryFn: () => casesApi.getInvoice(caseId),
    enabled: Boolean(caseId),
    retry: (failureCount, error) =>
      !(isAxiosError(error) && [403, 404].includes(error.response?.status || 0)) && failureCount < 1,
  });

  const caseQuery = useQuery({
    queryKey: ["cases", "detail", caseId],
    queryFn: () => casesApi.getById(caseId),
    enabled: Boolean(caseId),
  });

  if (invoiceQuery.isLoading || caseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <DetailSkeleton />
      </div>
    );
  }

  const invoiceDetail = invoiceQuery.data;
  if (!invoiceDetail?.invoice) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          illustration="empty-orders"
          title={tPage("notFound")}
          action={
            <Link href={`/${locale}/requests/${caseId}`} className={appButton.primary}>
              {tPage("viewOrder")}
            </Link>
          }
        />
      </div>
    );
  }

  const { invoice, payments, adjustments } = invoiceDetail;
  const reference = getCaseReference(caseId);
  const services = (caseQuery.data?.services || []).filter((service) => service.status !== "CANCELLED");
  const caseStatus = caseQuery.data?.case.status ?? "CLOSED";
  const remaining = Number(invoice.remaining_amount || 0);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProtectedFile(() => casesApi.downloadInvoicePdf(caseId), `invoice-${caseId.slice(0, 8)}.pdf`);
    } catch {
      toast.error(tDetail("downloads.failed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <AppCard className="overflow-hidden">
        <div className="app-hero px-5 pb-6 pt-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-white/80">
              <Receipt className="h-4 w-4" />
              {tDetail("invoice.title")} {isolateLtr(reference)}
            </span>
            <PaymentStatusBadge status={invoice.payment_status} size="md" className="bg-white/95 dark:bg-white/90" />
          </div>
          <p className="mt-4 text-[14px] text-white/75">{tApp("total")}</p>
          <p className="mt-1 text-[34px] font-bold leading-none tabular-nums">{formatCurrency(invoice.final_amount, locale)}</p>
          <p className="mt-3 text-[13px] text-white/75">
            {tApp("issuedOn", { date: formatDateTime(caseQuery.data?.case.closed_at || invoice.created_at, "dd/MM/yyyy, HH:mm", locale) })}
          </p>
        </div>

        <div className="space-y-1 px-5 py-4">
          {services.length ? (
            <ul className="divide-y divide-dashed divide-[var(--app-card-border)] pb-2">
              {services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="text-[15px] text-foreground">{service.item_name}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatCurrency(service.bundle_price, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t border-[var(--app-card-border)] pt-2">
            {adjustments.length || Number(invoice.original_amount) !== Number(invoice.final_amount) ? (
              <AmountRow label={tPage("original")} value={formatCurrency(invoice.original_amount, locale)} />
            ) : null}
            {adjustments.map((adjustment) => (
              <AmountRow
                key={adjustment.id}
                label={`${tDetail(`invoice.adjustmentTypes.${adjustment.type}`)}${adjustment.reason ? ` · ${adjustment.reason}` : ""}`}
                value={`${adjustment.type === "DISCOUNT" ? "−" : "+"}${formatCurrency(adjustment.amount, locale)}`}
                tone={adjustment.type === "DISCOUNT" ? "positive" : "default"}
              />
            ))}
          </div>
          <div className="border-t border-[var(--app-card-border)] pt-2">
            <AmountRow label={tPage("total")} value={formatCurrency(invoice.final_amount, locale)} strong />
            <AmountRow label={tPage("paid")} value={formatCurrency(invoice.total_paid, locale)} tone="positive" />
            <AmountRow
              label={tPage("remaining")}
              value={<span className={cn(remaining > 0 && "text-[#8a5200] dark:text-amber-200")}>{formatCurrency(invoice.remaining_amount, locale)}</span>}
            />
          </div>
        </div>
      </AppCard>

      <CliqPaymentCard caseStatus={caseStatus} invoice={invoice} reference={reference} />

      {payments.length ? (
        <AppCard className="p-5">
          <h2 className="text-[17px] font-bold text-foreground">{tPage("payments")}</h2>
          <ul className="mt-2 divide-y divide-[var(--app-card-border)]">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{tOrders(`paymentMethods.${payment.method}`)}</p>
                  <p className="text-[13px] text-muted-foreground">{formatDateTime(payment.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                </div>
                <span className="text-[15px] font-bold tabular-nums text-[#3f7a3a] dark:text-lime-300">{formatCurrency(payment.amount, locale)}</span>
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <button type="button" className={appButton.primary} onClick={() => void handleDownload()} disabled={downloading}>
          {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          {tPage("downloadPdf")}
        </button>
        <Link href={`/${locale}/requests/${caseId}`} className={appButton.secondary}>
          {tPage("viewOrder")}
        </Link>
      </div>
    </div>
  );
}
