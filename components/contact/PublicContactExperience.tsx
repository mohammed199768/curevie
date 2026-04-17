"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
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
  SUPPORT_LOCATION_LABEL,
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

const CONTACT_RING_CHANNELS = [
  {
    key: "phone",
    labelKey: "channels.phone.label",
    valueKey: "channels.phone.value",
    hrefKind: "phone" as const,
    accent: "#104d49",
    angle: -90,
  },
  {
    key: "instagram",
    labelKey: "channels.instagram.label",
    valueKey: "channels.instagram.value",
    hrefKind: "instagram" as const,
    accent: "#9c9fa2",
    angle: 0,
  },
  {
    key: "email",
    labelKey: "channels.email.label",
    valueKey: "channels.email.value",
    hrefKind: "email" as const,
    accent: "#86ab62",
    angle: 90,
  },
  {
    key: "whatsapp",
    labelKey: "channels.whatsapp.label",
    valueKey: "channels.whatsapp.value",
    hrefKind: "whatsapp" as const,
    accent: "#5a7a50",
    angle: 180,
  },
] as const;

export function PublicContactExperience() {
  const locale = useLocale();
  const t = useTranslations("publicContact");
  const prefersReducedMotion = useReducedMotion();
  const isArabic = locale === "ar";
  const rtlBidiStyle = isArabic ? ({ unicodeBidi: "plaintext" } as const) : undefined;
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ringPointer, setRingPointer] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

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

  const getContactRingMeta = (channel: (typeof CONTACT_RING_CHANNELS)[number]) => {
    switch (channel.hrefKind) {
      case "phone":
        return {
          href: `tel:${SUPPORT_PHONE_E164}`,
          label: t(channel.labelKey),
          value: SUPPORT_PHONE_LOCAL,
          Icon: Phone,
          onClick: () => handleTrackedContactClick("phone"),
        };
      case "email":
        return {
          href: `mailto:${SUPPORT_EMAIL_HREF}`,
          label: t(channel.labelKey),
          value: SUPPORT_EMAIL,
          Icon: Mail,
          onClick: () => handleTrackedContactClick("email"),
        };
      case "whatsapp":
        return {
          href: SUPPORT_WHATSAPP_URL,
          label: t(channel.labelKey),
          value: t(channel.valueKey),
          Icon: MessageCircle,
          onClick: () => handleTrackedContactClick("whatsapp"),
        };
      default:
        return {
          href: SUPPORT_INSTAGRAM_URL,
          label: t(channel.labelKey),
          value: t(channel.valueKey),
          Icon: Instagram,
          onClick: undefined,
        };
    }
  };

  const getRingScale = (angle: number) => {
    if (!ringPointer || prefersReducedMotion) {
      return 1;
    }

    const radius = Math.min(ringPointer.width, ringPointer.height) * 0.34;
    const centerX = ringPointer.width / 2;
    const centerY = ringPointer.height / 2;
    const angleInRadians = (angle * Math.PI) / 180;
    const nodeX = centerX + Math.cos(angleInRadians) * radius;
    const nodeY = centerY + Math.sin(angleInRadians) * radius;
    const distance = Math.hypot(ringPointer.x - nodeX, ringPointer.y - nodeY);
    const maxDistance = Math.max(110, radius * 0.95);
    const normalized = Math.max(0, 1 - distance / maxDistance);

    return 1 + normalized * 0.34;
  };

  const getRingOpacity = (angle: number) => {
    if (!ringPointer || prefersReducedMotion) {
      return 0.8;
    }

    return Math.min(1, 0.6 + (getRingScale(angle) - 1) * 1.35);
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
          <div data-contact-form-intro className="mb-8 max-w-3xl">
            <div className={cn("text-sm font-semibold text-[#5a7a50]", isArabic ? "tracking-[0.04em]" : "uppercase tracking-[0.22em]")}>
              {t("workspace.eyebrow")}
            </div>
            <h1 className={cn("font-editorial-display mt-4 text-5xl leading-[0.92] text-[#104d49]", displayFontClass)}>
              {isArabic ? "تواصل مع كيورفي" : "Contact Curevie"}
            </h1>
            <p className="mt-4 text-base leading-8 text-[#304a43] sm:text-lg">
              {t("workspace.copy")}
            </p>
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
              <motion.div
                data-contact-side-card
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.78 }}
                className="overflow-hidden rounded-[1.9rem] border border-white bg-white/92 p-5 shadow-[0_28px_84px_-60px_rgba(16,77,73,0.26)] sm:p-6"
              >
                <div className="text-sm font-semibold text-[#104d49]">
                  {isArabic ? "قنوات التواصل السريعة" : "Quick contact ring"}
                </div>
                <p className="mt-2 text-sm leading-7 text-[#304a43]">
                  {isArabic
                    ? "اقترب بالمؤشر من أي قناة لتكبر أمامك، ثم اضغط مباشرة للتواصل معنا."
                    : "Move your cursor toward any channel to let it rise forward, then click to connect instantly."}
                </p>

                <div
                  className="relative mx-auto mt-8 aspect-square w-full max-w-[25rem] rounded-full"
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setRingPointer({
                      x: event.clientX - rect.left,
                      y: event.clientY - rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onMouseLeave={() => setRingPointer(null)}
                >
                  <div className="absolute inset-[12%] rounded-full border border-[#d7e5de] bg-[radial-gradient(circle,rgba(16,77,73,0.03)_0%,rgba(255,255,255,0.92)_62%,rgba(255,255,255,0.98)_100%)]" />
                  <div className="absolute inset-[25%] rounded-full border border-dashed border-[#d7e5de]" />
                  <div className="absolute inset-[3%] rounded-full border border-[#eef4f1]" />

                  {CONTACT_RING_CHANNELS.map((channel) => {
                    const meta = getContactRingMeta(channel);
                    const scale = getRingScale(channel.angle);
                    const opacity = getRingOpacity(channel.angle);
                    const angleInRadians = (channel.angle * Math.PI) / 180;
                    const orbitOffsetX = `${Math.cos(angleInRadians) * 34}%`;
                    const orbitOffsetY = `${Math.sin(angleInRadians) * 34}%`;

                    return (
                      <motion.a
                        key={channel.key}
                        data-contact-side-card
                        href={meta.href}
                        target={meta.href.startsWith("http") ? "_blank" : undefined}
                        rel={meta.href.startsWith("http") ? "noreferrer" : undefined}
                        onClick={meta.onClick}
                        animate={{
                          scale,
                          opacity,
                        }}
                        transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.7 }}
                        className="absolute left-1/2 top-1/2 block"
                        style={{
                          transform: `translate(calc(-50% + ${orbitOffsetX}), calc(-50% + ${orbitOffsetY}))`,
                        }}
                      >
                        <span
                          className="flex h-[4.8rem] w-[4.8rem] items-center justify-center rounded-full border border-white/80 text-white shadow-[0_24px_54px_-24px_rgba(16,77,73,0.36)] sm:h-[5.3rem] sm:w-[5.3rem]"
                          style={{
                            background: `linear-gradient(145deg, ${channel.accent} 0%, #104d49 100%)`,
                          }}
                        >
                          <meta.Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                        </span>
                        <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.8rem)] min-w-max -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#104d49] shadow-[0_18px_42px_-26px_rgba(16,77,73,0.28)]">
                          {meta.label}
                        </span>
                      </motion.a>
                    );
                  })}

                  <div className="absolute left-1/2 top-1/2 flex h-[6.8rem] w-[6.8rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_26px_70px_-34px_rgba(16,77,73,0.3)] sm:h-[8rem] sm:w-[8rem]">
                    <div className="absolute inset-[0.45rem] rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.08)_0%,rgba(255,255,255,0.96)_72%)]" />
                    <Image
                      src="/icon.png"
                      alt="Curevie"
                      width={76}
                      height={76}
                      className="relative z-10 h-14 w-14 rounded-full object-cover sm:h-[4.25rem] sm:w-[4.25rem]"
                    />
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {CONTACT_RING_CHANNELS.map((channel) => {
                    const meta = getContactRingMeta(channel);

                    return (
                      <div
                        key={`meta-${channel.key}`}
                        className="rounded-[1.35rem] border border-[#e0ebe5] bg-[#f8fbf9] px-4 py-4"
                      >
                        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                          {meta.label}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#12312d]">
                          {meta.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.a
                data-contact-side-card
                href={SUPPORT_LOCATION_MAP_URL}
                target="_blank"
                rel="noreferrer"
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.78 }}
                className="group overflow-hidden rounded-[1.9rem] border border-[#104d49]/10 bg-[linear-gradient(180deg,#104d49_0%,#0f433f_100%)] p-6 text-white shadow-[0_32px_90px_-60px_rgba(16,77,73,0.56)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#c7dcd5]">
                      {t("channels.location.label")}
                    </div>
                    <div className="mt-3 text-lg font-semibold leading-8">
                      {SUPPORT_LOCATION_LABEL}
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/80">
                      {t("coverage.copy")}
                    </div>
                  </div>
                  <MapPin className="h-5 w-5 shrink-0 text-[#d7e7df] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>

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
              </motion.a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
