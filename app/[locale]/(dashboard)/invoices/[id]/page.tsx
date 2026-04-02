"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { invoicesApi } from "@/lib/api/invoices";
import { translateEnumValue } from "@/lib/i18n";
import { formatDateTime, triggerBlobDownload, toNumber } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const tPage = useTranslations("invoiceDetailPage");
  const tEnums = useTranslations("enums");

  const query = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await invoicesApi.getById(id)).data,
    enabled: Boolean(id),
  });

  if (query.isLoading) return <AppPreloader variant="page" title={tPage("title", { id: String(id).slice(0, 8) })} blockCount={3} />;
  const invoice = query.data;
  if (!invoice) return <p className="text-sm">{tPage("notFound")}</p>;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{tPage("title", { id: invoice.id.slice(0, 8) })}</CardTitle>
          <StatusBadge value={invoice.payment_status_detail || invoice.payment_status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{tPage("service")}: {invoice.service_name || translateEnumValue(invoice.service_type, tEnums) || "-"}</p>
          <p>{tPage("date")}: {formatDateTime(invoice.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>

          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="p-2">{tPage("original")}</td><td className="p-2 text-right">{toNumber(invoice.original_amount).toFixed(2)} JD</td></tr>
                <tr className="border-b"><td className="p-2">{tPage("couponDiscount")}</td><td className="p-2 text-right">- {toNumber(invoice.coupon_discount_amount).toFixed(2)} JD</td></tr>
                <tr className="border-b"><td className="p-2">{tPage("pointsDiscount")}</td><td className="p-2 text-right">- {toNumber(invoice.points_discount_amount).toFixed(2)} JD</td></tr>
                <tr><td className="p-2 font-semibold">{tPage("total")}</td><td className="p-2 text-right font-semibold">{toNumber(invoice.final_amount).toFixed(2)} JD</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border p-3">
            <p>{tPage("paid")}: {toNumber(invoice.total_paid).toFixed(2)} JD</p>
            <p>{tPage("remaining")}: {toNumber(invoice.remaining_amount).toFixed(2)} JD</p>
            <p>{tPage("method")}: {translateEnumValue(invoice.payment_method, tEnums) || "-"}</p>
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              const response = await invoicesApi.downloadPdf(id);
              triggerBlobDownload(response.data, `invoice-${id.slice(0, 8)}.pdf`);
            }}
          >
            {tPage("downloadPdf")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

