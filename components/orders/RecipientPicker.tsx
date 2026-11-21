"use client";

import { useTranslations } from "next-intl";
import {
  RECIPIENT_AGE_GROUPS,
  RECIPIENT_GENDERS,
  type RecipientAgeGroup,
  type RecipientGender,
} from "@/lib/api/cases";
import { isRecipientAgeGroup, isRecipientGender } from "@/lib/order-recipient";
import { cn } from "@/lib/utils";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "Female · Adult" for an order, or null when the order does not say who the care is for (old orders). */
export function formatRecipient(
  t: Translate,
  gender: RecipientGender | string | null | undefined,
  ageGroup: RecipientAgeGroup | string | null | undefined,
) {
  const parts = [
    isRecipientGender(gender) ? t(`gender.${gender}`) : null,
    isRecipientAgeGroup(ageGroup) ? t(`ageShort.${ageGroup}`) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Small "Care is for: Female · Adult" line; renders nothing when both values are missing. */
export function RecipientLine({
  gender,
  ageGroup,
  className,
}: {
  gender: RecipientGender | string | null | undefined;
  ageGroup: RecipientAgeGroup | string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("app.recipient");
  const value = formatRecipient(t, gender, ageGroup);
  if (!value) return null;
  return <p className={cn("text-[14px] text-muted-foreground", className)}>{t("line", { value })}</p>;
}

function OptionGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  getLabel,
  error,
}: {
  name: string;
  label: string;
  options: readonly T[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  getLabel: (value: T) => string;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block px-1 text-[14px] font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={cn(
                "app-press flex min-h-12 cursor-pointer items-center justify-center rounded-2xl px-3 py-2 text-center text-[15px] font-semibold leading-5 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#86ab62]",
                checked
                  ? "bg-[#104d49] text-white shadow-sm dark:bg-teal-300 dark:text-[#0b3f3b]"
                  : "bg-card text-foreground ring-1 ring-[#dbe6e0] hover:bg-[#f3f7f5] dark:ring-border dark:hover:bg-white/5",
                error && !checked && "ring-rose-300 dark:ring-rose-500/50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {getLabel(option)}
            </label>
          );
        })}
      </div>
      {error ? <p className="px-1 text-[13px] font-medium text-destructive">{error}</p> : null}
    </fieldset>
  );
}

/**
 * "Who is this care for?": gender (male / female) and age group (child under 18 / adult), both required.
 * Used by the logged-in order flow and the guest order dialog.
 */
export function RecipientPicker({
  idPrefix,
  gender,
  ageGroup,
  onGenderChange,
  onAgeGroupChange,
  genderError,
  ageGroupError,
  prefilled = false,
  showHeading = true,
  className,
}: {
  idPrefix: string;
  gender: RecipientGender | null | undefined;
  ageGroup: RecipientAgeGroup | null | undefined;
  onGenderChange: (value: RecipientGender) => void;
  onAgeGroupChange: (value: RecipientAgeGroup) => void;
  genderError?: string;
  ageGroupError?: string;
  /** Shows "we filled this in from your profile" under the title. */
  prefilled?: boolean;
  showHeading?: boolean;
  className?: string;
}) {
  const t = useTranslations("app.recipient");

  return (
    <div className={cn("space-y-4", className)}>
      {showHeading ? (
        <div className="px-1">
          <p className="text-[17px] font-bold text-foreground">{t("title")}</p>
          <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">{prefilled ? t("prefilled") : t("hint")}</p>
        </div>
      ) : null}
      <OptionGroup
        name={`${idPrefix}-recipient-gender`}
        label={t("genderLabel")}
        options={RECIPIENT_GENDERS}
        value={gender}
        onChange={onGenderChange}
        getLabel={(value) => t(`gender.${value}`)}
        error={genderError}
      />
      <OptionGroup
        name={`${idPrefix}-recipient-age`}
        label={t("ageLabel")}
        options={RECIPIENT_AGE_GROUPS}
        value={ageGroup}
        onChange={onAgeGroupChange}
        getLabel={(value) => t(`age.${value}`)}
        error={ageGroupError}
      />
    </div>
  );
}
