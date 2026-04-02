"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestsApi } from "@/lib/api/requests";
import { invoicesApi } from "@/lib/api/invoices";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { translateEnumValue } from "@/lib/i18n";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatDateTime, normalizeListResponse, toNumber } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tPage = useTranslations("dashboardPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const patient = useAuthStore((state) => state.patient);

  const requestsQuery = useQuery({
    queryKey: ["dashboard", "requests"],
    queryFn: async () => normalizeListResponse((await requestsApi.list({ page: 1, limit: 5 })).data),
  });

  const invoicesQuery = useQuery({
    queryKey: ["dashboard", "invoices"],
    queryFn: async () => normalizeListResponse((await invoicesApi.list({ page: 1, limit: 5 })).data),
  });

  const requests = requestsQuery.data?.data || [];
  const invoices = invoicesQuery.data?.data || [];

  const pending = requests.filter((row: any) => row.status === "PENDING").length;
  const completed = requests.filter((row: any) => row.status === "COMPLETED").length;
  const pendingInvoices = invoices.filter((row: any) => row.payment_status !== "PAID");
  const isInitialLoading =
    (requestsQuery.isLoading && !requestsQuery.data) ||
    (invoicesQuery.isLoading && !invoicesQuery.data);

  if (isInitialLoading) {
    return <AppPreloader variant="page" title={tCommon("loading")} blockCount={3} />;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-r from-primary/15 to-secondary/10">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold">{t("welcome")} {patient?.full_name}</h2>
          <p className="mt-3 text-sm">{t("points")}: {patient?.points || 0}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t("totalRequests")} value={requests.length} ready={Boolean(requestsQuery.data)} loadingLabel={tCommon("loading")} />
        <StatCard title={t("pending")} value={pending} ready={Boolean(requestsQuery.data)} loadingLabel={tCommon("loading")} />
        <StatCard title={t("completed")} value={completed} ready={Boolean(requestsQuery.data)} loadingLabel={tCommon("loading")} />
      </div>

      <div className="space-y-4">
        {pendingInvoices.length ? (
          <Card className="rounded-2xl border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4 text-sm">
              {tPage("pendingInvoicesSummary", {
                count: pendingInvoices.length,
                amount: pendingInvoices.reduce((sum: number, row: any) => sum + toNumber(row.remaining_amount), 0).toFixed(2),
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentRequests")}</CardTitle>
            <Button asChild size="sm" variant="outline"><Link href={`/${locale}/requests`}>{tPage("viewAll")}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!requestsQuery.data ? (
              <DashboardSectionPreloader title={t("recentRequests")} description={tPage("summaryDescription")} />
            ) : requests.length ? (
              requests.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{translateEnumValue(item.service_type, tEnums)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={item.status} />
                    <Button asChild size="sm" variant="outline"><Link href={`/${locale}/requests/${item.id}`}>{tPage("view")}</Link></Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{tPage("noRequests")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSectionPreloader({ title, description }: { title: string; description?: string }) {
  return (
    <AppPreloader
      variant="panel"
      title={title}
      description={description}
      blockCount={2}
      blockVariant="line"
      className="min-h-[13.5rem]"
    />
  );
}

function StatCard({
  title,
  value,
  ready,
  loadingLabel,
}: {
  title: string;
  value: number;
  ready: boolean;
  loadingLabel: string;
}) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        {ready ? (
          <p className="mt-2 text-3xl font-bold">{value}</p>
        ) : (
          <div className="mt-3">
            <AppPreloader variant="inline" title={loadingLabel} className="w-full justify-start rounded-2xl" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

