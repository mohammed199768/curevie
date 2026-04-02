"use client";

import { motion } from "framer-motion";
import { ClipboardPen, FileText, House } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("howItWorks");

  const steps = [
    { icon: ClipboardPen, title: t("step1Title"), desc: t("step1Desc") },
    { icon: House, title: t("step2Title"), desc: t("step2Desc") },
    { icon: FileText, title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="mb-10 text-center text-3xl font-bold">{t("title")}</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12 }}
              viewport={{ once: true }}
              className="rounded-2xl border bg-card p-6 text-center shadow-lg"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-primary">0{index + 1}</p>
              <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

