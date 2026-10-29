"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardList, Crown, FlaskConical, HeartPulse, Package, Plus, ScanLine, Stethoscope } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  AppCard,
  EmptyState,
  ForwardChevron,
  Illustration,
  SectionHeader,
  Shimmer,
  appButton,
} from "@/components/app/ui";
import { CaseStatusBadge } from "@/components/orders/CaseStatusBadge";
import { casesApi, type CaseListRow } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { ACTIVE_CASE_STATUSES, getCaseReference, getOrderStageIndex, ORDER_STAGES, isolateLtr } from "@/lib/order-stage";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn, formatDateTime } from "@/lib/utils";

const QUICK_SERVICES = [
  { key: "MEDICAL", icon: Stethoscope, href: "requests/new?kind=MEDICAL", tone: "bg-[#e6f0ee] text-[#104d49]" },
  { key: "NURSING", icon: HeartPulse, href: "requests/new?kind=NURSING", tone: "bg-[#fdeee8] text-[#b4532a]" },
  { key: "LAB", icon: FlaskConical, href: "requests/new?kind=LAB", tone: "bg-[#eef5e6] text-[#4a6b32]" },
  { key: "RADIOLOGY", icon: ScanLine, href: "requests/new?kind=RADIOLOGY", tone: "bg-[#e8f1fb] text-[#1d5fa8]" },
] as const;

export default function DashboardPage() {
  const t = useTranslations("app.home");
  const tDash = useTranslations("dashboard");
  const tPage = useTranslations("dashboardPage");
  const tOrders = useTranslations("orders");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const patient = useAuthStore((state) => state.patient);

  const casesStatsQuery = useQuery<{
    total: number;
    in_progress: number;
    completed: number;
    recent: CaseListRow[];
    active: CaseListRow | null;
  }>({
    queryKey: ["cases", "list", "dashboard-stats"],
    queryFn: async () => {
      // Counts come from the server totals of status-filtered lists (no client-side filtering).
      const [latest, active, closed] = await Promise.all([
        casesApi.list({ page: 1, limit: 3 }),
        casesApi.list({ page: 1, limit: 1, status: ACTIVE_CASE_STATUSES }),
        casesApi.list({ page: 1, limit: 1, status: ["CLOSED"] }),
      ]);
      return {
        total: latest.total,
        in_progress: active.total,
        completed: closed.total,
        recent: latest.cases,
        active: active.cases[0] || null,
      };
    },
    staleTime: 30_000,
  });

  const data = casesStatsQuery.data;
  const loading = casesStatsQuery.isLoading;
  const vipPercent = Number(patient?.vip_discount || 0);
  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay } };

  return (
    <div className="mx-auto max-w-3xl lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
      <div className="space-y-6">
      {patient?.is_vip ? (
        <motion.div {...fade(0)} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#fff6e0] to-[#fffbf0] px-4 py-3 text-[14px] text-[#7a5300] ring-1 ring-[#f3e2b5] dark:from-amber-500/10 dark:to-transparent dark:text-amber-200 dark:ring-amber-500/20">
          <Crown className="h-5 w-5 shrink-0" />
          <span className="font-bold">{t("vip")}</span>
          <span className="truncate text-[13px] opacity-90">
            {vipPercent > 0 ? t("vipDiscount", { percent: vipPercent }) : tDash("vipMember")}
          </span>
        </motion.div>
      ) : null}

      {/* Hero: one obvious primary action */}
      <motion.section {...fade(0.03)} className="app-hero relative overflow-hidden rounded-[26px] text-white shadow-[0_24px_48px_-24px_rgba(11,63,59,0.65)]">
        <div className="pointer-events-none absolute -bottom-16 -start-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex items-end gap-2 p-5 pe-2 sm:p-7">
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-[24px] font-bold leading-tight sm:text-[28px]">{t("heroTitle")}</h1>
            <p className="mt-2 text-[15px] leading-6 text-white/80">{t("heroSubtitle")}</p>
            <Link
              href={`/${locale}/requests/new`}
              className="app-press mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-bold text-[#104d49] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] hover:bg-white/95"
            >
              <Plus className="h-5 w-5" strokeWidth={2.4} />
              {t("heroCta")}
            </Link>
          </div>
          <Illustration name="welcome" priority className="-mb-5 h-[170px] w-[118px] shrink-0 sm:h-[210px] sm:w-[146px]" sizes="160px" />
        </div>
      </motion.section>

      {/* Quick services */}
      <motion.section {...fade(0.08)} className="space-y-3">
        <SectionHeader title={t("servicesTitle")} />
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {QUICK_SERVICES.map((service) => (
            <Link
              key={service.key}
              href={`/${locale}/${service.href}`}
              className="app-press app-card flex flex-col items-center gap-2 px-1.5 pb-3 pt-3.5 text-center hover:shadow-[var(--app-shadow-lg)]"
            >
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl dark:bg-white/10 dark:text-teal-100", service.tone)}>
                <service.icon className="h-6 w-6" />
              </span>
              <span className="text-[12.5px] font-semibold leading-4 text-foreground">{t(`quick.${service.key}`)}</span>
            </Link>
          ))}
        </div>
        <Link
          href={`/${locale}/requests/new?type=PACKAGE`}
          className="app-press app-card flex min-h-[64px] items-center gap-3 px-4 py-3 hover:shadow-[var(--app-shadow-lg)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3efe6] text-[#7a5a2a] dark:bg-white/10 dark:text-amber-100">
            <Package className="h-5 w-5" />
          </span>
          <span className="flex-1 text-[15px] font-semibold text-foreground">{t("quick.PACKAGE")}</span>
          <ForwardChevron className="text-muted-foreground/70" />
        </Link>
      </motion.section>

      {/* Current order */}
      {loading ? (
        <AppCard className="space-y-4 p-5">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-6 w-2/3" />
          <Shimmer className="h-2 w-full rounded-full" />
        </AppCard>
      ) : data?.active ? (
        <motion.section {...fade(0.12)} className="space-y-3">
          <SectionHeader title={t("activeTitle")} />
          <ActiveOrderCard row={data.active} locale={locale} trackLabel={t("trackOrder")} />
        </motion.section>
      ) : null}

      </div>

      <div className="mt-6 space-y-6 lg:mt-0">
      {/* Stats */}
      <motion.section {...fade(0.16)} className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          { label: t("statActive"), value: data?.in_progress },
          { label: t("statTotal"), value: data?.total },
          { label: t("statDone"), value: data?.completed },
        ].map((stat) => (
          <AppCard key={stat.label} className="px-3 py-4 text-center">
            {loading ? (
              <Shimmer className="mx-auto h-7 w-10" />
            ) : (
              <p className="text-[26px] font-bold leading-none tabular-nums text-[#104d49] dark:text-teal-100">{stat.value ?? 0}</p>
            )}
            <p className="mt-2 text-[13px] text-muted-foreground">{stat.label}</p>
          </AppCard>
        ))}
      </motion.section>

      {/* Recent orders */}
      <motion.section {...fade(0.2)} className="space-y-3">
        <SectionHeader
          title={tDash("recentRequests")}
          action={
            data?.recent.length ? (
              <Link href={`/${locale}/requests`} className="rounded-full px-3 py-2 text-[14px] font-semibold text-[#104d49] hover:bg-[#e6f0ee] dark:text-teal-200">
                {tPage("viewAll")}
              </Link>
            ) : null
          }
        />
        {loading ? (
          <AppCard className="divide-y divide-[var(--app-card-border)]">
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex items-center gap-3 p-4">
                <Shimmer className="h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-4 w-1/2" />
                  <Shimmer className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </AppCard>
        ) : data?.recent.length ? (
          <AppCard className="divide-y divide-[var(--app-card-border)] overflow-hidden">
            {data.recent.map((item) => {
              const names = (item.item_names || []).filter(Boolean);
              return (
                <Link
                  key={item.id}
                  href={`/${locale}/requests/${item.id}`}
                  className="app-press flex items-center gap-3 px-4 py-3.5 hover:bg-[#f7faf9] dark:hover:bg-white/5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1f5f4] text-[#104d49] dark:bg-white/5 dark:text-teal-100">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {names[0] || tOrders("reference", { reference: isolateLtr(getCaseReference(item.id)) })}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {formatDateTime(item.created_at, "dd/MM/yyyy, HH:mm", locale)}
                    </p>
                  </div>
                  <CaseStatusBadge status={item.status} size="sm" />
                </Link>
              );
            })}
          </AppCard>
        ) : (
          <EmptyState
            illustration="empty-orders"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Link href={`/${locale}/requests/new`} className={appButton.primary}>
                <Plus />
                {t("heroCta")}
              </Link>
            }
          />
        )}
      </motion.section>
      </div>
    </div>
  );
}

