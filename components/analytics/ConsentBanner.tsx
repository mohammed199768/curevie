"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConsentPreferencesModal } from "@/components/analytics/ConsentPreferencesModal";
import { getConsent, setConsent, type ConsentState } from "@/lib/analytics";

type ConsentBannerProps = {
  onConsentAccepted: (state: ConsentState) => void;
};

export function ConsentBanner({ onConsentAccepted }: ConsentBannerProps) {
  const t = useTranslations("consent");
  const [isReady, setIsReady] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [consent, setConsentState] = useState<ConsentState>(getConsent);

  useEffect(() => {
    setConsentState(getConsent());
    setIsReady(true);
  }, []);

  const applyConsent = (nextState: ConsentState) => {
    const persisted = setConsent(nextState);
    setConsentState(persisted);
    setIsPreferencesOpen(false);
    onConsentAccepted(persisted);
  };

  if (!isReady || consent.decided) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        <div className="pointer-events-auto mx-auto max-w-6xl rounded-[1.75rem] border border-white/80 bg-[linear-gradient(135deg,rgba(16,77,73,0.98)_0%,rgba(14,61,58,0.98)_100%)] p-5 text-white shadow-[0_28px_90px_-50px_rgba(7,31,29,0.7)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold sm:text-2xl">{t("banner_title")}</h2>
              <p className="mt-3 text-sm leading-7 text-white/82 sm:text-[0.98rem]">
                {t("banner_description")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-full border-white/16 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/16 hover:text-white"
                onClick={() =>
                  applyConsent({
                    necessary: true,
                    analytics: false,
                    marketing: false,
                    decided: true,
                    version: consent.version,
                  })
                }
              >
                {t("reject_non_essential")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-full border-white/16 bg-white px-5 text-sm font-semibold text-[#12312d] hover:bg-[#f2f6f3]"
                onClick={() => setIsPreferencesOpen(true)}
              >
                {t("manage_preferences")}
              </Button>
              <Button
                type="button"
                className="min-h-12 rounded-full bg-[#86ab62] px-5 text-sm font-semibold text-[#102c28] hover:bg-[#93b66f]"
                onClick={() =>
                  applyConsent({
                    necessary: true,
                    analytics: true,
                    marketing: true,
                    decided: true,
                    version: consent.version,
                  })
                }
              >
                {t("accept_all")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConsentPreferencesModal
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
        initialConsent={consent}
        onSave={applyConsent}
      />
    </>
  );
}
