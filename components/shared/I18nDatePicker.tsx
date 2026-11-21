"use client";

import { useLocale } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface I18nDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

/**
 * "YYYY-MM-DD" for a date value from the API. The API sends dates as timestamps at local midnight
 * (e.g. "1990-06-14T21:00:00.000Z" for 15 June in Amman), so those are read in the browser's time zone;
 * cutting the string would show the previous day.
 */
export function toDateOnlyValue(value?: string | null): string {
  if (!value) return "";
  if (!value.includes("T")) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(rawValue?: string) {
  const value = toDateOnlyValue(rawValue);
  if (!value) return { day: "", month: "", year: "" };
  const parts = value.split("-");
  return {
    year: parts[0] || "",
    month: parts[1] ? String(parseInt(parts[1])) : "",
    day: parts[2] ? String(parseInt(parts[2])) : "",
  };
}

function toIsoDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function I18nDatePicker({
  value,
  onChange,
  className,
  disabled,
}: I18nDatePickerProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const months = isRtl ? ARABIC_MONTHS : ENGLISH_MONTHS;

  // Partial picks (e.g. only the day) live here until all three parts are chosen; the parent only
  // receives a complete YYYY-MM-DD value (or "" when a complete value is cleared).
  const [parts, setParts] = useState(() => parseIsoDate(value));
  const lastReportedRef = useRef(value || "");

  // Follow the parent when it sets a different value (form reset, profile loaded), but ignore the echo
  // of what this picker reported itself.
  useEffect(() => {
    const next = value || "";
    if (next === lastReportedRef.current) return;
    lastReportedRef.current = next;
    setParts(parseIsoDate(next));
  }, [value]);

  const { day, month, year } = parts;

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= 1930; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  const daysInMonth = getDaysInMonth(parseInt(month), parseInt(year));
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleChange = (field: "day" | "month" | "year", val: string) => {
    const newDay = field === "day" ? val : day;
    const newMonth = field === "month" ? val : month;
    const newYear = field === "year" ? val : year;

    // Clamp day if month/year changes and day exceeds max
    let clampedDay = newDay;
    if (newMonth && newYear && newDay) {
      const maxDays = getDaysInMonth(parseInt(newMonth), parseInt(newYear));
      if (parseInt(newDay) > maxDays) {
        clampedDay = String(maxDays);
      }
    }

    setParts({ day: clampedDay, month: newMonth, year: newYear });

    const iso = toIsoDate(clampedDay, newMonth, newYear);
    if (iso !== lastReportedRef.current) {
      lastReportedRef.current = iso;
      onChange(iso);
    }
  };

  const selectClass = cn(
    "h-12 w-full rounded-2xl border border-[#dbe6e0] bg-card px-3 py-2 dark:border-border",
    "text-[16px] ring-offset-background",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "appearance-none cursor-pointer",
    !(day || month || year) && "text-muted-foreground"
  );

  const dayPlaceholder = isRtl ? "اليوم" : "Day";
  const monthPlaceholder = isRtl ? "الشهر" : "Month";
  const yearPlaceholder = isRtl ? "السنة" : "Year";

  // Order: Day | Month | Year (same for both RTL and LTR — just flex-direction handles it)
  return (
    <div
      className={cn(
        "flex gap-2",
        isRtl ? "flex-row-reverse" : "flex-row",
        className
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Day */}
      <div className="relative flex-1">
        <select
          disabled={disabled}
          value={day}
          onChange={(e) => handleChange("day", e.target.value)}
          className={selectClass}
          aria-label={dayPlaceholder}
        >
          <option value="" disabled>
            {dayPlaceholder}
          </option>
          {days.map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Month */}
      <div className="relative flex-[2]">
        <select
          disabled={disabled}
          value={month}
          onChange={(e) => handleChange("month", e.target.value)}
          className={selectClass}
          aria-label={monthPlaceholder}
        >
          <option value="" disabled>
            {monthPlaceholder}
          </option>
          {months.map((name, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div className="relative flex-[1.5]">
        <select
          disabled={disabled}
          value={year}
          onChange={(e) => handleChange("year", e.target.value)}
          className={selectClass}
          aria-label={yearPlaceholder}
        >
          <option value="" disabled>
            {yearPlaceholder}
          </option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
