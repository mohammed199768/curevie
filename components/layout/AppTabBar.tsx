"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardList, Home, Plus, Receipt, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { stripLocale } from "@/lib/app-routes";

const TABS = [
  { key: "home", href: "/dashboard", icon: Home, match: ["/dashboard"] },
  { key: "orders", href: "/requests", icon: ClipboardList, match: ["/requests"] },
  { key: "new", href: "/requests/new", icon: Plus, match: [] as string[] },
  { key: "invoices", href: "/invoices", icon: Receipt, match: ["/invoices"] },
  { key: "profile", href: "/profile", icon: User, match: ["/profile", "/reports"] },
] as const;

/** Screens that own the bottom of the viewport (sticky checkout bar, chat composer). */
export function isTabBarHidden(path: string) {
  return path.startsWith("/requests/new") || path.startsWith("/chat");
}

/** Mobile bottom tab bar of the logged-in area, with a raised "New order" action in the middle. */
export function AppTabBar() {
  const locale = useLocale();
  const pathname = usePathname();
  const tApp = useTranslations("app");
  const reduceMotion = useReducedMotion();
  const path = stripLocale(pathname, locale);

  if (isTabBarHidden(path)) return null;

  return (
    <nav
      aria-label={tApp("tabBarLabel")}
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end rounded-[26px] border border-[var(--app-card-border)] bg-card/95 px-1.5 pb-1.5 pt-1.5 shadow-[0_18px_40px_-18px_rgba(16,49,45,0.45)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const href = `/${locale}${tab.href}`;
          const Icon = tab.icon;

          if (tab.key === "new") {
            return (
              <Link
                key={tab.key}
                href={href}
                className="app-press group flex flex-1 flex-col items-center gap-1 pb-1"
                aria-label={tApp(`tabs.${tab.key}`)}
              >
                <span className="-mt-7 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#104d49] text-white shadow-[0_12px_24px_-8px_rgba(16,77,73,0.7)] ring-[5px] ring-[var(--app-bg)] transition-transform group-active:scale-95">
                  <Plus className="h-7 w-7" strokeWidth={2.4} />
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold text-[#104d49] dark:text-teal-200">{tApp(`tabs.${tab.key}`)}</span>
              </Link>
            );
          }

          const active = tab.match.some((prefix) => path === prefix || (path.startsWith(`${prefix}/`) && !path.startsWith("/requests/new")));

          return (
            <Link
              key={tab.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className="app-press flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1"
            >
              <span className="relative flex h-8 w-14 items-center justify-center">
                {active ? (
                  <motion.span
                    layoutId="app-tab-pill"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-full bg-[#e6f0ee] dark:bg-teal-500/20"
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative h-[22px] w-[22px] transition-colors",
                    active ? "text-[#104d49] dark:text-teal-200" : "text-[#7d8789]",
                  )}
                  strokeWidth={active ? 2.3 : 2}
                />
              </span>
              <span
                className={cn(
                  "max-w-full truncate px-0.5 text-[11px] leading-none transition-colors",
                  active ? "font-bold text-[#104d49] dark:text-teal-200" : "font-medium text-[#7d8789]",
                )}
              >
                {tApp(`tabs.${tab.key}`)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
