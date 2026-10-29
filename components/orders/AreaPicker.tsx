"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ForwardChevron } from "@/components/app/ui";
import { useAreas } from "@/components/orders/AreaSelect";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAreaLabel } from "@/lib/api/areas";
import { cn } from "@/lib/utils";

/** Tap-friendly area picker: a summary row that opens a searchable bottom sheet (fed by GET /areas). */
export function AreaPicker({
  value,
  onChange,
  invalid,
  id,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("app.newOrder");
  const tOrders = useTranslations("orders");
  const areasQuery = useAreas();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const areas = useMemo(() => areasQuery.data || [], [areasQuery.data]);
  const selected = areas.find((area) => area.id === value) || null;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return areas;
    return areas.filter((area) => `${area.name_ar} ${area.name_en} ${area.city || ""}`.toLowerCase().includes(term));
  }, [areas, search]);

  const placeholder = areasQuery.isLoading
    ? tOrders("area.loading")
    : areasQuery.isError
      ? tOrders("area.loadError")
      : t("areaChoose");

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        disabled={areasQuery.isLoading || areasQuery.isError}
        onClick={() => setOpen(true)}
        className={cn(
          "app-press flex min-h-[64px] w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-start transition-colors disabled:opacity-60",
          invalid ? "border-rose-400 ring-2 ring-rose-100 dark:ring-rose-500/20" : "border-[#dbe6e0] hover:border-[#bcd2ca] dark:border-border",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-muted-foreground">{tOrders("area.label")}</span>
          <span className={cn("block truncate text-[16px] font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>
            {selected ? getAreaLabel(selected, locale) : placeholder}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[14px] font-semibold text-[#104d49] dark:text-teal-200">
          {selected ? t("change") : null}
          <ForwardChevron className="h-4 w-4" />
        </span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <SheetContent
          side="bottom"
          className="z-[200] mx-auto flex max-h-[86dvh] w-full max-w-lg flex-col gap-0 rounded-t-[28px] p-0"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[#dbe6e0] dark:bg-white/15" aria-hidden="true" />
          <SheetHeader className="px-5 pb-3 pt-3 text-start">
            <SheetTitle className="text-[19px] font-bold">{t("areaSheetTitle")}</SheetTitle>
            <SheetDescription className="sr-only">{tOrders("area.placeholder")}</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("areaSearch")}
                className="h-12 w-full rounded-2xl border-0 bg-[#f1f5f4] pe-4 ps-12 text-[16px] outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2 dark:bg-white/5"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]" role="listbox">
            {filtered.length ? (
              filtered.map((area) => {
                const active = area.id === value;
                return (
                  <button
                    key={area.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(area.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3 text-start text-[16px] transition-colors",
                      active ? "bg-[#e6f0ee] font-bold text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100" : "hover:bg-[#f5f8f7] dark:hover:bg-white/5",
                    )}
                  >
                    <MapPin className={cn("h-5 w-5 shrink-0", active ? "text-[#104d49] dark:text-teal-200" : "text-muted-foreground/70")} />
                    <span className="flex-1 truncate">{getAreaLabel(area, locale)}</span>
                    {active ? <Check className="h-5 w-5 shrink-0" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-10 text-center text-[15px] text-muted-foreground">{t("areaNoResults")}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
