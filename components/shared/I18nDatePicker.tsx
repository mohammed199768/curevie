"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, isValid } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface I18nDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parseIsoDate(value?: string) {
  if (!value) return undefined;
  // Handle both Date only "2024-01-01" and DateTime "2024-01-01T12:00:00" formats gracefully
  const dateStr = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function I18nDatePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: I18nDatePickerProps) {
  const locale = useLocale();
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const t = useTranslations("common"); // Assume there's a clear/cancel translation

  const dateFnsLocale = locale === "ar" ? ar : enUS;
  const isRtl = locale === "ar";
  const displayFormat = locale === "ar" ? "d MMMM yyyy" : "MMM d, yyyy";
  const defaultPlaceholder = placeholder || (locale === "ar" ? "اختر التاريخ" : "Pick a date");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal text-start",
            !value && "text-muted-foreground",
            className
          )}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <span className="truncate">
            {selected && isValid(selected)
              ? format(selected, displayFormat, { locale: dateFnsLocale })
              : defaultPlaceholder}
          </span>
          <CalendarIcon className={cn("h-4 w-4 opacity-70", isRtl ? "ml-0 mr-2" : "ml-2 mr-0")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" dir={isRtl ? "rtl" : "ltr"}>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : "");
            setOpen(false);
          }}
          locale={dateFnsLocale}
          dir={isRtl ? "rtl" : "ltr"}
          showOutsideDays
          className="text-sm"
          classNames={{
            months: "flex flex-col space-y-4",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              "border border-input rounded-md flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            disabled={!value}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t("clear") || "Clear"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
