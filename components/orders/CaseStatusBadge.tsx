"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CaseServiceStatus, CaseStatus, PaymentStatus } from "@/lib/api/cases";

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const t = useTranslations("orders");
  return <StatusBadge value={status} label={t(`caseStatus.${status}`)} className={className} />;
}

export function ServiceStatusBadge({ status, className }: { status: CaseServiceStatus; className?: string }) {
  const t = useTranslations("orders");
  return <StatusBadge value={status} label={t(`serviceStatus.${status}`)} className={className} />;
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const t = useTranslations("orders");
  return <StatusBadge value={status === "PENDING" ? "UNPAID" : status} label={t(`paymentStatus.${status}`)} className={className} />;
}
