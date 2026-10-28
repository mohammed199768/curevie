"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CalendarClock, Loader2, MapPin, PackageCheck, RefreshCw, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaseProgress } from "@/components/orders/CaseProgress";
import { CaseStatusBadge, PaymentStatusBadge, ServiceStatusBadge } from "@/components/orders/CaseStatusBadge";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { getOrderItemTypeLabel } from "@/lib/order-items";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatDateTime } from "@/lib/utils";

// Guests have no socket; refresh the public view slowly while the page is open.
const TRACKING_REFETCH_INTERVAL_MS = 60_000;

export function TrackOrderView({ token }: { token: string }) {
  const locale = useLocale();
  const t = useTranslations("trackPage");
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
      <div className="mx-auto max-w-4xl px-4 py-10">
        <AppPreloader variant="page" title={t("title")} description={tCommon("loading")} blockCount={3} />
      </div>
    );
  }

  if (trackQuery.isError || !trackQuery.data) {
    const notFound = isAxiosError(trackQuery.error) && trackQuery.error.response?.status === 404;

    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="rounded-[1.75rem] text-center shadow-sm">
          <CardHeader>
            <CardTitle>{notFound ? t("notFoundTitle") : tCommon("error")}</CardTitle>
            <CardDescription>{notFound ? t("notFoundDescription") : t("loadError")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-2">
            {!notFound ? (
              <Button variant="outline" onClick={() => void trackQuery.refetch()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("retry")}
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/${locale}`}>{t("backHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = trackQuery.data;
  const areaName = locale.startsWith("ar") ? order.area_name_ar || order.area_name_en : order.area_name_en || order.area_name_ar;
  const serviceNameById = new Map(order.services.map((service) => [service.id, service.item_name]));
  const appointments = [...order.appointments].sort(
    (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:py-12">
      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("title")}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{tOrders("reference", { reference: order.reference })}</h1>
              <p className="text-sm text-muted-foreground">
                {t("createdAt", { date: formatDateTime(order.created_at, "dd/MM/yyyy, HH:mm", locale) })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CaseStatusBadge status={order.status} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("refresh")}
                onClick={() => void trackQuery.refetch()}
                disabled={trackQuery.isFetching}
              >
                <RefreshCw className={trackQuery.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>
          </div>

          <CaseProgress
            status={order.status}
            serviceStatuses={order.services.map((service) => service.status)}
            cancelReason={order.cancel_reason}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{tOrders("area.label")}</p>
              <p className="mt-1 text-sm font-semibold">{areaName || "-"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{t("preferredTime")}</p>
              <p className="mt-1 text-sm font-semibold">
                {order.scheduled_for ? formatDateTime(order.scheduled_for, "dd/MM/yyyy, HH:mm", locale) : t("noPreferredTime")}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><PackageCheck className="h-3.5 w-3.5" />{t("total")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{order.invoice ? formatCurrency(order.invoice.final_amount, locale) : "-"}</p>
                {order.invoice ? <PaymentStatusBadge status={order.invoice.payment_status} /> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("itemsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.services.map((service) => (
            <div key={service.id} className="flex flex-col gap-2 rounded-2xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{service.item_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getOrderItemTypeLabel({ type: service.item_type }, tOrders)}
                  {service.provider_name ? ` · ${t("provider", { name: service.provider_name })}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatCurrency(service.bundle_price, locale)}</span>
                <ServiceStatusBadge status={service.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("appointmentsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length ? (
            <ul className="space-y-2">
              {appointments.map((appointment) => (
                <li
                  key={`${appointment.case_service_id}-${appointment.scheduled_at}`}
                  className="flex flex-col gap-1 rounded-2xl border border-border/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{serviceNameById.get(appointment.case_service_id) || "-"}</span>
                  <span className="text-muted-foreground">
                    {tOrders(`appointmentTypes.${appointment.type}`)} · {formatDateTime(appointment.scheduled_at, "dd/MM/yyyy, HH:mm", locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t("claimTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("claimDescription")}</p>
          </div>
          {!hydrated ? null : isAuthenticated ? (
            <Button className="min-h-11 rounded-full" onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}>
              {claimMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {claimMutation.isPending ? t("claiming") : t("claimButton")}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-11 rounded-full">
                <Link href={`/${locale}/login?redirect=${encodeURIComponent(trackingPath)}`}>{t("loginToClaim")}</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 rounded-full">
                <Link href={`/${locale}/register?redirect=${encodeURIComponent(trackingPath)}`}>{t("registerToClaim")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
