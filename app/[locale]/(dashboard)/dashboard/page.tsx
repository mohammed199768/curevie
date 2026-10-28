"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { casesApi, type CaseListRow } from "@/lib/api/cases";
import { CaseStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tPage = useTranslations("dashboardPage");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const patient = useAuthStore((state) => state.patient);

  const casesStatsQuery = useQuery<{
    total: number;
    in_progress: number;
    completed: number;
    recent: CaseListRow[];
  }>({
    queryKey: ["cases", "list", "dashboard-stats"],
    queryFn: async () => {
      // Counts come from the server totals of status-filtered lists (no client-side filtering).
      const [latest, active, closed] = await Promise.all([
        casesApi.list({ page: 1, limit: 3 }),
        casesApi.list({ page: 1, limit: 1, status: ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] }),
        casesApi.list({ page: 1, limit: 1, status: ["CLOSED"] }),
      ]);
      return {
        total: latest.total,
        in_progress: active.total,
        completed: closed.total,
        recent: latest.cases,
      };
    },
    staleTime: 30_000,
  });

  const statsTotal = casesStatsQuery.data?.total ?? 0;
  const statsInProgress = casesStatsQuery.data?.in_progress ?? 0;
  const statsCompleted = casesStatsQuery.data?.completed ?? 0;
  const statsRecent = casesStatsQuery.data?.recent ?? [];
  const isInitialLoading = casesStatsQuery.isLoading && statsRecent.length === 0;

  if (isInitialLoading) {
    return <AppPreloader variant="page" title={tCommon("loading")} blockCount={3} />;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-r from-primary/15 to-secondary/10">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold">{t("welcome")} {patient?.full_name}</h2>
          {patient?.is_vip ? <p className="mt-3 text-sm font-medium text-primary">{t("vipMember")}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t("totalRequests")} value={statsTotal} ready={!casesStatsQuery.isLoading} loadingLabel={tCommon("loading")} />
        <StatCard title={t("pending")} value={statsInProgress} ready={!casesStatsQuery.isLoading} loadingLabel={tCommon("loading")} />
        <StatCard title={t("completed")} value={statsCompleted} ready={!casesStatsQuery.isLoading} loadingLabel={tCommon("loading")} />
      </div>

      <div className="space-y-4">
        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentRequests")}</CardTitle>
            <Button asChild size="sm" variant="outline"><Link href={`/${locale}/requests`}>{tPage("viewAll")}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {casesStatsQuery.isLoading && statsRecent.length === 0 ? (
              <DashboardSectionPreloader title={t("recentRequests")} description={tPage("summaryDescription")} />
            ) : statsRecent.length ? (
              statsRecent.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.item_names?.[0] || `#${item.id.slice(0, 8).toUpperCase()}`}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CaseStatusBadge status={item.status} />
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

