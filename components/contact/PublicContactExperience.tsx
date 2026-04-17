"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
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

type ContactRingChannel = (typeof CONTACT_RING_CHANNELS)[number];

export function PublicContactExperience() {
  const locale = useLocale();
  const t = useTranslations("publicContact");
  const prefersReducedMotion = useReducedMotion();
  const displayFontClass = "font-editorial-display font-[family-name:var(--font-cormorant)]";

  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRingKey, setActiveRingKey] = useState<ContactRingChannel["key"]>("whatsapp");
  const [ringPointer, setRingPointer] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) {
      return undefined;
    }

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

  const handleTrackedContactClick = (channel: "phone" | "email" | "whatsapp") => {
    onContactChannelClick({ channel, locale });
  };

  const getContactRingMeta = (channel: ContactRingChannel) => {
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

  const ringDetails = useMemo(
    () =>
      CONTACT_RING_CHANNELS.map((channel) => ({
        channel,
        meta: getContactRingMeta(channel),
      })),
    [locale, t],
  );

  const activeRingChannel =
    CONTACT_RING_CHANNELS.find((channel) => channel.key === activeRingKey) || CONTACT_RING_CHANNELS[0];
  const activeRingMeta = getContactRingMeta(activeRingChannel);

  const getRingScale = (channel: ContactRingChannel) => {
    if (prefersReducedMotion) {
      return activeRingKey === channel.key ? 1.18 : 1;
    }

    if (!ringPointer) {
      return activeRingKey === channel.key ? 1.18 : 1;
    }

    const radius = Math.min(ringPointer.width, ringPointer.height) * 0.44;
    const centerX = ringPointer.width / 2;
    const centerY = ringPointer.height / 2;
    const angleInRadians = (channel.angle * Math.PI) / 180;
    const nodeX = centerX + Math.cos(angleInRadians) * radius;
    const nodeY = centerY + Math.sin(angleInRadians) * radius;
    const distance = Math.hypot(ringPointer.x - nodeX, ringPointer.y - nodeY);
    const maxDistance = Math.max(120, radius * 0.92);
    const normalized = Math.max(0, 1 - distance / maxDistance);
    const proximityBoost = normalized * 0.22;
    const activeBoost = activeRingKey === channel.key ? 0.1 : 0;

    return 1 + proximityBoost + activeBoost;
  };

  const getRingOpacity = (channel: ContactRingChannel) => {
    const scale = getRingScale(channel);
    return Math.min(1, 0.72 + (scale - 1) * 1.1);
  };

  const setField = (field: keyof ContactFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

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

  return (
    <div ref={rootRef} className="overflow-hidden bg-[#f5f8f6] text-slate-950">
      <section className="relative isolate overflow-hidden bg-[#fbfcfa]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(134,171,98,0.11),transparent_42%)]" />
        <div className="perf-drift-slow pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.09)_0%,rgba(16,77,73,0.02)_42%,transparent_72%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div data-contact-form-intro className="mb-8 max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5a7a50]">
              {t("workspace.eyebrow")}
            </div>
            <h1 className={cn("mt-4 text-5xl leading-[0.92] text-[#104d49]", displayFontClass)}>
              {locale === "ar" ? "تواصل مع كيورفي" : "Contact Curevie"}
            </h1>
            <p className="mt-4 text-base leading-8 text-[#304a43] sm:text-lg">
              {t("workspace.copy")}
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
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
                  {locale === "ar" ? "قنوات التواصل السريعة" : "Quick contact ring"}
                </div>
                <p className="mt-2 text-sm leading-7 text-[#304a43]">
                  {locale === "ar"
                    ? "الأيقونات موزعة حول الشعار في المنتصف. اقترب من أي قناة أو مرر فوقها لتكبر بوضوح وتظهر تفاصيلها."
                    : "The icons are arranged around the center mark. Move closer or hover any channel to bring it forward and reveal it clearly."}
                </p>

                <div className="mt-5 rounded-[1.5rem] border border-[#e0ebe5] bg-[#f8fbf9] px-4 py-4">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                    {locale === "ar" ? "القناة المحددة" : "Active channel"}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-[0_14px_32px_-18px_rgba(16,77,73,0.28)]"
                      style={{
                        background: `linear-gradient(145deg, ${activeRingChannel.accent} 0%, #104d49 100%)`,
                      }}
                    >
                      <activeRingMeta.Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[#104d49]">{activeRingMeta.label}</div>
                      <div className="text-sm text-[#45615a]">{activeRingMeta.value}</div>
                    </div>
                  </div>
                </div>

                <div
                  className="relative mx-auto mt-8 aspect-square w-full max-w-[27rem] rounded-full"
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
                  <div className="absolute inset-[5%] rounded-full border border-[#ebf2ef]" />
                  <div className="absolute inset-[14%] rounded-full border border-[#d7e5de] bg-[radial-gradient(circle,rgba(16,77,73,0.04)_0%,rgba(255,255,255,0.92)_62%,rgba(255,255,255,0.98)_100%)]" />
                  <div className="absolute inset-[24%] rounded-full border border-dashed border-[#d7e5de]" />
                  <div className="absolute inset-[32%] rounded-full border border-[#edf4f0]" />

                  {ringDetails.map(({ channel, meta }) => {
                    const scale = getRingScale(channel);
                    const opacity = getRingOpacity(channel);
                    const angleInRadians = (channel.angle * Math.PI) / 180;
                    const orbitOffsetX = `${Math.cos(angleInRadians) * 49}%`;
                    const orbitOffsetY = `${Math.sin(angleInRadians) * 49}%`;

                    return (
                      <div
                        key={channel.key}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transform: `translate(calc(-50% + ${orbitOffsetX}), calc(-50% + ${orbitOffsetY}))`,
                          zIndex: activeRingKey === channel.key ? 20 : 10,
                        }}
                      >
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 h-px origin-left bg-[linear-gradient(90deg,rgba(16,77,73,0.22),rgba(16,77,73,0.03))]"
                          style={{
                            width: "6.4rem",
                            transform: `translate(-100%, -50%) rotate(${channel.angle + 180}deg)`,
                          }}
                        />
                        <motion.a
                          data-contact-side-card
                          href={meta.href}
                          target={meta.href.startsWith("http") ? "_blank" : undefined}
                          rel={meta.href.startsWith("http") ? "noreferrer" : undefined}
                          onClick={meta.onClick}
                          onMouseEnter={() => setActiveRingKey(channel.key)}
                          onFocus={() => setActiveRingKey(channel.key)}
                          animate={{
                            scale,
                            opacity,
                            y: 0,
                          }}
                          transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.7 }}
                          className="group/ring relative block"
                        >
                          <span
                            className="flex h-[4.15rem] w-[4.15rem] items-center justify-center rounded-full border border-white/80 text-white shadow-[0_24px_54px_-24px_rgba(16,77,73,0.36)] sm:h-[4.55rem] sm:w-[4.55rem]"
                            style={{
                              background: `linear-gradient(145deg, ${channel.accent} 0%, #104d49 100%)`,
                            }}
                          >
                            <meta.Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </span>
                          <span
                            className={cn(
                              "pointer-events-none absolute left-1/2 top-1/2 min-w-max -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#104d49] shadow-[0_18px_42px_-26px_rgba(16,77,73,0.28)] transition-all duration-300",
                              activeRingKey === channel.key
                                ? "-translate-y-[4.9rem] opacity-100"
                                : "-translate-y-[4.25rem] opacity-0",
                            )}
                          >
                            {meta.label}
                          </span>
                        </motion.a>
                      </div>
                    );
                  })}

                  <div className="absolute left-1/2 top-1/2 h-[5.85rem] w-[5.85rem] -translate-x-1/2 -translate-y-1/2 sm:h-[6.85rem] sm:w-[6.85rem]">
                    <motion.div
                      className="absolute inset-[-0.8rem] rounded-full border border-[#d6e5dd]/80"
                      animate={
                        prefersReducedMotion
                          ? undefined
                          : {
                              scale: [1, 1.12, 1.22],
                              opacity: [0.42, 0.18, 0],
                            }
                      }
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : {
                              duration: 2.6,
                              repeat: Infinity,
                              ease: "easeOut",
                            }
                      }
                    />
                    <motion.div
                      className="absolute inset-[-1.55rem] rounded-full border border-[#edf4f0]"
                      animate={
                        prefersReducedMotion
                          ? undefined
                          : {
                              scale: [0.96, 1.08, 1.18],
                              opacity: [0.26, 0.08, 0],
                            }
                      }
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : {
                              duration: 2.6,
                              repeat: Infinity,
                              ease: "easeOut",
                              delay: 0.8,
                            }
                      }
                    />
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_26px_70px_-34px_rgba(16,77,73,0.3)]"
                      animate={
                        prefersReducedMotion
                          ? undefined
                          : {
                              boxShadow: [
                                "0 26px 70px -34px rgba(16,77,73,0.24)",
                                "0 30px 84px -30px rgba(16,77,73,0.34)",
                                "0 26px 70px -34px rgba(16,77,73,0.24)",
                              ],
                            }
                      }
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : {
                              duration: 2.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                    >
                      <div className="absolute inset-[0.45rem] rounded-full bg-[radial-gradient(circle,rgba(16,77,73,0.08)_0%,rgba(255,255,255,0.96)_72%)]" />
                      <Image
                        src="/icon.png"
                        alt="Curevie"
                        width={76}
                        height={76}
                        className="relative z-10 h-14 w-14 rounded-full object-cover sm:h-[4.25rem] sm:w-[4.25rem]"
                      />
                    </motion.div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {ringDetails.map(({ channel, meta }) => (
                    <button
                      key={`meta-${channel.key}`}
                      type="button"
                      onMouseEnter={() => setActiveRingKey(channel.key)}
                      onFocus={() => setActiveRingKey(channel.key)}
                      className={cn(
                        "rounded-[1.35rem] border px-4 py-4 text-start transition",
                        activeRingKey === channel.key
                          ? "border-[#bfd5cc] bg-white shadow-[0_18px_40px_-26px_rgba(16,77,73,0.2)]"
                          : "border-[#e0ebe5] bg-[#f8fbf9]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                          style={{
                            background: `linear-gradient(145deg, ${channel.accent} 0%, #104d49 100%)`,
                          }}
                        >
                          <meta.Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                            {meta.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#12312d]">
                            {meta.value}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
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
