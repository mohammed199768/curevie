"use client";

import { useState } from "react";
import { Check, Copy, Info, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AppCard, Illustration } from "@/components/app/ui";
import type { CaseStatus, PaymentStatus } from "@/lib/api/cases";
import { getCliqDue, usePublicSettings, type CliqInvoiceInput } from "@/lib/api/settings";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy failed");
}

function CopyField({
  label,
  value,
  copyLabel,
  emphasis = false,
}: {
  label: string;
  value: string;
  copyLabel: string;
  emphasis?: boolean;
}) {
  const t = useTranslations("app.cliq");
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      toast.success(t("copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl p-3 ps-4",
        emphasis ? "bg-[#104d49] text-white" : "bg-[#f3f7f5] dark:bg-white/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px]", emphasis ? "text-white/75" : "text-muted-foreground")}>{label}</p>
        <p
          dir="ltr"
          className={cn(
            "mt-0.5 truncate text-start font-bold tracking-wide rtl:text-end",
            emphasis ? "text-[20px]" : "text-[16px] text-foreground",
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void onCopy()}
        aria-label={`${copyLabel}: ${value}`}
        className={cn(
          "app-press inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold",
          emphasis
            ? "bg-white text-[#104d49] hover:bg-white/90"
            : "bg-card text-[#104d49] shadow-sm ring-1 ring-[#dbe6e0] hover:bg-[#f7faf9] dark:text-teal-200 dark:ring-border",
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("copiedShort") : copyLabel}
      </button>
    </div>
  );
}

/**
 * "Pay via CliQ" instructions (alias, beneficiary, bank, amount and the order reference for the transfer note).
 * Renders nothing when CliQ is off, the order is cancelled, or nothing is left to pay.
 * Payments are recorded by the Curevie team once received; nothing here is automated.
 */
export function CliqPaymentCard({
  caseStatus,
  invoice,
  reference,
  className,
}: {
  caseStatus: CaseStatus | null | undefined;
  invoice: (CliqInvoiceInput & { payment_status: PaymentStatus | null | undefined }) | null | undefined;
  reference: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("app.cliq");
  const settingsQuery = usePublicSettings();
  const cliq = settingsQuery.data?.cliq;
  const due = getCliqDue(caseStatus, invoice);

  if (!cliq || !due) return null;

  return (
    <AppCard className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-3 bg-gradient-to-br from-[#eef6f3] via-[#f6faf8] to-white px-5 pb-3 pt-5 dark:from-teal-500/10 dark:via-transparent dark:to-transparent">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-[#104d49] px-2.5 py-1 text-[12px] font-bold tracking-wide text-white">
            CliQ
          </span>
          <h2 className="mt-2 text-[20px] font-bold leading-tight text-foreground">{t("title")}</h2>
          <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Illustration name="payment-cliq" className="h-[96px] w-[90px] shrink-0" sizes="96px" />
      </div>

      <div className="space-y-3 px-5 pb-5 pt-2">
        {due.kind === "amount" ? (
          <div className="flex items-end justify-between gap-3 rounded-2xl border border-[#dbe6e0] px-4 py-3 dark:border-border">
            <span className="text-[14px] text-muted-foreground">{t("amountToPay")}</span>
            <span className="text-[22px] font-bold tabular-nums text-foreground">{formatCurrency(due.amount, locale)}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-2xl border border-[#dbe6e0] px-4 py-3 text-[14px] leading-6 text-foreground dark:border-border">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#104d49] dark:text-teal-200" />
            <span>{t("payRemaining")}</span>
          </div>
        )}

        <CopyField label={t("alias")} value={cliq.alias} copyLabel={t("copy")} emphasis />

        <dl className="divide-y divide-[#edf2f0] rounded-2xl bg-[#f3f7f5] px-4 dark:divide-white/5 dark:bg-white/5">
          {cliq.beneficiary_name ? (
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-[14px] text-muted-foreground">{t("beneficiary")}</dt>
              <dd className="text-end text-[15px] font-semibold text-foreground">{cliq.beneficiary_name}</dd>
            </div>
          ) : null}
          {cliq.bank_name ? (
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-[14px] text-muted-foreground">{t("bank")}</dt>
              <dd className="text-end text-[15px] font-semibold text-foreground">{cliq.bank_name}</dd>
            </div>
          ) : null}
        </dl>

        <CopyField label={t("reference")} value={reference} copyLabel={t("copy")} />
        <p className="px-1 text-[13px] leading-5 text-muted-foreground">{t("referenceHint")}</p>

        {cliq.note ? (
          <div className="rounded-2xl bg-[#fff8ea] px-4 py-3 text-[14px] leading-6 text-[#6b4a00] dark:bg-amber-500/10 dark:text-amber-100">
            {cliq.note}
          </div>
        ) : null}

        <p className="flex items-start gap-2 px-1 pt-1 text-[13px] leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5a7a50]" />
          {t("confirmation")}
        </p>
      </div>
    </AppCard>
  );
}
