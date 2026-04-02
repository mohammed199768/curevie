"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { translateEnumValue } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  value?: string | null;
  className?: string;
}

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  ASSIGNED: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300",
  IN_PROGRESS: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300",
  PUBLISHED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300",
  PAID: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300",
  UNPAID: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300",
  PARTIAL: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  MEDICAL: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  LAB: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300",
  RADIOLOGY: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300",
  PACKAGE: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300",
  DOCTOR: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  NURSE: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300",
  LAB_TECH: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300",
  RADIOLOGY_TECH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300",
  NORMAL: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300",
  ABNORMAL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300",
  LOW: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  NO_RANGE: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300",
  AVAILABLE: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300",
  UNAVAILABLE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300",
};

export function StatusBadge({ value, className }: StatusBadgeProps) {
  const tEnums = useTranslations("enums");
  const normalized = (value || "UNKNOWN").toUpperCase();
  const label = translateEnumValue(normalized, tEnums);

  return (
    <Badge variant="outline" className={cn(statusClasses[normalized] ?? "", className)}>
      {label}
    </Badge>
  );
}
