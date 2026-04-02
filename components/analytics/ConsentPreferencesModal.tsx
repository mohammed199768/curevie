"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ConsentState } from "@/lib/analytics";

type ConsentPreferencesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConsent: ConsentState;
  onSave: (state: ConsentState) => void;
};

type ToggleRowProps = {
  description: string;
  disabled?: boolean;
  label: string;
  onToggle?: () => void;
  pressed: boolean;
};

function ToggleRow({ description, disabled = false, label, onToggle, pressed }: ToggleRowProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.25rem] border border-[#d7e2dc] bg-[#f8fbf9] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#12312d]">{label}</div>
        <p className="mt-1 text-sm leading-6 text-[#617672]">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
          pressed
            ? "border-[#104d49] bg-[#104d49] text-white"
            : "border-[#d0dbd5] bg-white text-[#35514a]",
          disabled ? "cursor-not-allowed border-[#c7d3cd] bg-[#e8efeb] text-[#6e857f]" : "hover:border-[#104d49]",
        )}
      >
        {disabled ? (
          <Lock className="h-4 w-4" />
        ) : pressed ? (
          <Check className="h-4 w-4" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function ConsentPreferencesModal({
  open,
  onOpenChange,
  initialConsent,
  onSave,
}: ConsentPreferencesModalProps) {
  const locale = useLocale();
  const t = useTranslations("consent");
  const [analytics, setAnalytics] = useState(initialConsent.analytics);
  const [marketing, setMarketing] = useState(initialConsent.marketing);

  useEffect(() => {
    if (!open) {
      return;
    }

    setAnalytics(initialConsent.analytics);
    setMarketing(initialConsent.marketing);
  }, [initialConsent.analytics, initialConsent.marketing, open]);

  const handleSave = () => {
    onSave({
      necessary: true,
      analytics,
      marketing,
      decided: true,
      version: initialConsent.version,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto rounded-[1.75rem] border border-white/80 bg-[#fdfdfb] p-0 shadow-[0_40px_120px_-60px_rgba(15,79,72,0.36)]"
      >
        <div className="overflow-hidden rounded-[1.75rem]">
          <div className="border-b border-[#e1e9e4] bg-[linear-gradient(180deg,#f5faf7_0%,#fbfcfa_100%)] px-5 py-5 sm:px-6">
            <DialogHeader className="space-y-3 text-start">
              <DialogTitle className="text-2xl font-semibold text-[#12312d]">{t("banner_title")}</DialogTitle>
              <DialogDescription className="text-sm leading-7 text-[#5e736d]">
                {t("banner_description")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            <ToggleRow
              disabled
              pressed
              label={t("necessary_label")}
              description={t("necessary_description")}
            />
            <ToggleRow
              pressed={analytics}
              onToggle={() => setAnalytics((current) => !current)}
              label={t("analytics_label")}
              description={t("analytics_description")}
            />
            <ToggleRow
              pressed={marketing}
              onToggle={() => setMarketing((current) => !current)}
              label={t("marketing_label")}
              description={t("marketing_description")}
            />

            <div className="flex flex-wrap items-center gap-4 border-t border-[#e1e9e4] pt-4 text-sm text-[#5e736d]">
              <Link href={`/${locale}/privacy`} className="font-medium text-[#104d49] underline-offset-4 hover:underline">
                {t("privacy_policy")}
              </Link>
              <Link href={`/${locale}/cookies`} className="font-medium text-[#104d49] underline-offset-4 hover:underline">
                {t("cookie_policy")}
              </Link>
            </div>
          </div>

          <DialogFooter className="border-t border-[#e1e9e4] bg-[#fbfcfa] px-5 py-4 sm:px-6">
            <Button
              type="button"
              className="min-h-12 rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white hover:bg-[#0f4340]"
              onClick={handleSave}
            >
              {t("save_preferences")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
