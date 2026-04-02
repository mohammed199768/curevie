"use client";

import { motion } from "framer-motion";
import { Activity, FlaskConical, Stethoscope, Syringe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ServicesSliderProps {
  onBookNow: () => void;
}

export function ServicesSlider({ onBookNow }: ServicesSliderProps) {
  const t = useTranslations("services");

  const cards = [
    { key: "doctor", icon: Stethoscope, price: "Starting 25 JD" },
    { key: "nurse", icon: Syringe, price: "Starting 18 JD" },
    { key: "lab", icon: FlaskConical, price: "Starting 10 JD" },
    { key: "radiology", icon: Activity, price: "Starting 30 JD" },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="mb-6 text-3xl font-bold">{t("title")}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.key} whileHover={{ scale: 1.03 }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }}>
              <Card className="h-full rounded-2xl shadow-lg">
                <CardContent className="flex h-full flex-col p-6">
                  <Icon className="h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">{t(item.key)}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{t(`${item.key}Desc`)}</p>
                  <p className="mt-3 text-sm font-semibold text-primary">{item.price}</p>
                  <Button className="mt-4 rounded-full bg-primary hover:bg-primary/90" onClick={onBookNow}>
                    {t("bookNow")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

