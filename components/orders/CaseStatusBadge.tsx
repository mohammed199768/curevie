"use client";

import { useTranslations } from "next-intl";
import type { CaseServiceStatus, CaseStatus, PaymentStatus } from "@/lib/api/cases";
import { cn } from "@/lib/utils";

type Tone = "amber" | "teal" | "sage" | "green" | "stone" | "rose" | "sky" | "violet";

const TONES: Record<Tone, { pill: string; dot: string }> = {
  amber: { pill: "bg-[#fff4e0] text-[#8a5200] dark:bg-amber-500/15 dark:text-amber-200", dot: "bg-[#f0a020]" },
  teal: { pill: "bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-200", dot: "bg-[#104d49] dark:bg-teal-300" },
  sage: { pill: "bg-[#eef5e6] text-[#476a2f] dark:bg-lime-500/15 dark:text-lime-200", dot: "bg-[#86ab62]" },
  green: { pill: "bg-[#e5f5ea] text-[#1c6e3d] dark:bg-emerald-500/15 dark:text-emerald-200", dot: "bg-[#22a05a]" },
  stone: { pill: "bg-[#eff1f1] text-[#545c5f] dark:bg-white/10 dark:text-slate-200", dot: "bg-[#9c9fa2]" },
  rose: { pill: "bg-[#fdecec] text-[#a8261b] dark:bg-rose-500/15 dark:text-rose-200", dot: "bg-[#e5484d]" },
  sky: { pill: "bg-[#e8f1fb] text-[#1d5fa8] dark:bg-sky-500/15 dark:text-sky-200", dot: "bg-[#3b82d6]" },
  violet: { pill: "bg-[#f1ecfb] text-[#5b3aa8] dark:bg-violet-500/15 dark:text-violet-200", dot: "bg-[#7c5cd6]" },
};

const CASE_TONES: Record<CaseStatus, Tone> = {
  PENDING: "amber",
  ACCEPTED: "teal",
  IN_PROGRESS: "sage",
  COMPLETED: "green",
  CLOSED: "stone",
  CANCELLED: "rose",
};

const SERVICE_TONES: Record<CaseServiceStatus, Tone> = {
  PENDING: "amber",
  ASSIGNED: "violet",
  ACCEPTED: "teal",
  IN_PROGRESS: "sage",
  COMPLETED: "green",
  CANCELLED: "rose",
};

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  PENDING: "amber",
  PARTIAL: "sky",
  PAID: "green",
  CANCELLED: "stone",
};

export function StatusPill({
  tone,
  label,
  className,
  size = "md",
}: {
  tone: Tone;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const palette = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
        palette.pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", palette.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

export function CaseStatusBadge({ status, className, size }: { status: CaseStatus; className?: string; size?: "sm" | "md" }) {
  const t = useTranslations("orders");
  return <StatusPill tone={CASE_TONES[status] || "stone"} label={t(`caseStatus.${status}`)} className={className} size={size} />;
}

export function ServiceStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: CaseServiceStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("orders");
  return <StatusPill tone={SERVICE_TONES[status] || "stone"} label={t(`serviceStatus.${status}`)} className={className} size={size} />;
}

export function PaymentStatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: PaymentStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("orders");
  return <StatusPill tone={PAYMENT_TONES[status] || "stone"} label={t(`paymentStatus.${status}`)} className={className} size={size} />;
}
