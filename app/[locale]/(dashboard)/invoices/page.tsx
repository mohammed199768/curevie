"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppCard, EmptyState, ForwardChevron, ListSkeleton, PageIntro, appButton } from "@/components/app/ui";
import { PaymentStatusBadge } from "@/components/orders/CaseStatusBadge";
import { casesApi } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { getCaseReference, isolateLtr } from "@/lib/order-stage";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 9;

export default function InvoicesPage() {
  const locale = useLocale();
  const tPage = useTranslations("invoicesPage");
  const tNav = useTranslations("nav");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(1);

  // Invoices are released to patients when the case is closed; the list rows already carry the totals.
  const query = useQuery({
    queryKey: ["cases", "list", { page, limit: PAGE_SIZE, status: "CLOSED", view: "invoices" }],
    queryFn: () => casesApi.list({ page, limit: PAGE_SIZE, status: ["CLOSED"] }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.cases || [];
  const totalPages = Math.max(1, Math.ceil(Number(query.data?.total || 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageIntro title={tPage("title")} description={tPage("description")} className="hidden md:flex" />
      <p className="px-1 text-[14px] leading-6 text-muted-foreground md:hidden">{tPage("description")}</p>

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : query.isError && !query.data ? (
        <AppCard className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="text-[15px] text-rose-700 dark:text-rose-300">{tCommon("error")}</span>
          <button type="button" className={cn(appButton.secondary, "min-h-11")} onClick={() => void query.refetch()}>
            {tCommon("retry")}
          </button>
        </AppCard>
      ) : rows.length ? (
        <div className={cn("grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2", query.isFetching && query.isPlaceholderData && "opacity-60")}>
          {rows.map((item, index) => {
            const reference = getCaseReference(item.id);
            const itemNames = (item.item_names || []).filter(Boolean);
            const remaining = item.remaining_amount !== null ? Number(item.remaining_amount) : 0;
            const due = remaining > 0 && item.payment_status !== "PAID" && item.payment_status !== "CANCELLED";

            return (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.04 }}
                className="min-w-0"
              >
                <Link
                  href={`/${locale}/invoices/${item.id}`}
                  className="app-press app-card block overflow-hidden hover:shadow-[var(--app-shadow-lg)]"
                >
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-foreground">{itemNames.join("، ") || tCommon("service")}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {tOrders("reference", { reference: isolateLtr(reference) })} · {formatDateTime(item.updated_at || item.created_at, "dd/MM/yyyy", locale)}
                      </p>
                    </div>
                    <ForwardChevron className="mt-2 shrink-0 text-muted-foreground/60" />
                  </div>
                  <div className="flex items-end justify-between gap-3 px-4 pb-4">
                    <div>
                      <p className="text-[24px] font-bold leading-none tabular-nums text-foreground">{formatCurrency(item.final_amount ?? 0, locale)}</p>
                      {due ? (
                        <p className="mt-1.5 text-[13px] font-semibold text-[#8a5200] dark:text-amber-200">
                          {tPage("remaining", { amount: formatCurrency(item.remaining_amount, locale) })}
                        </p>
                      ) : null}
                    </div>
                    {item.payment_status ? <PaymentStatusBadge status={item.payment_status} size="md" /> : null}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          illustration="empty-orders"
          title={tPage("empty")}
          description={tPage("description")}
          action={
            <Link href={`/${locale}/requests`} className={appButton.secondary}>
              {tNav("requests")}
            </Link>
          }
        />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={cn(appButton.secondary, "min-h-11 px-4")} disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
            {tCommon("prev")}
          </button>
          <p className="text-[13px] text-muted-foreground">{tCommon("pageOf", { page, total: totalPages })}</p>
          <button
            type="button"
            className={cn(appButton.secondary, "min-h-11 px-4")}
            disabled={page >= totalPages}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
          >
            {tCommon("next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
