"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { casesApi } from "@/lib/api/cases";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tPage = useTranslations("dashboardPage");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const patient = useAuthStore((state) => state.patient);

  const casesQuery = useQuery({
    queryKey: ["dashboard", "cases-stats", patient?.id],
    queryFn: async () => {
      const result = await casesApi.list({ limit: 100 });
      const cases = result.data?.data ?? [];
      const total = cases.length;
      const completed = cases.filter((c) => c.status === "CLOSED").length;
      const in_progress = cases.filter((c) =>
        ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(c.status)
      ).length;
      return { cases, total, completed, in_progress };
    },
    enabled: Boolean(patient?.id),
    initialData: { cases: [], total: 0, completed: 0, in_progress: 0 },
  });

  const recentCases = (casesQuery.data?.cases ?? []).slice(0, 3);
  const isInitialLoading = casesQuery.isFetching && recentCases.length === 0;

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
        <StatCard title={t("totalRequests")} value={casesQuery.data.total} ready={!casesQuery.isFetching} loadingLabel={tCommon("loading")} />
        <StatCard title={t("pending")} value={casesQuery.data.in_progress} ready={!casesQuery.isFetching} loadingLabel={tCommon("loading")} />
        <StatCard title={t("completed")} value={casesQuery.data.completed} ready={!casesQuery.isFetching} loadingLabel={tCommon("loading")} />
      </div>

      <div className="space-y-4">
        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("recentRequests")}</CardTitle>
            <Button asChild size="sm" variant="outline"><Link href={`/${locale}/requests`}>{tPage("viewAll")}</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {casesQuery.isFetching && recentCases.length === 0 ? (
              <DashboardSectionPreloader title={t("recentRequests")} description={tPage("summaryDescription")} />
            ) : recentCases.length ? (
              recentCases.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.services?.[0]?.service_name || `#${item.id.slice(0, 8)}`}</p>
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

