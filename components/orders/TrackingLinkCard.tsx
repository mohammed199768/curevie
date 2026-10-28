"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function buildTrackingPath(locale: string, token: string) {
  return `/${locale}/track/${encodeURIComponent(token)}`;
}

/** Shows the one-time guest tracking link with a copy button. */
export function TrackingLinkCard({ token, reference }: { token: string; reference?: string | null }) {
  const locale = useLocale();
  const t = useTranslations("orders");
  const [copied, setCopied] = useState(false);
  const trackingPath = buildTrackingPath(locale, token);
  const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}${trackingPath}` : trackingPath;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      toast.success(t("tracking.copied"));
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("tracking.copyFailed"));
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#dbe7e2] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#12312d]">{t("tracking.linkTitle")}</p>
          {reference ? <p className="text-xs text-[#617672]">{t("reference", { reference })}</p> : null}
          <p className="mt-1 text-xs leading-5 text-[#617672]">{t("tracking.linkHint")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          dir="ltr"
          value={trackingUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 flex-1 rounded-full text-xs"
          aria-label={t("tracking.linkTitle")}
        />
        <Button type="button" onClick={copyLink} className="min-h-11 rounded-full px-5">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {t("tracking.copy")}
        </Button>
      </div>

      <Button asChild variant="outline" className="min-h-11 w-full rounded-full">
        <Link href={trackingPath}>
          <ExternalLink className="h-4 w-4" />
          {t("tracking.open")}
        </Link>
      </Button>
    </div>
  );
}
