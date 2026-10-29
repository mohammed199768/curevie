"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ScheduleMode = "asap" | "pick";

const FIRST_HOUR = 8;
const LAST_HOUR = 21;
const DAYS_AHEAD = 7;
const LEAD_MINUTES = 30;

const pad = (value: number) => String(value).padStart(2, "0");

function toInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Slots (local time) for one day; past slots (and those within the lead time) are flagged unavailable. */
function buildSlots(day: Date) {
  const earliest = Date.now() + LEAD_MINUTES * 60_000;
  const slots: Array<{ value: string; date: Date; available: boolean }> = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
    const slot = new Date(day);
    slot.setHours(hour, 0, 0, 0);
    slots.push({ value: toInputValue(slot), date: slot, available: slot.getTime() > earliest });
  }
  return slots;
}

/**
 * Visit time picker. The value keeps the existing `datetime-local` format (YYYY-MM-DDTHH:mm, local time)
 * so the order form validation and the ISO conversion stay unchanged; "" means "as soon as possible".
 */
export function SchedulePicker({
  mode,
  onModeChange,
  value,
  onChange,
  invalid,
}: {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  value?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("app.newOrder");

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return { key: dayKey(date), date, slots: buildSlots(date) };
    });
  }, []);

  const firstOpenDay = days.find((day) => day.slots.some((slot) => slot.available))?.key || days[0].key;
  const [selectedDay, setSelectedDay] = useState(() => (value ? value.slice(0, 10) : firstOpenDay));
  const activeDay = days.find((day) => day.key === selectedDay) || days[0];

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });

  const dayLabel = (index: number, date: Date) => (index === 0 ? t("today") : index === 1 ? t("tomorrow") : weekday.format(date));
  const availableSlots = activeDay.slots.filter((slot) => slot.available);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
        {([
          { key: "asap", icon: Zap, title: t("asap"), hint: t("asapHint") },
          { key: "pick", icon: CalendarDays, title: t("pickTime"), hint: t("pickTimeHint") },
        ] as const).map((option) => {
          const active = mode === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                onModeChange(option.key);
                if (option.key === "asap") onChange("");
              }}
              className={cn(
                "app-press flex min-h-[92px] flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-start transition-colors",
                active
                  ? "border-[#104d49] bg-[#f0f7f5] ring-1 ring-[#104d49] dark:border-teal-300 dark:bg-teal-500/10 dark:ring-teal-300"
                  : "border-[#dbe6e0] bg-card hover:border-[#bcd2ca] dark:border-border",
              )}
            >
              <option.icon className={cn("h-5 w-5", active ? "text-[#104d49] dark:text-teal-200" : "text-muted-foreground")} />
              <span className="text-[15px] font-bold text-foreground">{option.title}</span>
              <span className="text-[12.5px] leading-4 text-muted-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {mode === "pick" ? (
        <div className="space-y-4">
          <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
            <div className="flex w-max gap-2 pb-1">
              {days.map((day, index) => {
                const active = day.key === activeDay.key;
                const disabled = !day.slots.some((slot) => slot.available);
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDay(day.key);
                      if (value && value.slice(0, 10) !== day.key) onChange("");
                    }}
                    className={cn(
                      "app-press flex min-h-[64px] w-[74px] flex-col items-center justify-center rounded-2xl border text-center transition-colors disabled:opacity-40",
                      active
                        ? "border-[#104d49] bg-[#104d49] text-white dark:border-teal-300 dark:bg-teal-300 dark:text-[#0b3f3b]"
                        : "border-[#dbe6e0] bg-card text-foreground hover:border-[#bcd2ca] dark:border-border",
                    )}
                  >
                    <span className={cn("text-[12.5px] font-semibold", active ? "text-white/85 dark:text-[#0b3f3b]" : "text-muted-foreground")}>
                      {dayLabel(index, day.date)}
                    </span>
                    <span className="mt-0.5 text-[14px] font-bold">{dayNumber.format(day.date)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-foreground">{t("timeTitle")}</p>
            {availableSlots.length ? (
              <div className={cn("grid grid-cols-3 gap-2 rounded-2xl sm:grid-cols-4", invalid && "ring-2 ring-rose-200 ring-offset-4 ring-offset-card dark:ring-rose-500/30")}>
                {availableSlots.map((slot) => {
                  const active = value === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => onChange(slot.value)}
                      aria-pressed={active}
                      className={cn(
                        "app-press min-h-12 rounded-xl border text-[14px] font-semibold tabular-nums transition-colors",
                        active
                          ? "border-[#86ab62] bg-[#eef5e6] text-[#3f5f28] ring-1 ring-[#86ab62] dark:bg-lime-500/15 dark:text-lime-100"
                          : "border-[#dbe6e0] bg-card text-foreground hover:border-[#bcd2ca] dark:border-border",
                      )}
                    >
                      {timeFormat.format(slot.date)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl bg-[#f3f7f5] px-4 py-3 text-[14px] text-muted-foreground dark:bg-white/5">{t("noSlots")}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
