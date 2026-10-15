"use client";

import { ArrowUpRight, Instagram, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORT_INSTAGRAM_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";

type PrelaunchNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PrelaunchNoticeDialog({ open, onOpenChange }: PrelaunchNoticeDialogProps) {
  const t = useTranslations("prelaunch");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[2rem] border-white/80 bg-[#f7faf8] p-0 shadow-[0_40px_120px_-44px_rgba(15,79,72,0.38)] sm:max-w-lg">
        <div className="relative overflow-hidden bg-[linear-gradient(140deg,#104d49_0%,#304a43_62%,#12312d_100%)] px-6 pb-7 pt-8 text-white">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#86ab62]" />
          <div className="absolute -right-14 top-2 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <DialogHeader className="relative space-y-4 text-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#104d49] shadow-lg shadow-black/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
              {t("badge")}
            </div>
            <DialogTitle className="text-2xl font-semibold leading-tight text-white">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-white/80">
              {t("description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-2xl border border-[#dbe7e2] bg-white p-4 text-sm leading-7 text-[#46625b]">
            {t("privacyNote")}
          </div>
          <DialogFooter className="mt-5 flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full border-[#d9e6df] bg-white px-5 text-[#12312d] hover:bg-[#f4f8f6]"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
            <Button asChild className="min-h-11 rounded-full bg-[#104d49] px-5 text-white hover:bg-[#304a43]">
              <a href={SUPPORT_INSTAGRAM_URL} target="_blank" rel="noreferrer">
                <Instagram className="h-4 w-4" />
                {t("instagramCta")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PrelaunchInlineNotice({ className }: { className?: string }) {
  const t = useTranslations("prelaunch");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[#104d49]/10 bg-white/75 px-4 py-3 text-sm text-[#304a43] shadow-[0_18px_50px_-42px_rgba(16,77,73,0.4)] backdrop-blur sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#104d49] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="font-semibold text-[#104d49]">{t("inlineTitle")}</p>
          <p className="mt-0.5 leading-6 text-[#5e746d]">{t("inlineCopy")}</p>
        </div>
      </div>
      <a
        href={SUPPORT_INSTAGRAM_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#104d49] px-4 font-semibold text-white transition hover:bg-[#304a43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86ab62] focus-visible:ring-offset-2"
      >
        <Instagram className="h-4 w-4" />
        {t("instagramCta")}
      </a>
    </div>
  );
}

export function PrelaunchRequestPage() {
  const t = useTranslations("prelaunch");

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[2.25rem] border border-white bg-white shadow-[0_36px_120px_-68px_rgba(16,77,73,0.42)]">
        <div className="relative overflow-hidden bg-[linear-gradient(140deg,#104d49_0%,#304a43_62%,#12312d_100%)] px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#86ab62]" />
          <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#104d49]">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#bdd49f]">
              {t("badge")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/80">{t("description")}</p>
          </div>
        </div>
        <div className="grid gap-5 px-6 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-10 sm:py-10">
          <div>
            <p className="font-semibold text-[#104d49]">{t("inlineTitle")}</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5e746d]">{t("privacyNote")}</p>
          </div>
          <Button asChild className="min-h-12 rounded-full bg-[#104d49] px-6 text-white hover:bg-[#304a43]">
            <a href={SUPPORT_INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <Instagram className="h-4 w-4" />
              {t("instagramCta")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
