"use client";

import {
  Activity,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Megaphone,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { EmptyState, IconBubble, Shimmer, appButton } from "@/components/app/ui";
import { notificationsApi } from "@/lib/api/notifications";
import type { ApiListResponse, NotificationItem } from "@/lib/api/types";
import { translateNotificationContent } from "@/lib/i18n";
import { getPatientNotificationHref } from "@/lib/notification-routing";
import { cn } from "@/lib/utils";

const LIMIT = 20;

type NotificationsResponse = ApiListResponse<NotificationItem>;

function getIcon(type: string) {
  if (type.startsWith("REQUEST") || type.startsWith("CASE") || type.startsWith("APPOINTMENT")) {
    return <IconBubble icon={Activity} tone="teal" />;
  }
  if (type.startsWith("PAYMENT") || type.startsWith("INVOICE")) {
    return <IconBubble icon={CreditCard} tone="sage" />;
  }
  if (type.startsWith("REPORT")) {
    return <IconBubble icon={FileText} tone="sky" />;
  }
  if (type.startsWith("POINTS") || type.startsWith("VIP") || type.startsWith("SERVICE_RATED")) {
    return <IconBubble icon={Star} tone="amber" />;
  }
  return <IconBubble icon={Megaphone} tone="stone" />;
}

function groupByDate(
  items: NotificationItem[],
  labels: { today: string; yesterday: string; earlier: string }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationItem[] }[] = [];
  const groupedItems: Record<string, NotificationItem[]> = {};

  for (const item of items) {
    const itemDate = new Date(item.created_at);
    itemDate.setHours(0, 0, 0, 0);

    let label = labels.earlier;
    if (itemDate.getTime() === today.getTime()) {
      label = labels.today;
    } else if (itemDate.getTime() === yesterday.getTime()) {
      label = labels.yesterday;
    }

    if (!groupedItems[label]) {
      groupedItems[label] = [];
      groups.push({ label, items: groupedItems[label] });
    }

    groupedItems[label].push(item);
  }

  return groups;
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 border-b border-[var(--app-card-border)] px-4 py-4 last:border-0">
      <Shimmer className="h-11 w-11 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const locale = useLocale();
  const t = useTranslations("notificationsPage");
  const tApp = useTranslations("app.notifications");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const queryClient = useQueryClient();
  const isRtl = locale === "ar";
  const dateFnsLocale = locale === "ar" ? ar : enUS;

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  const queryKey = ["notifications", tab, page];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      (await notificationsApi.list({
        page,
        limit: LIMIT,
        unread_only: tab === "unread",
      })).data as NotificationsResponse,
    staleTime: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(["notifications", "unread-count"], 0);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);
      const previousUnreadCount =
        queryClient.getQueryData<number>(["notifications", "unread-count"]) ?? unreadCount;

      queryClient.setQueryData<NotificationsResponse | undefined>(queryKey, (current) => {
        if (!current?.data) return current;

        return {
          ...current,
          unread_count: Math.max(0, Number(current.unread_count || 0) - 1),
          data: current.data.map((notification) =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification
          ),
        };
      });

      const targetNotification = previous?.data?.find(
        (notification) => notification.id === id
      );

      if (targetNotification && !targetNotification.is_read) {
        queryClient.setQueryData(
          ["notifications", "unread-count"],
          Math.max(0, Number(previousUnreadCount || 0) - 1)
        );
      }

      return { previous, previousUnreadCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }

      queryClient.setQueryData(
        ["notifications", "unread-count"],
        Number(context?.previousUnreadCount || 0)
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const totalPages = data?.pagination?.total_pages ?? data?.pagination?.pages ?? 1;
  const unreadCount = data?.unread_count ?? 0;
  const groups = groupByDate(notifications, {
    today: t("today"),
    yesterday: t("yesterday"),
    earlier: t("earlier"),
  });

  const handleClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        // Allow navigation to the target case even if read-state sync fails.
      }
    }

    const href = getPatientNotificationHref(notification, locale);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e9efed] p-1 dark:bg-white/5" role="tablist">
          {(["all", "unread"] as const).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={tab === tabKey}
              onClick={() => {
                setTab(tabKey);
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-xl px-5 text-[14px] font-semibold transition-colors",
                tab === tabKey ? "bg-card text-[#104d49] shadow-sm dark:text-teal-50" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tabKey)}
              {tabKey === "unread" && unreadCount > 0 ? (
                <span className="ms-1.5 rounded-full bg-[#104d49] px-1.5 py-0.5 text-[11px] font-bold text-white">{unreadCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            className="app-press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[#104d49] hover:bg-[#e6f0ee] disabled:opacity-50 dark:text-teal-200 dark:hover:bg-white/5"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            {t("markAllAsRead")}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="app-card overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          illustration="no-notifications"
          title={tab === "unread" ? t("emptyUnread") : t("empty")}
          description={tApp("emptyDescription")}
        />
      ) : (
        <div className="space-y-5">
          {groups.map(({ label, items }) => (
            <section key={label} className="space-y-2">
              <h2 className="px-1 text-[13px] font-bold text-muted-foreground">{label}</h2>
              <div className="app-card divide-y divide-[var(--app-card-border)] overflow-hidden">
                {items.map((notification) => {
                  const localized = translateNotificationContent(notification, t, tEnums);
                  const title = localized.title || notification.title;
                  const body = localized.body || notification.body;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        void handleClick(notification);
                      }}
                      className={cn(
                        "flex w-full gap-3 px-4 py-4 text-start transition-colors hover:bg-[#f7faf9] dark:hover:bg-white/5",
                        !notification.is_read && "bg-[#f2f8f6] dark:bg-teal-500/[0.07]",
                      )}
                    >
                      {getIcon(notification.type)}

                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[15px] leading-6", !notification.is_read ? "font-bold text-foreground" : "font-medium text-foreground/85")}>
                          {title}
                        </p>
                        {body && body !== title ? (
                          <p className="mt-0.5 line-clamp-2 text-[14px] leading-6 text-muted-foreground">{body}</p>
                        ) : null}
                        <p className="mt-1 text-[12.5px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateFnsLocale,
                          })}
                        </p>
                      </div>

                      {!notification.is_read ? (
                        <span className="mt-2 block h-2.5 w-2.5 shrink-0 rounded-full bg-[#86ab62]" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className={cn(appButton.secondary, "min-h-11 px-4")}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page === 1}
          >
            {isRtl ? <ChevronRight /> : <ChevronLeft />}
            {t("previous")}
          </button>

          <span className="text-[13px] text-muted-foreground">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            className={cn(appButton.secondary, "min-h-11 px-4")}
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            disabled={page >= totalPages}
          >
            {t("next")}
            {isRtl ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>
      ) : null}
    </div>
  );
}
