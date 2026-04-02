"use client";

import Link from "next/link";
import { Bell, ChevronDown, UserCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

function getTitle(pathname: string, t: ReturnType<typeof useTranslations>) {
  if (pathname.includes("/requests/new")) return t("newRequest");
  if (pathname.includes("/requests/")) return t("requestDetails");
  if (pathname.includes("/requests")) return t("requests");
  if (pathname.includes("/invoices")) return t("invoices");
  if (pathname.includes("/reports")) return t("reports");
  if (pathname.includes("/chat")) return t("chat");
  if (pathname.includes("/notifications")) return t("notifications");
  if (pathname.includes("/profile")) return t("profile");
  return t("dashboard");
}

export function DashboardHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { logout } = useAuth();
  const patient = useAuthStore((state) => state.patient);
  const unreadNotifications = useUiStore((state) => state.unreadNotifications);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <h1 className="text-lg font-semibold">{getTitle(pathname, t)}</h1>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />

          <Button asChild variant="outline" size="icon" className="relative">
            <Link href={`/${locale}/notifications`}>
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full p-0" variant="destructive">
                  {unreadNotifications}
                </Badge>
              ) : null}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {patient?.full_name
                      ?.split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "PT"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm md:inline">{patient?.full_name || "Patient"}</span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2">
                <UserCircle2 className="h-4 w-4" />
                {patient?.email || "patient@curevie.com"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/profile`}>{t("profile")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>{t("logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

