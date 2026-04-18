"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { formatDateTime, triggerBlobDownload } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = String(id || "");
  const locale = useLocale();
  const tPage = useTranslations("invoiceDetailPage");
  const tEnums = useTranslations("enums");

  const invoiceQuery = useQuery({
    queryKey: ["invoice", caseId],
    queryFn: async () => (await casesApi.getInvoice(caseId)).data,
    enabled: Boolean(caseId),
  });

  const caseQuery = useQuery({
    queryKey: ["invoice-case", caseId],
    queryFn: async () => (await casesApi.getById(caseId)).data,
    enabled: Boolean(caseId),
  });

  if (invoiceQuery.isLoading || caseQuery.isLoading) {
    return <AppPreloader variant="page" title={tPage("title", { id: caseId.slice(0, 8) })} blockCount={3} />;
  }

  const invoiceDetail = invoiceQuery.data;
  const caseDetail = caseQuery.data;
  if (!invoiceDetail?.invoice) return <p className="text-sm">{tPage("notFound")}</p>;

  const invoice = invoiceDetail.invoice;
  const servicesLabel = caseDetail?.services?.map((service) => service.service_name).filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{tPage("title", { id: invoice.id.slice(0, 8) })}</CardTitle>
          <StatusBadge value={invoice.payment_status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{tPage("service")}: {servicesLabel || translateEnumValue(caseDetail?.package_id ? "PACKAGE" : undefined, tEnums) || "-"}</p>
          <p>{tPage("date")}: {formatDateTime(invoice.created_at || caseDetail?.closed_at || caseDetail?.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>

          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="p-2">{tPage("original")}</td><td className="p-2 text-right">{formatCurrency(invoice.original_amount, locale)}</td></tr>
                <tr><td className="p-2 font-semibold">{tPage("total")}</td><td className="p-2 text-right font-semibold">{formatCurrency(invoice.final_amount, locale)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p>{tPage("paid")}: {formatCurrency(invoice.total_paid, locale)}</p>
            <p>{tPage("remaining")}: {formatCurrency(invoice.remaining_amount, locale)}</p>
            <p>{tPage("method")}: {translateEnumValue(invoice.payment_method, tEnums) || "-"}</p>
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              const response = await casesApi.downloadInvoicePdf(caseId);
              triggerBlobDownload(response.data, `invoice-${invoice.id.slice(0, 8)}.pdf`);
            }}
          >
            {tPage("downloadPdf")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

