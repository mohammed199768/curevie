"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, FileText, Home, LogOut, MessageCircle, Plus, Receipt, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/useAuth";
import { initialsOf, stripLocale } from "@/lib/app-routes";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const items = [
  { key: "dashboard", href: "/dashboard", icon: Home },
  { key: "requests", href: "/requests", icon: ClipboardList },
  { key: "invoices", href: "/invoices", icon: Receipt },
  { key: "reports", href: "/reports", icon: FileText },
  { key: "chat", href: "/chat", icon: MessageCircle },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "profile", href: "/profile", icon: User },
] as const;

interface DashboardSidebarProps {
  locale: string;
}

export function DashboardSidebar({ locale }: DashboardSidebarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const path = stripLocale(pathname, locale);
  const unreadNotifications = useUiStore((state) => state.unreadNotifications);
  const unreadChat = useUiStore((state) => state.unreadChat);
  const patient = useAuthStore((state) => state.patient);
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-[260px] flex-col border-e border-[var(--app-card-border)] bg-card">
      <div className="px-6 pb-4 pt-6">
        <Link href={`/${locale}`} className="inline-flex items-center transition-opacity hover:opacity-80">
          <Image src="/1.png" alt="Curevie" width={124} height={42} className="object-contain" priority />
        </Link>
      </div>

      <div className="px-4">
        <Link
          href={`/${locale}/requests/new`}
          className="app-press flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#104d49] px-4 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(16,77,73,0.7)] hover:bg-[#0d4440]"
        >
          <Plus className="h-5 w-5" />
          {t("newRequest")}
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = path === item.href || (path.startsWith(`${item.href}/`) && !path.startsWith("/requests/new"));
          const Icon = item.icon;
          const badge = item.key === "notifications" ? unreadNotifications : item.key === "chat" ? unreadChat : 0;

          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "app-press flex min-h-12 items-center justify-between gap-2 rounded-2xl px-3.5 text-[15px] font-medium transition-colors",
                active
                  ? "bg-[#e6f0ee] font-semibold text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100"
                  : "text-muted-foreground hover:bg-[#f3f7f5] hover:text-foreground dark:hover:bg-white/5",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {t(item.key)}
              </span>
              {badge > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5484d] px-1.5 text-[11px] font-bold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--app-card-border)] p-4">
        <Link href={`/${locale}/profile`} className="app-press flex items-center gap-3 rounded-2xl p-2 hover:bg-[#f3f7f5] dark:hover:bg-white/5">
          <Avatar className="h-11 w-11">
            {patient?.avatar_url ? <AvatarImage src={patient.avatar_url} alt="" className="object-cover" /> : null}
            <AvatarFallback className="bg-[#e6f0ee] font-semibold text-[#104d49]">{initialsOf(patient?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{patient?.full_name || tCommon("patientFallback")}</p>
            <p className="truncate text-[12px] text-muted-foreground">{patient?.email || "-"}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={logout}
          className="app-press flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-[14px] font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}
