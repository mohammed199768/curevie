"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_INSTAGRAM_URL,
  SUPPORT_LOCATION_MAP_URL,
  SUPPORT_PHONE_E164,
  SUPPORT_PHONE_LOCAL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/contact";
import { onContactChannelClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export function PublicContactExperience() {
  const locale = useLocale();
  const t = useTranslations("publicContact");
  const prefersReducedMotion = useReducedMotion();
  const isArabic = locale === "ar";
  const rtlBidiStyle = isArabic ? ({ unicodeBidi: "plaintext" } as const) : undefined;
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.92 } });

      heroTimeline
        .from("[data-contact-form-intro]", { y: 34, autoAlpha: 0 })
        .from("[data-contact-form-card]", { y: 48, autoAlpha: 0 }, "-=0.4")
        .from("[data-contact-side-card]", { y: 56, autoAlpha: 0, stagger: 0.1 }, "-=0.5");
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [prefersReducedMotion]);

  const titleLines = [
    {
      key: "line-1",
      text: t("hero.titleLineOne"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(2.2rem,12.5vw,4.35rem)] leading-[1.02] sm:text-[clamp(2.55rem,8.8vw,4.45rem)]"
        : "text-[clamp(2.6rem,10.6vw,5.45rem)] leading-[0.9] sm:text-[clamp(2.95rem,7vw,5.45rem)]",
    },
    {
      key: "line-2",
      text: t("hero.titleLineTwo"),
      colorClass: "text-[#104d49]",
      sizeClass: isArabic
        ? "text-[clamp(2.28rem,12.8vw,4.42rem)] leading-[1.02] sm:text-[clamp(2.62rem,9vw,4.48rem)]"
        : "text-[clamp(2.6rem,10.6vw,5.45rem)] leading-[0.9] sm:text-[clamp(2.95rem,7vw,5.45rem)]",
    },
    {
      key: "line-3",
      text: t("hero.titleAccent"),
      colorClass: "text-[#86ab62]",
      sizeClass: isArabic
        ? "text-[clamp(2.35rem,13vw,4.5rem)] leading-[1.02] sm:text-[clamp(2.7rem,9.2vw,4.55rem)]"
        : "text-[clamp(2.6rem,10.6vw,5.45rem)] leading-[0.9] sm:text-[clamp(2.95rem,7vw,5.45rem)]",
    },
  ];

  const contactChannels = [
    {
      key: "phone",
      Icon: Phone,
      label: t("channels.phone.label"),
      value: SUPPORT_PHONE_LOCAL,
      href: `tel:${SUPPORT_PHONE_E164}`,
      accent: "#104d49",
    },
    {
      key: "email",
      Icon: Mail,
      label: t("channels.email.label"),
      value: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL_HREF}`,
      accent: "#86ab62",
    },
    {
      key: "whatsapp",
      Icon: MessageSquareText,
      label: t("channels.whatsapp.label"),
      value: t("channels.whatsapp.value"),
      href: SUPPORT_WHATSAPP_URL,
      accent: "#5a7a50",
    },
    {
      key: "instagram",
      Icon: ArrowUpRight,
      label: t("channels.instagram.label"),
      value: t("channels.instagram.value"),
      href: SUPPORT_INSTAGRAM_URL,
      accent: "#9c9fa2",
    },
    {
      key: "location",
      Icon: MapPin,
      label: t("channels.location.label"),
      value: t("channels.location.value"),
      href: SUPPORT_LOCATION_MAP_URL,
      accent: "#104d49",
    },
    {
      key: "hours",
      Icon: Clock3,
      label: t("channels.hours.label"),
      value: t("channels.hours.value"),
      href: `/${locale}/services/medical-visits`,
      accent: "#86ab62",
    },
  ] as const;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t("validationError"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed");
      }

      setForm(INITIAL_FORM);
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackedContactClick = (channel: "phone" | "email" | "whatsapp") => {
    onContactChannelClick({ channel, locale });
  };

  const setField = (field: keyof ContactFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div ref={rootRef} className="overflow-hidden bg-[#f5f8f6] text-slate-950">
      <section className="hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(134,171,98,0.18),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(16,77,73,0.18),transparent_24%),linear-gradient(180deg,#f6faf7_0%,#f2f6f3_46%,#fbfcfa_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
        <div
          data-contact-orb="left"
          className="perf-drift-slow pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full border border-[#104d49]/10 sm:-left-24 sm:h-[24rem] sm:w-[24rem]"
        />
        <div
          data-contact-orb="right"
          className="perf-drift-reverse pointer-events-none absolute right-[-4rem] top-20 h-52 w-52 rounded-full border border-[#86ab62]/20 sm:right-[-5rem] sm:h-[20rem] sm:w-[20rem]"
        />
        <div className="pointer-events-none absolute left-[46%] top-16 hidden h-[32rem] w-px bg-gradient-to-b from-transparent via-white/60 to-transparent xl:block" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(22rem,0.94fr)] lg:items-end lg:gap-12">
            <div className="max-w-3xl">
              <div
                data-contact-eyebrow
                className={cn(
                  "mb-5 inline-flex max-w-full min-h-11 flex-wrap items-center gap-3 rounded-full border border-[#104d49]/10 bg-white/88 px-4 py-2 text-xs font-semibold text-[#104d49] shadow-[0_20px_60px_-36px_rgba(16,77,73,0.35)] sm:mb-6",
                  isArabic ? "flex-row-reverse tracking-[0.04em]" : "uppercase tracking-[0.32em]",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#104d49] text-white">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                {t("hero.eyebrow")}
              </div>

              <div
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(isArabic ? "space-y-0 text-right" : "space-y-1 text-balance")}
              >
                {titleLines.map((line) => (
                  <div key={line.key} className={cn("overflow-hidden", isArabic ? "py-2" : "py-0")}>
                    <div
                      data-contact-title
                      dir={isArabic ? "rtl" : undefined}
                      style={rtlBidiStyle}
                      className={cn(
                        "max-w-full font-editorial-display will-change-transform",
                        displayFontClass,
                        line.colorClass,
                        line.sizeClass,
                      )}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>

              <p
                data-contact-copy
                dir={isArabic ? "rtl" : undefined}
                style={rtlBidiStyle}
                className={cn(
                  "mt-6 max-w-2xl text-[0.98rem] leading-7 text-[#304a43] sm:text-lg sm:leading-8",
                  isArabic ? "max-w-3xl text-right leading-[1.95rem] sm:leading-[2.1rem]" : "",
                )}
              >
                {t("hero.copy")}
              </p>

              <div data-contact-actions className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={`tel:${SUPPORT_PHONE_E164}`}
                  onClick={() => handleTrackedContactClick("phone")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white transition hover:bg-[#304a43]"
                >
                  {t("hero.primaryCta")}
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL_HREF}`}
                  onClick={() => handleTrackedContactClick("email")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#104d49]/12 bg-white/84 px-6 text-sm font-semibold text-[#104d49] transition hover:bg-white"
                >
                  {t("hero.secondaryCta")}
                  <Mail className="h-4 w-4" />
                </a>
                <Link
                  href={`/${locale}/services/medical-visits`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold text-[#104d49] transition hover:text-[#304a43]"
                >
                  {t("hero.exploreLink")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div
              data-contact-hero-panel
              className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-[0_34px_95px_-56px_rgba(16,77,73,0.34)] sm:p-7"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(134,171,98,0.18),transparent_72%)]" />
              <div className="absolute inset-y-0 right-0 w-24 bg-[linear-gradient(180deg,rgba(16,77,73,0.04),transparent_80%)]" />

              <div className={cn("text-[0.72rem] font-semibold text-[#9c9fa2]", isArabic ? "tracking-[0.06em]" : "uppercase tracking-[0.24em]")}>
                {t("hero.panelEyebrow")}
              </div>
              <h2 className="mt-4 max-w-md text-[1.8rem] font-semibold leading-[1.12] text-[#104d49] sm:text-[2.15rem]">
                {t("hero.panelTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[#304a43] sm:text-[0.98rem]">
                {t("hero.panelCopy")}
              </p>

              <div className="mt-8 grid gap-3">
                {(["guidance", "followUp", "routing"] as const).map((itemKey, index) => (
                  <div
                    key={itemKey}
                    className="rounded-[1.35rem] border border-[#104d49]/10 bg-[#f8fbf9] px-4 py-4 shadow-[0_18px_50px_-42px_rgba(16,77,73,0.26)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#104d49] text-white">
                        <span className="text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#104d49]">{t(`hero.points.${itemKey}.title`)}</div>
                        <div className="mt-1 text-sm leading-6 text-[#304a43]">{t(`hero.points.${itemKey}.copy`)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={formRef} className="relative isolate overflow-hidden bg-[#fbfcfa]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(134,171,98,0.11),transparent_42%)]" />
        <div className="perf-drift-slow pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.09)_0%,rgba(16,77,73,0.02)_42%,transparent_72%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div data-contact-form-intro className="max-w-3xl mb-8">
            <h2 className={cn("font-editorial-display mt-4 text-5xl leading-[0.92] text-[#104d49]", displayFontClass)}>
              {isArabic ? "تواصل معنا" : "Contact Us"}
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
            <motion.section
              data-contact-form-card
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.78 }}
              className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_34px_100px_-62px_rgba(16,77,73,0.3)] sm:p-7"
            >
              <div className="mb-6">
                <div className="text-sm font-semibold text-[#104d49]">{t("form.title")}</div>
                <p className="mt-2 text-sm leading-7 text-[#304a43]">{t("form.copy")}</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-semibold text-[#104d49]">
                      {t("form.fields.name.label")}
                    </Label>
                    <Input
                      id="contact-name"
                      value={form.name}
                      placeholder={t("form.fields.name.placeholder")}
                      onChange={(event) => setField("name", event.target.value)}
                      className="min-h-12 rounded-2xl border-[#dce7e1] bg-[#fbfcfa] px-4 text-[#104d49] placeholder:text-[#8ca09b] focus-visible:border-[#86ab62] focus-visible:ring-[#86ab62]/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-semibold text-[#104d49]">
                      {t("form.fields.email.label")}
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      placeholder={t("form.fields.email.placeholder")}
                      onChange={(event) => setField("email", event.target.value)}
                      className="min-h-12 rounded-2xl border-[#dce7e1] bg-[#fbfcfa] px-4 text-[#104d49] placeholder:text-[#8ca09b] focus-visible:border-[#86ab62] focus-visible:ring-[#86ab62]/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="text-sm font-semibold text-[#104d49]">
                    {t("form.fields.phone.label")}
                  </Label>
                  <Input
                    id="contact-phone"
                    value={form.phone}
                    placeholder={t("form.fields.phone.placeholder")}
                    onChange={(event) => setField("phone", event.target.value)}
                    className="min-h-12 rounded-2xl border-[#dce7e1] bg-[#fbfcfa] px-4 text-[#104d49] placeholder:text-[#8ca09b] focus-visible:border-[#86ab62] focus-visible:ring-[#86ab62]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-sm font-semibold text-[#104d49]">
                    {t("form.fields.message.label")}
                  </Label>
                  <Textarea
                    id="contact-message"
                    rows={7}
                    value={form.message}
                    placeholder={t("form.fields.message.placeholder")}
                    onChange={(event) => setField("message", event.target.value)}
                    className="min-h-[11rem] rounded-[1.6rem] border-[#dce7e1] bg-[#fbfcfa] px-4 py-3 text-[#104d49] placeholder:text-[#8ca09b] focus-visible:border-[#86ab62] focus-visible:ring-[#86ab62]/30"
                  />
                </div>

                <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2 text-sm text-[#5f736d]">
                    <ShieldCheck className="h-4 w-4 text-[#86ab62]" />
                    {t("form.assurance")}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-12 rounded-full bg-[#104d49] px-6 text-sm font-semibold text-white hover:bg-[#304a43] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? t("form.submitting") : t("form.submit")}
                  </Button>
                </div>
              </form>
            </motion.section>

            <div className="grid gap-4">
              {contactChannels.map((channel) => (
                <motion.a
                  key={channel.key}
                  data-contact-side-card
                  href={channel.href}
                  onClick={
                    channel.key === "phone"
                      ? () => handleTrackedContactClick("phone")
                      : channel.key === "email"
                        ? () => handleTrackedContactClick("email")
                        : channel.key === "whatsapp"
                          ? () => handleTrackedContactClick("whatsapp")
                          : undefined
                  }
                  whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                  transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.78 }}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white bg-white/92 p-5 shadow-[0_28px_84px_-60px_rgba(16,77,73,0.26)]"
                >
                  <div
                    className="pointer-events-none absolute inset-x-5 top-0 h-16 translate-y-[-28%] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle, ${channel.accent}1b 0%, transparent 70%)` }}
                  />
                  <div className="relative flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] text-white shadow-[0_20px_54px_-32px_rgba(0,0,0,0.24)]"
                      style={{ background: `linear-gradient(145deg, ${channel.accent} 0%, #104d49 100%)` }}
                    >
                      <channel.Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#104d49]">{channel.label}</div>
                      <div className="mt-1 text-sm leading-7 text-[#304a43]">{channel.value}</div>
                    </div>
                    <ArrowUpRight className="ms-auto h-4 w-4 shrink-0 text-[#104d49] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </motion.a>
              ))}

              <motion.div
                data-contact-side-card
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.78 }}
                className="overflow-hidden rounded-[1.9rem] border border-[#104d49]/10 bg-[linear-gradient(180deg,#104d49_0%,#0f433f_100%)] p-6 text-white shadow-[0_32px_90px_-60px_rgba(16,77,73,0.56)]"
              >
                <div className="text-sm font-semibold text-[#c7dcd5]">{t("coverage.title")}</div>
                <div className="mt-3 text-lg font-semibold leading-8">{t("coverage.copy")}</div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/88">
                    {t("coverage.chipOne")}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/88">
                    {t("coverage.chipTwo")}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/88">
                    {t("coverage.chipThree")}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
