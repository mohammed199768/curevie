"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 9;

export default function InvoicesPage() {
  const locale = useLocale();
  const tPage = useTranslations("invoicesPage");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(1);

  // Invoices are released to patients when the case is closed; the list rows already carry the totals.
  const query = useQuery({
    queryKey: ["cases", "list", { page, limit: PAGE_SIZE, status: "CLOSED", view: "invoices" }],
    queryFn: () => casesApi.list({ page, limit: PAGE_SIZE, status: ["CLOSED"] }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.cases || [];
  const totalPages = Math.max(1, Math.ceil(Number(query.data?.total || 0) / PAGE_SIZE));

  if (query.isLoading) {
    return <AppPreloader variant="page" title={tPage("title")} description={tCommon("loading")} blockCount={6} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{tPage("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tPage("description")}</p>
      </div>

      {query.isError && !query.data ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
            <span className="text-destructive">{tCommon("error")}</span>
            <Button variant="outline" onClick={() => void query.refetch()}>{tCommon("retry")}</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? (
          rows.map((item) => {
            const reference = `#${item.id.slice(0, 8).toUpperCase()}`;
            const itemNames = (item.item_names || []).filter(Boolean);

            return (
              <Card key={item.id} className="rounded-2xl shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{tOrders("reference", { reference })}</p>
                    {item.payment_status ? <PaymentStatusBadge status={item.payment_status} /> : null}
                  </div>
                  <p className="line-clamp-2 text-sm">{itemNames.join("، ") || tCommon("service")}</p>
                  <p className="text-3xl font-bold">{formatCurrency(item.final_amount ?? 0, locale)}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {item.remaining_amount !== null && Number(item.remaining_amount) > 0 ? (
                      <p>{tPage("remaining", { amount: formatCurrency(item.remaining_amount, locale) })}</p>
                    ) : null}
                    <p>{formatDateTime(item.updated_at || item.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/${locale}/invoices/${item.id}`}>{tPage("viewDetails")}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">{tPage("empty")}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>{tCommon("prev")}</Button>
        <p className="text-sm text-muted-foreground">{tCommon("pageOf", { page, total: totalPages })}</p>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>
          {tCommon("next")}
        </Button>
      </div>
    </div>
  );
}
