"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, LogOut, MessageCircle, UserCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf, resolveHeaderRoute, stripLocale } from "@/lib/app-routes";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const circleButton =
  "app-press relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-[var(--app-card-border)]";

function CountBadge({ count, isRtl }: { count: number; isRtl: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold text-white ring-2 ring-[var(--app-bg)]",
        isRtl ? "-left-1" : "-right-1",
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function DashboardHeader() {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const pathname = usePathname();
  const { logout } = useAuth();
  const patient = useAuthStore((state) => state.patient);
  const unreadNotifications = useUiStore((state) => state.unreadNotifications);
  const unreadChat = useUiStore((state) => state.unreadChat);

  const path = stripLocale(pathname, locale);
  const route = resolveHeaderRoute(path);
  const isHome = route.titleKey === "dashboard";
  const onChat = path.startsWith("/chat");
  const onNotifications = path.startsWith("/notifications");
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const firstName = patient?.full_name?.split(" ").filter(Boolean)[0];

  return (
    <header className="sticky top-0 z-30 bg-[var(--app-bg-glass)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center gap-3 px-4 md:h-[76px] md:px-8">
        {route.parent ? (
          <Link href={`/${locale}${route.parent}`} className={circleButton} aria-label={tApp("back")}>
            <BackIcon className="h-5 w-5" />
          </Link>
        ) : isHome ? (
          <Link href={`/${locale}`} className="shrink-0 md:hidden" aria-label="Curevie">
            <Image src="/icon.png" alt="" width={44} height={44} className="h-11 w-11 rounded-2xl bg-[#104d49] object-contain p-1.5" priority />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          {isHome ? (
            <>
              <p className="truncate text-[13px] text-muted-foreground">{tApp("greeting")}</p>
              <p className="truncate text-[18px] font-bold text-foreground">{firstName || tApp("greetingFallback")}</p>
            </>
          ) : (
            <h1 className="truncate text-[19px] font-bold text-foreground md:text-[22px]">{t(route.titleKey)}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          {!onChat ? (
            <Link href={`/${locale}/chat`} className={circleButton} aria-label={t("chat")}>
              <MessageCircle className="h-5 w-5" />
              <CountBadge count={unreadChat} isRtl={isRtl} />
            </Link>
          ) : null}

          {!onNotifications ? (
            <>
              <Link href={`/${locale}/notifications`} className={cn(circleButton, "md:hidden")} aria-label={t("notifications")}>
                <Bell className="h-5 w-5" />
                <CountBadge count={unreadNotifications} isRtl={isRtl} />
              </Link>
              <div className="hidden md:block">
                <NotificationDropdown unreadCount={unreadNotifications} />
              </div>
            </>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="app-press hidden rounded-full ring-1 ring-[var(--app-card-border)] md:inline-flex" aria-label={t("profile")}>
                <Avatar className="h-11 w-11">
                  {patient?.avatar_url ? <AvatarImage src={patient.avatar_url} alt="" className="object-cover" /> : null}
                  <AvatarFallback className="bg-[#e6f0ee] font-semibold text-[#104d49]">{initialsOf(patient?.full_name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
              <div className="flex items-center gap-2 px-2 py-2 text-sm">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{patient?.email || "-"}</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl py-2.5">
                <Link href={`/${locale}/profile`}>{t("profile")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="gap-2 rounded-xl py-2.5 text-rose-700">
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
