"use client";

import { motion } from "framer-motion";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onBookNow: () => void;
  onLearnMore: () => void;
}

export function HeroSection({ onBookNow, onLearnMore }: HeroSectionProps) {
  const t = useTranslations("hero");

  return (
    <section className="hero-gradient relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-25">
        <motion.div
          className="absolute left-10 top-12 h-24 w-24 rounded-full bg-white/30"
          animate={{ y: [0, -14, 0] }}
          transition={{ repeat: Infinity, duration: 6 }}
        />
        <motion.div
          className="absolute right-20 top-20 h-16 w-16 rounded-full bg-white/20"
          animate={{ y: [0, 18, 0] }}
          transition={{ repeat: Infinity, duration: 5 }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-20 lg:grid-cols-2 lg:items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-white/90">{t("subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={onBookNow} className="rounded-full bg-white px-6 text-primary hover:bg-gray-100">
              {t("bookNow")}
            </Button>
            <Button
              onClick={onLearnMore}
              variant="outline"
              className="rounded-full border-white bg-transparent px-6 text-white hover:bg-white/15"
            >
              {t("learnMore")}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-white/25 bg-white/10 p-6 shadow-lg backdrop-blur"
        >
          <h3 className="text-xl font-semibold">{t("networkTitle")}</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <Users className="mx-auto h-5 w-5" />
              <p className="mt-2 text-2xl font-bold">500+</p>
              <p className="text-xs">{t("patientsLabel")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <ShieldCheck className="mx-auto h-5 w-5" />
              <p className="mt-2 text-2xl font-bold">50+</p>
              <p className="text-xs">{t("providersLabel")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <Activity className="mx-auto h-5 w-5" />
              <p className="mt-2 text-2xl font-bold">15+</p>
              <p className="text-xs">{t("servicesLabel")}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

