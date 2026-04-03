"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Instagram, Mail, MapPin, MessageSquareText, PhoneCall } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const tFooter = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("homeExperience");
  const tContact = useTranslations("publicContact");
  const tConsent = useTranslations("consent");
  const isArabic = locale === "ar";

  const quickLinks = [
    { href: `/${locale}`, label: tNav("home") },
    { href: `/${locale}/about`, label: tNav("about") },
    { href: `/${locale}/contact`, label: tNav("contact") },
    { href: `/${locale}/privacy`, label: tConsent("privacy_policy") },
    { href: `/${locale}/cookies`, label: tConsent("cookie_policy") },
  ] as const;

  const serviceLinks = [
    { href: `/${locale}/services/medical-visits`, label: tHome("categories.medicalVisits.title") },
    { href: `/${locale}/services/imaging`, label: tHome("categories.imaging.title") },
    { href: `/${locale}/services/lab-diagnostics`, label: tHome("categories.labDiagnostics.title") },
    { href: `/${locale}/services/care-programs`, label: tHome("categories.carePrograms.title") },
  ] as const;

  const socialLinks = [
    { href: SUPPORT_WHATSAPP_URL, label: tContact("channels.whatsapp.label"), icon: MessageSquareText },
    { href: SUPPORT_INSTAGRAM_URL, label: tContact("channels.instagram.label"), icon: Instagram },
  ] as const;

  const contactInfo = [
    { href: `tel:${SUPPORT_PHONE_E164}`, label: SUPPORT_PHONE_LOCAL, icon: PhoneCall },
    { href: `mailto:${SUPPORT_EMAIL_HREF}`, label: SUPPORT_EMAIL, icon: Mail },
    { href: SUPPORT_LOCATION_MAP_URL, label: SUPPORT_LOCATION_LABEL, icon: MapPin },
  ] as const;

  return (
    <footer className="border-t border-[#0f4944] bg-[#0B1E19] py-12 text-white sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand & Social */}
          <div className="lg:col-span-2">
            <Link href={`/${locale}`} className="inline-flex items-center transition-opacity hover:opacity-80">
              <Image src="/3.png" alt="Curevie" width={100} height={32} className="object-contain" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              {tFooter("description")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((row) => {
                const Icon = row.icon;
                return (
                  <Link
                    key={row.label}
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    title={row.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-[#bdd49f] hover:text-[#0B1E19]"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{row.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={cn("text-sm font-semibold text-[#bdd49f]", isArabic ? "tracking-wide" : "uppercase tracking-wider")}>
              {tFooter("quickLinks")}
            </h3>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className={cn("text-sm font-semibold text-[#bdd49f]", isArabic ? "tracking-wide" : "uppercase tracking-wider")}>
              {tFooter("servicesTitle")}
            </h3>
            <ul className="mt-5 space-y-3">
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className={cn("text-sm font-semibold text-[#bdd49f]", isArabic ? "tracking-wide" : "uppercase tracking-wider")}>
              {tFooter("contactTitle")}
            </h3>
            <ul className="mt-5 space-y-4">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      className="group flex gap-3 text-sm text-white/70 transition-colors hover:text-white"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#bdd49f]" />
                      <span className="leading-tight">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/50">{tFooter("rights")}</p>
          <p className="mt-3 text-sm text-white/40 sm:mt-0">{tFooter("bottomNote")}</p>
        </div>
      </div>
    </footer>
  );
}
