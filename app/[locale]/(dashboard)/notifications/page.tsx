"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, ClipboardList, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationsApi } from "@/lib/api/notifications";
import { translateNotificationContent } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/utils";

export default function NotificationsPage() {
  const locale = useLocale();
  const tPage = useTranslations("notificationsPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["notifications", tab, page],
    queryFn: async () => (await notificationsApi.list({ page, limit: 20, unread_only: tab === "unread" })).data,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const rows = useMemo(() => (query.data?.data || []), [query.data?.data]);

  if (query.isLoading && !query.data) {
    return <AppPreloader variant="page" title={tPage("title")} description={tCommon("loading")} blockCount={4} />;
  }

  return (
    <div className="space-y-4" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tPage("title")}</h1>
        <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" onClick={() => markAll.mutate()}>
          <RefreshCw className="h-4 w-4" /> {tPage("markAllAsRead")}
        </button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "all" | "unread")} dir={locale === "ar" ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="all">{tPage("all")}</TabsTrigger>
          <TabsTrigger value="unread">{tPage("unread")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-2 pt-3">
          {rows.map((item: any) => {
            const localized = translateNotificationContent(item, tPage, tEnums);

            return (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-xl border p-3 text-start"
                onClick={async () => {
                  if (!item.is_read) await markOne.mutateAsync(item.id);
                  const data = item.data || {};
                  const requestId = (data.request_id || data.requestId) as string | undefined;
                  if (requestId) {
                    router.push(`/${locale}/requests/${requestId}`);
                  }
                }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <NotificationIcon type={item.type} />
                    <span className="font-medium">{localized.title}</span>
                    {!item.is_read ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, locale)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{localized.body}</p>
              </button>
            );
          })}

          {!query.isLoading && rows.length === 0 ? <p className="text-sm text-muted-foreground">{tPage("empty")}</p> : null}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="rounded-md border px-3 py-1 text-sm" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>{tCommon("prev")}</button>
            <span className="text-sm text-muted-foreground">{page}</span>
            <button className="rounded-md border px-3 py-1 text-sm" disabled={!rows.length} onClick={() => setPage((v) => v + 1)}>{tCommon("next")}</button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "REQUEST_CREATED" || type === "REQUEST_ASSIGNED") {
    return <ClipboardList className="h-4 w-4 text-blue-600" />;
  }
  if (type === "REPORT_PUBLISHED") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (type.startsWith("REQUEST_")) {
    return <RefreshCw className="h-4 w-4 text-amber-600" />;
  }
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

