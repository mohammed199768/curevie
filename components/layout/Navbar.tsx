"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileBottomNav } from "./MobileBottomNav";

const navItems = [
  { key: "home", path: "" },
  { key: "about", path: "about" },
  { key: "contact", path: "contact" },
];

export function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const patient = useAuthStore((state) => state.patient);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 hidden border-b border-primary/10 bg-background/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href={`/${locale}`} className="flex items-center">
            <Image
              src="/1.png"
              alt="Curevie"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const href = `/${locale}${item.path ? `/${item.path}` : ""}`;
              const active = pathname === href;
              return (
                <Link key={item.key} href={href} className={cn("relative text-sm font-medium transition-colors hover:text-foreground", active ? "text-primary" : "text-foreground/80")}>
                  {t(item.key as "home" | "about" | "contact")}
                  <span
                    className={cn(
                      "absolute -bottom-1 left-0 h-0.5 bg-primary transition-all",
                      active ? "w-full" : "w-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 md:flex">
            <LocaleSwitcher />

            {!isAuthenticated ? (
              <>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/${locale}/login`}>{t("login")}</Link>
                </Button>
                <Button asChild className="rounded-full bg-primary hover:bg-primary/90">
                  <Link href={`/${locale}/register`}>{t("getStarted")}</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full p-0">
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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/dashboard`}>{t("dashboard")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/profile`}>{t("profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>{t("logout")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Mobile minimal header just has an invisible space on the right to keep logo left-aligned, since everything else is hidden. */}
        </div>
      </header>

      {/* Render the specialized Mobile Bottom Navbar */}
      <MobileBottomNav variant="public" />
    </>
  );
}

