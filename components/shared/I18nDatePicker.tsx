"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
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

function parseIsoDate(value?: string) {
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

  const { day, month, year } = parseIsoDate(value);

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

    onChange(toIsoDate(clampedDay, newMonth, newYear));
  };

  const selectClass = cn(
    "h-11 w-full rounded-md border border-input bg-background px-3 py-2",
    "text-sm ring-offset-background",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "appearance-none cursor-pointer",
    !value && "text-muted-foreground"
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
