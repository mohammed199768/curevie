"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { areasApi, getAreaLabel } from "@/lib/api/areas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NO_AREA_VALUE = "__none__";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: areasApi.list,
    staleTime: 10 * 60 * 1000,
  });
}

type AreaSelectProps = Omit<ComponentPropsWithoutRef<typeof SelectTrigger>, "value" | "onChange" | "children"> & {
  value?: string | null;
  onChange: (value: string) => void;
  /** Adds a "not specified" option (optional fields such as registration). */
  allowEmpty?: boolean;
  withIcon?: boolean;
};

/** Service-area picker fed by GET /areas (labels come from the API name_ar / name_en). */
export const AreaSelect = forwardRef<ElementRef<typeof SelectTrigger>, AreaSelectProps>(function AreaSelect(
  { value, onChange, allowEmpty = false, disabled, className, withIcon = false, ...triggerProps },
  ref,
) {
  const locale = useLocale();
  const t = useTranslations("orders");
  const areasQuery = useAreas();
  const areas = areasQuery.data || [];

  const placeholder = areasQuery.isLoading
    ? t("area.loading")
    : areasQuery.isError
      ? t("area.loadError")
      : t("area.placeholder");

  return (
    <Select
      value={value || (allowEmpty ? NO_AREA_VALUE : "")}
      onValueChange={(next) => onChange(next === NO_AREA_VALUE ? "" : next)}
      disabled={disabled || areasQuery.isLoading || areasQuery.isError}
    >
      <SelectTrigger ref={ref} className={cn("h-10", className)} aria-label={t("area.label")} {...triggerProps}>
        {withIcon ? (
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={placeholder} />
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allowEmpty ? <SelectItem value={NO_AREA_VALUE}>{t("area.none")}</SelectItem> : null}
        {areas.map((area) => (
          <SelectItem key={area.id} value={area.id}>
            {getAreaLabel(area, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
