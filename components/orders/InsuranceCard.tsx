"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Hourglass, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AmountRow, AppCard, appButton } from "@/components/app/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { casesApi, type CaseInsurance, type InsuranceStatus } from "@/lib/api/cases";
import { formatCurrency } from "@/lib/formatting";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { isolateLtr } from "@/lib/order-stage";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<InsuranceStatus, { icon: typeof Hourglass; className: string }> = {
  SUBMITTED: { icon: Hourglass, className: "bg-[#fff4e0] text-[#8a5200] dark:bg-amber-500/15 dark:text-amber-200" },
  QUOTED: { icon: ShieldCheck, className: "bg-[#e8f1fb] text-[#1d5fa8] dark:bg-sky-500/15 dark:text-sky-200" },
  APPROVED: { icon: CheckCircle2, className: "bg-[#e5f5ea] text-[#1c6e3d] dark:bg-emerald-500/15 dark:text-emerald-200" },
  DECLINED: { icon: XCircle, className: "bg-[#fdecec] text-[#b42318] dark:bg-rose-500/15 dark:text-rose-200" },
  CANCELLED: { icon: XCircle, className: "bg-[#eff1f1] text-[#5b6366] dark:bg-white/10 dark:text-slate-200" },
};

/**
 * Insurance lab request on the order page, in plain words: the lab is reviewing the card, then what the
 * insurance covers and what is left to pay (tests share + home visit) with Approve / Decline, then the result.
 */
export function InsuranceCard({
  caseId,
  insurance,
  canDecide,
  reference,
  className,
}: {
  caseId: string;
  insurance: CaseInsurance;
  /** case_actions.can_decide_insurance */
  canDecide: boolean;
  /** "#482913": the order number the patient writes in the transfer note. */
  reference: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("insurance");
  const tOrders = useTranslations("orders");
  const queryClient = useQueryClient();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  const applyView = (view: Awaited<ReturnType<typeof casesApi.approveInsurance>>) => {
    queryClient.setQueryData(["cases", "detail", caseId], view);
    void queryClient.invalidateQueries({ queryKey: ["cases"] });
  };
  const onError = (error: unknown) => {
    toast.error(getOrderErrorMessage(error, tOrders));
    void queryClient.invalidateQueries({ queryKey: ["cases", "detail", caseId] });
  };

  const approveMutation = useMutation({
    mutationFn: () => casesApi.approveInsurance(caseId),
    onSuccess: (view) => {
      toast.success(t("card.approveSuccess"));
      applyView(view);
    },
    onError,
  });

  const declineMutation = useMutation({
    mutationFn: () => casesApi.declineInsurance(caseId, reason),
    onSuccess: (view) => {
      toast.success(t("card.declineSuccess"));
      applyView(view);
      setDeclineOpen(false);
      setReason("");
    },
    onError,
  });

  const status: InsuranceStatus = insurance.status in STATUS_STYLES ? insurance.status : "SUBMITTED";
  const { icon: StatusIcon, className: statusClass } = STATUS_STYLES[status];
  const hasQuote = insurance.amount_to_pay !== null && insurance.amount_to_pay !== undefined;
  const busy = approveMutation.isPending || declineMutation.isPending;

  return (
    <AppCard className={cn("overflow-hidden", className)}>
      <div className="flex items-start gap-3 px-5 pb-1 pt-5">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", statusClass)}>
          <StatusIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-muted-foreground">{t("card.title")}</p>
          <h2 className="mt-0.5 text-[19px] font-bold leading-7 text-foreground">{t(`status.${status}.title`)}</h2>
          <p className="mt-1 text-[14.5px] leading-6 text-muted-foreground">{t(`status.${status}.description`)}</p>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-3">
        {(status === "QUOTED" || status === "APPROVED") && insurance.tests_description ? (
          <div className="rounded-2xl bg-[#f6f9f8] px-4 py-3 dark:bg-white/[0.04]">
            <p className="text-[13px] font-semibold text-muted-foreground">{t("card.testsTitle")}</p>
            <p dir="auto" className="mt-1 whitespace-pre-wrap break-words text-start text-[15px] leading-6 text-foreground">{insurance.tests_description}</p>
            {insurance.quote_notes ? (
              <p className="mt-2 whitespace-pre-wrap break-words border-t border-[var(--app-card-border)] pt-2 text-[14px] leading-6 text-muted-foreground">
                {t("card.labNote", { note: insurance.quote_notes })}
              </p>
            ) : null}
          </div>
        ) : null}

        {(status === "QUOTED" || status === "APPROVED") && hasQuote ? (
          <div className="rounded-2xl border border-[var(--app-card-border)] px-4 py-2">
            <AmountRow label={t("card.patientAmount")} value={formatCurrency(insurance.patient_amount, locale)} />
            <AmountRow label={t("card.homeVisitFee")} value={formatCurrency(insurance.home_visit_fee, locale)} />
            <div className="mt-1 border-t border-[var(--app-card-border)] pt-1">
              <AmountRow label={t("card.amountToPay")} value={formatCurrency(insurance.amount_to_pay, locale)} strong />
            </div>
          </div>
        ) : null}

        {status === "QUOTED" && canDecide ? (
          <>
            <p className="px-1 text-[13.5px] leading-5 text-muted-foreground">{t("card.decideHint")}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" className={appButton.primary} disabled={busy} onClick={() => approveMutation.mutate()}>
                {approveMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                {t("card.approve")}
              </button>
              <button type="button" className={appButton.danger} disabled={busy} onClick={() => setDeclineOpen(true)}>
                <XCircle />
                {t("card.decline")}
              </button>
            </div>
          </>
        ) : null}

        {status === "APPROVED" ? (
          <p className="rounded-2xl bg-[#eef5e6] px-4 py-3 text-[14.5px] leading-6 text-[#3d5a2c] dark:bg-lime-500/10 dark:text-lime-100">
            {t("card.payHint", { reference: isolateLtr(reference) })}
          </p>
        ) : null}
      </div>

      <AlertDialog open={declineOpen} onOpenChange={(open) => !declineMutation.isPending && setDeclineOpen(open)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[24px] p-6">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("card.declineTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("card.declineDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            className="rounded-2xl text-[16px]"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("card.declineReasonPlaceholder")}
            aria-label={t("card.declineReasonPlaceholder")}
          />
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="min-h-12 rounded-2xl" disabled={declineMutation.isPending}>
              {t("card.declineKeep")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="min-h-12 rounded-2xl"
              disabled={declineMutation.isPending}
              onClick={() => declineMutation.mutate()}
            >
              {declineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("card.declineConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppCard>
  );
}
