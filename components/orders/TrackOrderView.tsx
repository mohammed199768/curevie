"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CalendarClock, Loader2, MapPin, Receipt, RefreshCw, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AmountRow, AppCard, DetailRow, DetailSkeleton, EmptyState, appButton } from "@/components/app/ui";
import { CaseProgress, OrderStatusHero } from "@/components/orders/CaseProgress";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";
import { CliqPaymentCard } from "@/components/orders/CliqPaymentCard";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { getOrderItemTypeLabel } from "@/lib/order-items";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn, formatDateTime } from "@/lib/utils";

// Guests have no socket; refresh the public view slowly while the page is open.
const TRACKING_REFETCH_INTERVAL_MS = 60_000;

export function TrackOrderView({ token }: { token: string }) {
  const locale = useLocale();
  const t = useTranslations("trackPage");
  const tApp = useTranslations("app");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const trackQuery = useQuery({
    queryKey: ["track", token],
    queryFn: () => casesApi.track(token),
    enabled: Boolean(token),
    refetchInterval: TRACKING_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => !(isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });

  const claimMutation = useMutation({
    mutationFn: () => casesApi.claim(token),
    onSuccess: async (view) => {
      toast.success(t("claimed"));
      queryClient.removeQueries({ queryKey: ["track", token] });
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push(`/${locale}/requests/${view.case.id}`);
    },
    onError: (error) => toast.error(getOrderErrorMessage(error, tOrders)),
  });

  const trackingPath = `/${locale}/track/${encodeURIComponent(token)}`;

  if (trackQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (trackQuery.isError || !trackQuery.data) {
    const notFound = isAxiosError(trackQuery.error) && trackQuery.error.response?.status === 404;

    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <div className="mx-auto max-w-md px-4 py-12">
          <EmptyState
            illustration="empty-orders"
            title={notFound ? t("notFoundTitle") : tCommon("error")}
            description={notFound ? t("notFoundDescription") : t("loadError")}
            action={
              <>
                {!notFound ? (
                  <button type="button" className={appButton.secondary} onClick={() => void trackQuery.refetch()}>
                    <RefreshCw />
                    {tCommon("retry")}
                  </button>
                ) : null}
                <Link href={`/${locale}`} className={appButton.primary}>
                  {t("backHome")}
                </Link>
              </>
            }
          />
        </div>
      </div>
    );
  }

  const order = trackQuery.data;
  const areaName = locale.startsWith("ar") ? order.area_name_ar || order.area_name_en : order.area_name_en || order.area_name_ar;
  const serviceNameById = new Map(order.services.map((service) => [service.id, service.item_name]));
  const serviceStatuses = order.services.map((service) => service.status);
  const hasLab = order.services.some((service) => service.service_kind === "LAB");
  const appointments = [...order.appointments].sort(
    (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[15px]">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-5 sm:pt-10">
        <div className="flex items-center justify-between gap-3 px-1">
          <h1 className="text-[22px] font-bold text-foreground">{tApp("track.guestTitle")}</h1>
          <button
            type="button"
            aria-label={t("refresh")}
            onClick={() => void trackQuery.refetch()}
            disabled={trackQuery.isFetching}
            className="app-press inline-flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-[var(--app-card-border)] disabled:opacity-60"
          >
            <RefreshCw className={cn("h-5 w-5", trackQuery.isFetching && "animate-spin")} />
          </button>
        </div>

        <OrderStatusHero
          status={order.status}
          serviceStatuses={serviceStatuses}
          hasLab={hasLab}
          reference={order.reference}
          cancelReason={order.cancel_reason}
          meta={<p className="text-[13px] text-muted-foreground">{t("createdAt", { date: formatDateTime(order.created_at, "dd/MM/yyyy, HH:mm", locale) })}</p>}
        />

        {order.status !== "CANCELLED" ? (
          <AppCard className="p-5">
            <h2 className="text-[17px] font-bold text-foreground">{tApp("detail.progressTitle")}</h2>
            <div className="mt-4">
              <CaseProgress status={order.status} serviceStatuses={serviceStatuses} cancelReason={order.cancel_reason} />
            </div>
          </AppCard>
        ) : null}

        <AppCard className="p-5">
          <h2 className="text-[17px] font-bold text-foreground">{t("itemsTitle")}</h2>
          <ul className="mt-2 divide-y divide-[var(--app-card-border)]">
            {order.services.map((service) => (
              <li key={service.id} className="space-y-2 py-3.5 last:pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-foreground">{service.item_name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {getOrderItemTypeLabel({ type: service.item_type, serviceKind: service.service_kind }, tOrders)}
                      {service.provider_name ? ` · ${t("provider", { name: service.provider_name })}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatCurrency(service.bundle_price, locale)}</span>
                </div>
                <ServiceStatusBadge status={service.status} />
              </li>
            ))}
          </ul>
        </AppCard>

        <AppCard className="px-5 pb-2 pt-5">
          <h2 className="text-[17px] font-bold text-foreground">{tApp("detail.visitTitle")}</h2>
          <div className="mt-1 divide-y divide-[var(--app-card-border)]">
            <DetailRow icon={MapPin} label={tOrders("area.label")} value={areaName || "-"} />
            <DetailRow
              icon={CalendarClock}
              label={t("preferredTime")}
              value={order.scheduled_for ? formatDateTime(order.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : t("noPreferredTime")}
            />
            <div className="py-3">
              <p className="mb-2 text-[13px] text-muted-foreground">{t("appointmentsTitle")}</p>
              {appointments.length ? (
                <ul className="space-y-1.5">
                  {appointments.map((appointment) => (
                    <li
                      key={`${appointment.case_service_id}-${appointment.scheduled_at}`}
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f6f9f8] px-3 py-2 text-[14px] dark:bg-white/[0.04]"
                    >
                      <CalendarClock className="h-4 w-4 text-[#5a7a50]" />
                      <span className="font-semibold text-foreground">{serviceNameById.get(appointment.case_service_id) || "-"}</span>
                      <span className="text-muted-foreground">
                        {tOrders(`appointmentTypes.${appointment.type}`)} · {formatDateTime(appointment.scheduled_at, "dd/MM/yyyy, HH:mm", locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] leading-6 text-muted-foreground">{t("noAppointments")}</p>
              )}
            </div>
          </div>
        </AppCard>

        {order.invoice ? (
          <AppCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[17px] font-bold text-foreground">
                <Receipt className="h-5 w-5 text-[#5a7a50]" />
                {tApp("detail.paymentTitle")}
              </h2>
              <PaymentStatusBadge status={order.invoice.payment_status} size="md" />
            </div>
            <div className="mt-3 border-t border-[var(--app-card-border)] pt-2">
              <AmountRow label={t("total")} value={formatCurrency(order.invoice.final_amount, locale)} strong />
            </div>
          </AppCard>
        ) : null}

        <CliqPaymentCard caseStatus={order.status} invoice={order.invoice} reference={order.reference} />

        <AppCard className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#eef6f3] to-transparent p-5 dark:from-teal-500/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#104d49] text-white">
              <UserPlus className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[17px] font-bold text-foreground">{t("claimTitle")}</p>
            <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{t("claimDescription")}</p>
            {!hydrated ? null : isAuthenticated ? (
              <button type="button" className={cn(appButton.primary, "mt-4 w-full")} onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}>
                {claimMutation.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                {claimMutation.isPending ? t("claiming") : t("claimButton")}
              </button>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href={`/${locale}/login?redirect=${encodeURIComponent(trackingPath)}`} className={appButton.primary}>
                  {t("loginToClaim")}
                </Link>
                <Link href={`/${locale}/register?redirect=${encodeURIComponent(trackingPath)}`} className={appButton.secondary}>
                  {t("registerToClaim")}
                </Link>
              </div>
            )}
          </div>
        </AppCard>
      </div>
    </div>
  );
}
