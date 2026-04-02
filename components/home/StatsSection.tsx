"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function Counter({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.floor(target / 50));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(start);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{value}+</span>;
}

export function StatsSection() {
  const t = useTranslations("stats");

  return (
    <section className="bg-green-600 py-14 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 text-center md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-4xl font-bold"><Counter target={500} /></p>
          <p className="mt-2 text-sm">{t("patients")}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
          <p className="text-4xl font-bold"><Counter target={50} /></p>
          <p className="mt-2 text-sm">{t("providers")}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
          <p className="text-4xl font-bold"><Counter target={15} /></p>
          <p className="mt-2 text-sm">{t("services")}</p>
        </motion.div>
      </div>
    </section>
  );
}

