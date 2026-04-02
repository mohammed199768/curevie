"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const onToggleLocale = () => {
    const targetLocale = locale === "en" ? "ar" : "en";
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      router.replace(`/${targetLocale}`);
      return;
    }

    segments[0] = targetLocale;
    router.replace(`/${segments.join("/")}`);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onToggleLocale} className="gap-2">
      <Languages className="h-4 w-4" />
      {locale === "en" ? "AR" : "EN"}
    </Button>
  );
}
