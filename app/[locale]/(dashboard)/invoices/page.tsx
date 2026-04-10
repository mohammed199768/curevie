"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { invoicesApi } from "@/lib/api/invoices";
import { translateEnumValue } from "@/lib/i18n";
import { formatDateTime, normalizeListResponse, toNumber } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicesPage() {
  const locale = useLocale();
  const tPage = useTranslations("invoicesPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["invoices", page],
    queryFn: async () => normalizeListResponse((await invoicesApi.list({ page, limit: 10 })).data),
    enabled: false,
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
                  <p className="font-semibold">#{item.id.slice(0, 8)}</p>
                  <StatusBadge value={item.payment_status_detail || item.payment_status} />
                </div>
                <p className="text-sm">{item.service_name || translateEnumValue(item.service_type, tEnums) || tCommon("service")}</p>
                <p className="text-3xl font-bold">{toNumber(item.final_amount).toFixed(2)} JD</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                <Button asChild variant="outline" className="w-full"><Link href={`/${locale}/invoices/${item.id}`}>{tPage("viewDetails")}</Link></Button>
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
        <Button variant="outline" disabled={!rows.length} onClick={() => setPage((v) => v + 1)}>{tCommon("next")}</Button>
      </div>
    </div>
  );
}

