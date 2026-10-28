"use client";

import { Check, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CaseServiceStatus, CaseStatus } from "@/lib/api/cases";
import { cn } from "@/lib/utils";

const STEPS: Exclude<CaseStatus, "CANCELLED">[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED"];

/**
 * Order progress derived from the case status (which the backend derives from its line items),
 * with a per-step count of line items that already reached that stage.
 */
export function CaseProgress({
  status,
  serviceStatuses = [],
  cancelReason,
}: {
  status: CaseStatus;
  serviceStatuses?: CaseServiceStatus[];
  cancelReason?: string | null;
}) {
  const t = useTranslations("orders");

  if (status === "CANCELLED") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{t("caseStatus.CANCELLED")}</p>
          <p className="mt-1 leading-6">{cancelReason ? t("timeline.cancelledWithReason", { reason: cancelReason }) : t("caseStatusHint.CANCELLED")}</p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);
  const activeServices = serviceStatuses.filter((value) => value !== "CANCELLED");
  const total = activeServices.length;
  const countReached: Record<(typeof STEPS)[number], number> = {
    PENDING: total,
    ACCEPTED: activeServices.filter((value) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(value)).length,
    IN_PROGRESS: activeServices.filter((value) => ["IN_PROGRESS", "COMPLETED"].includes(value)).length,
    COMPLETED: activeServices.filter((value) => value === "COMPLETED").length,
    CLOSED: status === "CLOSED" ? total : 0,
  };

  return (
    <div className="space-y-3">
      <ol className="grid gap-3 sm:grid-cols-5">
        {STEPS.map((step, index) => {
          const done = index < currentIndex || status === "CLOSED";
          const current = index === currentIndex && status !== "CLOSED";

          return (
            <li
              key={step}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3 sm:flex-col sm:items-start",
                done && "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/10",
                current && "border-primary/40 bg-primary/5",
                !done && !current && "border-border/70 bg-background/80 opacity-80",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  current && "border-primary bg-primary text-primary-foreground",
                  !done && !current && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(`caseStatus.${step}`)}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t(`caseStatusHint.${step}`)}</p>
                {total > 1 && step !== "PENDING" && step !== "CLOSED" && (done || current) ? (
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {t("timeline.itemsReached", { count: countReached[step], total })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
