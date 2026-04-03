"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationItem } from "@/lib/api/types";
import { translateNotificationContent } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  unreadCount: number;
}

function groupByDate(items: NotificationItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, NotificationItem[]> = {};

  for (const item of items) {
    const d = new Date(item.created_at);
    d.setHours(0, 0, 0, 0);
    let label: string;

    if (d.getTime() === today.getTime()) {
      label = "__today__";
    } else if (d.getTime() === yesterday.getTime()) {
      label = "__yesterday__";
    } else {
      label = "__older__";
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return groups;
}

export function NotificationDropdown({
  unreadCount,
}: NotificationDropdownProps) {
  const locale = useLocale();
  const t = useTranslations("notificationsPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dateFnsLocale = locale === "ar" ? ar : enUS;
  const isRtl = locale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "dropdown"],
    queryFn: async () => (await notificationsApi.list({ page: 1, limit: 8 })).data,
    enabled: open,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const groups = groupByDate(notifications);

  const groupLabel = (key: string) => {
    if (key === "__today__") return locale === "ar" ? "اليوم" : "Today";
    if (key === "__yesterday__") return locale === "ar" ? "أمس" : "Yesterday";
    return locale === "ar" ? "سابقاً" : "Earlier";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11"
          aria-label={t("title")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white",
                isRtl ? "-left-0.5" : "-right-0.5",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isRtl ? "start" : "end"}
        className="w-80 max-w-[calc(100vw-1rem)] overflow-hidden p-0"
      >
        <div dir={isRtl ? "rtl" : "ltr"}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-sm">{t("title")}</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                <CheckCheck className={cn("h-3.5 w-3.5", isRtl ? "ml-1" : "mr-1")} />
                {t("markAllAsRead")}
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {tCommon("loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              </div>
            ) : (
              Object.entries(groups).map(([groupKey, items]) => (
                <div key={groupKey}>
                  <div className="sticky top-0 bg-muted/40 px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
                    {groupLabel(groupKey)}
                  </div>
                  {items.map((n) => {
                    const localized = translateNotificationContent(n, t, tEnums);

                    return (
                      <button
                        key={n.id}
                        className={cn(
                          "flex min-h-12 w-full gap-3 border-b px-4 py-3 text-start transition-colors hover:bg-accent last:border-0",
                          !n.is_read && "bg-primary/5",
                        )}
                        onClick={() => {
                          if (!n.is_read) {
                            markReadMutation.mutate(n.id);
                          }
                          setOpen(false);
                        }}
                      >
                        <div className="mt-1.5 shrink-0">
                          {!n.is_read ? (
                            <span className="block h-2 w-2 rounded-full bg-primary" />
                          ) : (
                            <span className="block h-2 w-2 rounded-full bg-transparent" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "line-clamp-2 text-sm leading-snug",
                              !n.is_read ? "font-medium" : "text-muted-foreground",
                            )}
                          >
                            {localized.title || localized.body || n.title || n.body}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: dateFnsLocale,
                            })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="border-t">
            <Link
              href={`/${locale}/notifications`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center py-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              {locale === "ar" ? "عرض كل الإشعارات" : "View all notifications"}
            </Link>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
