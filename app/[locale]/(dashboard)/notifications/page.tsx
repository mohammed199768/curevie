"use client";

import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  FileText,
  CreditCard,
  Star,
  Activity,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { notificationsApi } from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LIMIT = 20;

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: { request_id?: string; requestId?: string } | null;
};

type NotificationsResponse = {
  data: NotificationItem[];
  pagination?: { total_pages?: number; pages?: number };
  unread_count?: number;
};

function getIcon(type: string) {
  if (type.startsWith("REQUEST")) return <Activity className="h-5 w-5 text-blue-500" />;
  if (type.startsWith("PAYMENT") || type.startsWith("INVOICE")) return <CreditCard className="h-5 w-5 text-green-500" />;
  if (type.startsWith("REPORT")) return <FileText className="h-5 w-5 text-purple-500" />;
  if (type.startsWith("POINTS")) return <Star className="h-5 w-5 text-yellow-500" />;
  return <Megaphone className="h-5 w-5 text-muted-foreground" />;
}

function groupByDate(items: NotificationItem[], locale: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayLabel = locale === "ar" ? "اليوم" : "Today";
  const yesterdayLabel = locale === "ar" ? "أمس" : "Yesterday";
  const earlierLabel = locale === "ar" ? "سابقاً" : "Earlier";

  const groups: { label: string; items: NotificationItem[] }[] = [];
  const map: Record<string, NotificationItem[]> = {};

  for (const item of items) {
    const d = new Date(item.created_at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = todayLabel;
    else if (d.getTime() === yesterday.getTime()) label = yesterdayLabel;
    else label = earlierLabel;

    if (!map[label]) {
      map[label] = [];
      groups.push({ label, items: map[label] });
    }
    map[label].push(item);
  }

  return groups;
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 border-b px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const locale = useLocale();
  const t = useTranslations("notificationsPage");
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
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);

      queryClient.setQueryData<NotificationsResponse | undefined>(queryKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          unread_count: Math.max(0, Number(old.unread_count || 0) - 1),
          data: old.data.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const totalPages = data?.pagination?.total_pages ?? data?.pagination?.pages ?? 1;
  const unreadCount = data?.unread_count ?? 0;
  const groups = groupByDate(notifications, locale);

  const handleClick = (n: NotificationItem) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    const requestId = n.data?.request_id ?? n.data?.requestId;
    if (requestId) {
      router.push(`/${locale}/requests/${requestId}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t("title")}</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="me-1 h-3.5 w-3.5" />
            {t("markAllAsRead")}
          </Button>
        )}
      </div>

      <div className="mb-4 w-fit rounded-lg bg-muted p-1">
        <div className="flex gap-1">
          {(["all", "unread"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => {
                setTab(tabKey);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === tabKey
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tabKey === "all"
                ? (locale === "ar" ? "الكل" : "All")
                : (locale === "ar" ? "غير مقروء" : "Unread")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {tab === "unread"
                ? (locale === "ar" ? "لا توجد إشعارات غير مقروءة" : "No unread notifications")
                : (locale === "ar" ? "لا توجد إشعارات" : "No notifications yet")}
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label}>
              <div className="sticky top-0 z-10 bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                {label}
              </div>

              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full border-b px-4 py-3.5 text-start transition-colors last:border-0 hover:bg-accent",
                    !n.is_read && "bg-primary/5",
                  )}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getIcon(n.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !n.is_read ? "font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && n.body !== n.title && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: dateFnsLocale,
                        })}
                      </p>
                    </div>

                    {!n.is_read && (
                      <div className="mt-2 shrink-0">
                        <span className="block h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {locale === "ar" ? "السابق" : "Previous"}
          </Button>

          <span className="text-sm text-muted-foreground">
            {locale === "ar"
              ? `${page} من ${totalPages}`
              : `${page} of ${totalPages}`}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            {locale === "ar" ? "التالي" : "Next"}
            {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