function ActiveOrderCard({ row, locale, trackLabel }: { row: CaseListRow; locale: string; trackLabel: string }) {
  const t = useTranslations("app");
  const tOrders = useTranslations("orders");
  const names = (row.item_names || []).filter(Boolean);
  // The list row has no per-item statuses; the detail (shared cache with the order page) tells "assigned" from "on the way".
  const detailQuery = useQuery({
    queryKey: ["cases", "detail", row.id],
    queryFn: () => casesApi.getById(row.id),
    enabled: row.status === "ACCEPTED",
    staleTime: 30_000,
  });
  const index = getOrderStageIndex(row.status, detailQuery.data?.services.map((service) => service.status) || []);
  const stage = ORDER_STAGES[Math.max(0, index)];
  const extra = Math.max(0, names.length - 1);

  return (
    <Link href={`/${locale}/requests/${row.id}`} className="app-press app-card block overflow-hidden hover:shadow-[var(--app-shadow-lg)]">
      <div className="flex items-start gap-3 p-5 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={row.status} size="sm" />
            <span className="text-[13px] text-muted-foreground">{getCaseReference(row.id)}</span>
          </div>
          <p className="mt-2.5 truncate text-[17px] font-bold text-foreground">
            {names[0] || tOrders("reference", { reference: isolateLtr(getCaseReference(row.id)) })}
            {extra ? <span className="ms-1.5 text-[14px] font-medium text-muted-foreground">{isolateLtr(`+${extra}`)}</span> : null}
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground">{t(`stageHints.${stage}`)}</p>
        </div>
      </div>
      <div className="px-5">
        <div className="flex gap-1.5">
          {ORDER_STAGES.map((item, stepIndex) => (
            <span
              key={item}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                stepIndex < index ? "bg-[#104d49] dark:bg-teal-300" : stepIndex === index ? "bg-[#86ab62]" : "bg-[#e3ebe8] dark:bg-white/10",
              )}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--app-card-border)] px-5 py-3.5">
        <span className="text-[14px] text-muted-foreground">
          {row.final_amount !== null ? formatCurrency(row.final_amount, locale) : row.scheduled_for ? formatDateTime(row.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : null}
        </span>
        <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#104d49] dark:text-teal-200">
          {trackLabel}
          <ForwardChevron className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
