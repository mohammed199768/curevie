"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConsentPreferencesModal } from "@/components/analytics/ConsentPreferencesModal";
import { getConsent, setConsent, type ConsentState } from "@/lib/analytics";

type ConsentBannerProps = {
  onConsentAccepted: (state: ConsentState) => void;
};

export function ConsentBanner({ onConsentAccepted }: ConsentBannerProps) {
  const t = useTranslations("consent");
  const initialConsent = getConsent();
  const [isReady, setIsReady] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [consent, setConsentState] = useState<ConsentState>(initialConsent);
  const [showBanner, setShowBanner] = useState(!initialConsent.decided);
  const [showFloating, setShowFloating] = useState(initialConsent.decided);

  useEffect(() => {
    const persistedConsent = getConsent();
    const hasConsented = persistedConsent.decided;

    setConsentState(persistedConsent);
    setShowBanner(!hasConsented);
    setShowFloating(hasConsented);
    setIsReady(true);
  }, []);

  const applyConsent = (nextState: ConsentState) => {
    const persisted = setConsent(nextState);
    setConsentState(persisted);
    setShowBanner(false);
    setShowFloating(true);
    setIsPreferencesOpen(false);
    onConsentAccepted(persisted);
  };

  if (!isReady) {
    return null;
  }

  return (
    <>
      {showBanner ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="pointer-events-auto mx-auto max-w-6xl rounded-[1.75rem] border border-white/80 bg-[linear-gradient(135deg,rgba(16,77,73,0.98)_0%,rgba(14,61,58,0.98)_100%)] p-5 text-white shadow-[0_28px_90px_-50px_rgba(7,31,29,0.7)] sm:p-6">
            <div>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-xl font-semibold sm:text-2xl">{t("banner_title")}</h2>
                  <p className="mt-3 line-clamp-3 text-xs leading-7 text-white/82 sm:line-clamp-none sm:text-sm">
                    {t("banner_description")}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 rounded-full border-white/16 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/16 hover:text-white sm:min-h-12"
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
                    className="min-h-10 rounded-full border-white/16 bg-white px-5 text-sm font-semibold text-[#12312d] hover:bg-[#f2f6f3] sm:min-h-12"
                    onClick={() => setIsPreferencesOpen(true)}
                  >
                    {t("manage_preferences")}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-10 rounded-full bg-[#86ab62] px-5 text-sm font-semibold text-[#102c28] hover:bg-[#93b66f] sm:min-h-12"
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
        </div>
      ) : null}

      {showFloating && !showBanner ? (
        <button
          onClick={() => setShowBanner(true)}
          className="fixed bottom-4 start-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90"
          aria-label="Privacy settings"
        >
          <ShieldCheck className="h-5 w-5" />
        </button>
      ) : null}

      <ConsentPreferencesModal
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
        initialConsent={consent}
        onSave={applyConsent}
      />
    </>
  );
}
