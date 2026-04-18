"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

type PatientInvoiceRow = {
  case_id: string;
  invoice_id: string;
  payment_status: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
  final_amount: number;
  total_paid: number;
  remaining_amount: number;
  created_at: string;
  service_name?: string | null;
  service_type?: string | null;
};

export default function InvoicesPage() {
  const locale = useLocale();
  const tPage = useTranslations("invoicesPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["invoices", page],
    queryFn: async () => {
      const casesResponse = await casesApi.list({ page, limit: 10, status: "CLOSED" });
      const closedCases = casesResponse.data.data;

      const invoiceRows = (await Promise.all(
        closedCases.map(async (caseItem): Promise<PatientInvoiceRow | null> => {
          try {
            const invoiceDetail = (await casesApi.getInvoice(caseItem.id)).data;
            if (invoiceDetail.invoice.payment_status !== "PAID") {
              return null;
            }
            const serviceLabel = caseItem.services
              .map((service) => service.service_name)
              .filter(Boolean)
              .join(", ");

            return {
              case_id: caseItem.id,
              invoice_id: invoiceDetail.invoice.id,
              payment_status: invoiceDetail.invoice.payment_status,
              final_amount: invoiceDetail.invoice.final_amount,
              total_paid: invoiceDetail.invoice.total_paid,
              remaining_amount: invoiceDetail.invoice.remaining_amount,
              created_at: invoiceDetail.invoice.created_at || caseItem.closed_at || caseItem.created_at,
              service_name: serviceLabel || null,
              service_type: caseItem.package_id ? "PACKAGE" : null,
            };
          } catch {
            return null;
          }
        }),
      )).filter((item): item is PatientInvoiceRow => Boolean(item));

      return {
        data: invoiceRows,
        pagination: casesResponse.data.pagination,
      };
    },
  });

  const rows = query.data?.data || [];
  const pagination = query.data?.pagination;

  if (query.isLoading) {
    return <AppPreloader variant="page" title={tPage("title")} description={tCommon("loading")} blockCount={6} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{tPage("title")}</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? (
          rows.map((item: any) => (
            <Card key={item.id} className="rounded-2xl shadow-lg">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">#{item.invoice_id.slice(0, 8)}</p>
                  <StatusBadge value={item.payment_status} />
                </div>
                <p className="text-sm">{item.service_name || translateEnumValue(item.service_type, tEnums) || tCommon("service")}</p>
                <p className="text-3xl font-bold">{formatCurrency(item.final_amount, locale)}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                  <p>{tPage("title")}: #{item.case_id.slice(0, 8)}</p>
                </div>
                <Button asChild variant="outline" className="w-full"><Link href={`/${locale}/invoices/${item.case_id}`}>{tPage("viewDetails")}</Link></Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{tPage("empty")}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>{tCommon("prev")}</Button>
        <p className="text-sm text-muted-foreground">{page} / {Math.max(1, Math.ceil(Number(pagination?.total || 0) / Number(pagination?.limit || 10)))}</p>
        <Button
          variant="outline"
          disabled={page >= Math.max(1, Math.ceil(Number(pagination?.total || 0) / Number(pagination?.limit || 10)))}
          onClick={() => setPage((v) => v + 1)}
        >
          {tCommon("next")}
        </Button>
      </div>
    </div>
  );
}

