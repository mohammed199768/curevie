"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Download, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { casesApi } from "@/lib/api/cases";
import { downloadProtectedFile } from "@/lib/download";
import { formatCurrency } from "@/lib/formatting";
import { formatDateTime } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = String(id || "");
  const locale = useLocale();
  const tPage = useTranslations("invoiceDetailPage");
  const tOrders = useTranslations("orders");
  const tDetail = useTranslations("orderDetail");
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
    return <AppPreloader variant="page" title={tPage("title", { id: caseId.slice(0, 8).toUpperCase() })} blockCount={3} />;
  }

  const invoiceDetail = invoiceQuery.data;
  if (!invoiceDetail?.invoice) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <span>{tPage("notFound")}</span>
          <Button asChild variant="outline">
            <Link href={`/${locale}/requests/${caseId}`}>{tPage("viewOrder")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { invoice, payments, adjustments } = invoiceDetail;
  const itemsLabel = caseQuery.data?.services
    .filter((service) => service.status !== "CANCELLED")
    .map((service) => service.item_name)
    .join("، ");

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
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{tPage("title", { id: caseId.slice(0, 8).toUpperCase() })}</CardTitle>
          <PaymentStatusBadge status={invoice.payment_status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{tPage("service")}: {itemsLabel || "-"}</p>
          <p>{tPage("date")}: {formatDateTime(caseQuery.data?.case.closed_at || invoice.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>

          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">{tPage("original")}</td>
                  <td className="p-2 text-end">{formatCurrency(invoice.original_amount, locale)}</td>
                </tr>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="border-b">
                    <td className="p-2">
                      {tDetail(`invoice.adjustmentTypes.${adjustment.type}`)}
                      {adjustment.reason ? <span className="text-muted-foreground"> · {adjustment.reason}</span> : null}
                    </td>
                    <td className="p-2 text-end">
                      {adjustment.type === "DISCOUNT" ? "−" : "+"}
                      {formatCurrency(adjustment.amount, locale)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="p-2 font-semibold">{tPage("total")}</td>
                  <td className="p-2 text-end font-semibold">{formatCurrency(invoice.final_amount, locale)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1 rounded-xl border p-3">
            <p>{tPage("paid")}: {formatCurrency(invoice.total_paid, locale)}</p>
            <p>{tPage("remaining")}: {formatCurrency(invoice.remaining_amount, locale)}</p>
          </div>

          {payments.length ? (
            <div className="rounded-xl border">
              <p className="border-b p-2 font-medium">{tPage("payments")}</p>
              <table className="w-full text-sm">
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0">
                      <td className="p-2">{formatDateTime(payment.created_at, "dd/MM/yyyy, HH:mm", locale)}</td>
                      <td className="p-2">{tOrders(`paymentMethods.${payment.method}`)}</td>
                      <td className="p-2 text-end">{formatCurrency(payment.amount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleDownload()} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {tPage("downloadPdf")}
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/${locale}/requests/${caseId}`}>{tPage("viewOrder")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
