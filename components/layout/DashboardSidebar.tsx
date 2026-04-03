"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  PlusCircle,
  Receipt,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const items = [
  { key: "dashboard", href: "dashboard", icon: Home },
  { key: "requests", href: "requests", icon: ClipboardList },
  { key: "newRequest", href: "requests/new", icon: PlusCircle },
  { key: "invoices", href: "invoices", icon: Receipt },
  { key: "reports", href: "reports", icon: FileText },
  { key: "chat", href: "chat", icon: MessageCircle },
  { key: "notifications", href: "notifications", icon: Bell },
  { key: "profile", href: "profile", icon: User },
] as const;

interface DashboardSidebarProps {
  locale: string;
}

export function DashboardSidebar({ locale }: DashboardSidebarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const unreadNotifications = useUiStore((state) => state.unreadNotifications);
  const unreadChat = useUiStore((state) => state.unreadChat);
  const patient = useAuthStore((state) => state.patient);
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r bg-card">
      <div className="border-b px-4 py-5">
        <Link href={`/${locale}`} className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/1.png"
            alt="Curevie"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const href = `/${locale}/${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </span>
              {item.key === "notifications" && unreadNotifications > 0 ? (
                <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1">
                  {unreadNotifications}
                </Badge>
              ) : item.key === "chat" && unreadChat > 0 ? (
                <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1">
                  {unreadChat > 9 ? "9+" : unreadChat}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <div className="rounded-2xl border bg-background p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {patient?.full_name
                  ?.split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "PT"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{patient?.full_name || tCommon("patientFallback")}</p>
              <p className="truncate text-xs text-muted-foreground">{patient?.email || "-"}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span />
            <span className="text-xs text-muted-foreground">{tCommon("pointsBalance", { count: patient?.points || 0 })}</span>
          </div>
        </div>

        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}

