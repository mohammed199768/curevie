"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, Illustration } from "@/components/app/ui";
import type { CaseServiceStatus, CaseStatus } from "@/lib/api/cases";
import {
  countItemsReached,
  getOrderStageIndex,
  getStageIllustration,
  isolateLtr,
  ORDER_STAGES,
} from "@/lib/order-stage";
import { cn } from "@/lib/utils";

/**
 * Hero status card: current stage, a short explanation, a stage illustration and a segmented progress bar.
 * The stage is derived from the case status (which the backend derives from its line items).
 */
export function OrderStatusHero({
  status,
  serviceStatuses = [],
  hasLab = false,
  reference,
  cancelReason,
  meta,
  badge,
}: {
  status: CaseStatus;
  serviceStatuses?: CaseServiceStatus[];
  hasLab?: boolean;
  reference: string;
  cancelReason?: string | null;
  meta?: ReactNode;
  badge?: ReactNode;
}) {
  const t = useTranslations("app");
  const tOrders = useTranslations("orders");
  const reduceMotion = useReducedMotion();
  const index = getOrderStageIndex(status, serviceStatuses);

  if (index < 0) {
    return (
      <AppCard className="overflow-hidden">
        <div className="bg-[#fdf3f2] p-5 dark:bg-rose-500/10">
          <p className="text-[13px] font-semibold text-muted-foreground">{tOrders("reference", { reference: isolateLtr(reference) })}</p>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
              <XCircle className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[22px] font-bold leading-tight text-foreground">{tOrders("caseStatus.CANCELLED")}</h2>
              <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                {cancelReason ? tOrders("timeline.cancelledWithReason", { reason: cancelReason }) : tOrders("caseStatusHint.CANCELLED")}
              </p>
            </div>
          </div>
          {meta ? <div className="mt-4">{meta}</div> : null}
        </div>
      </AppCard>
    );
  }

  const stage = ORDER_STAGES[index];
  const illustration = getStageIllustration(index, hasLab);
  const isDone = stage === "CLOSED";

  return (
    <AppCard className="overflow-hidden">
      <div className="relative bg-gradient-to-b from-[#eef6f3] to-transparent px-5 pb-4 pt-5 dark:from-teal-500/10">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-muted-foreground" dir="auto">
                {tOrders("reference", { reference: isolateLtr(reference) })}
              </p>
              {badge}
            </div>
            <motion.h2
              key={stage}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 text-[24px] font-bold leading-tight text-[#0b3f3b] dark:text-teal-50"
            >
              {t(`stages.${stage}`)}
            </motion.h2>
            <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{t(`stageHints.${stage}`)}</p>
          </div>
          {illustration ? (
            <Illustration name={illustration} priority className="-mb-2 h-[118px] w-[104px] shrink-0 sm:h-[140px] sm:w-[124px]" sizes="140px" />
          ) : null}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={ORDER_STAGES.length} aria-valuenow={index + 1}>
          {ORDER_STAGES.map((item, stepIndex) => {
            const filled = stepIndex < index || isDone;
            const current = stepIndex === index && !isDone;
            return (
              <span key={item} className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#e3ebe8] dark:bg-white/10">
                {filled || current ? (
                  <motion.span
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, delay: stepIndex * 0.06 }}
                    className={cn(
                      "absolute inset-0 origin-left rounded-full rtl:origin-right",
                      current ? "bg-[#86ab62]" : "bg-[#104d49] dark:bg-teal-300",
                    )}
                  />
                ) : null}
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
          <span>{t("stepOf", { current: index + 1, total: ORDER_STAGES.length })}</span>
          {isDone ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#1c6e3d] dark:text-emerald-300">
              <Check className="h-4 w-4" />
              {t("allDone")}
            </span>
          ) : null}
        </div>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>
    </AppCard>
  );
}

/** Vertical stepper: Received → Provider assigned → On the way → In progress → Completed → Closed. */
export function CaseProgress({
  status,
  serviceStatuses = [],
  cancelReason,
}: {
  status: CaseStatus;
  serviceStatuses?: CaseServiceStatus[];
  cancelReason?: string | null;
}) {
  const t = useTranslations("app");
  const tOrders = useTranslations("orders");
  const index = getOrderStageIndex(status, serviceStatuses);

  if (index < 0) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-[#fdf3f2] p-4 text-[15px] text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="leading-6">
          {cancelReason ? tOrders("timeline.cancelledWithReason", { reason: cancelReason }) : tOrders("caseStatusHint.CANCELLED")}
        </p>
      </div>
    );
  }

  const total = serviceStatuses.filter((value) => value !== "CANCELLED").length;
  const isClosed = status === "CLOSED";

  return (
    <ol className="relative">
      {ORDER_STAGES.map((stage, stepIndex) => {
        const done = stepIndex < index || isClosed;
        const current = stepIndex === index && !isClosed;
        const last = stepIndex === ORDER_STAGES.length - 1;
        const reached = countItemsReached(stage, status, serviceStatuses);

        return (
          <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full",
                  done ? "bg-[#104d49] dark:bg-teal-300" : "bg-[#e3ebe8] dark:bg-white/10",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                done && "bg-[#104d49] text-white dark:bg-teal-300 dark:text-[#0b3f3b]",
                current && "bg-[#eef5e6] ring-2 ring-[#86ab62] dark:bg-lime-500/15",
                !done && !current && "border-2 border-[#e3ebe8] bg-card dark:border-white/10",
              )}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : current ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#86ab62] opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#5a7a50]" />
                </span>
              ) : null}
            </span>
            <div className="min-w-0 pt-1">
              <p
                className={cn(
                  "text-[15px] leading-6",
                  current ? "font-bold text-foreground" : done ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {t(`stages.${stage}`)}
              </p>
              {current ? <p className="mt-0.5 text-[14px] leading-6 text-muted-foreground">{t(`stageHints.${stage}`)}</p> : null}
              {total > 1 && (done || current) && stage !== "RECEIVED" && stage !== "CLOSED" ? (
                <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                  {tOrders("timeline.itemsReached", { count: reached, total })}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
