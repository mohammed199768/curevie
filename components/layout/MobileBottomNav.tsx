"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Info, Phone, ClipboardList, Menu, User, LayoutDashboard, LogIn, UserPlus, LogOut, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

export function MobileBottomNav() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const patient = useAuthStore((state) => state.patient);
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const getActiveState = (path: string) => {
    const fullPath = `/${locale}${path ? `/${path}` : ""}`;
    return pathname === fullPath;
  };

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

  const moreLabel = locale === "ar" ? "المزيد" : "More";

  return (
    <>
      {/* The Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-[1.75rem] border-t border-primary/10 bg-background/95 pb-safe pt-2 backdrop-blur-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.06)] md:hidden">
        <div className="relative flex h-16 items-center justify-between px-6 pb-2">
          
          {/* Left Side */}
          <div className="flex flex-1 justify-between pr-6">
            <Link 
              href={`/${locale}/about`} 
              className={cn(
                "flex flex-col items-center gap-1.5 transition-colors",
                getActiveState("about") ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Info className={cn("h-5 w-5", getActiveState("about") && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{t("about")}</span>
            </Link>
            
            <Link 
              href={`/${locale}/contact`} 
              className={cn(
                "flex flex-col items-center gap-1.5 transition-colors",
                getActiveState("contact") ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Phone className={cn("h-5 w-5", getActiveState("contact") && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{t("contact")}</span>
            </Link>
          </div>

          {/* Center Floating Action Button (FAB) - 'C' Logo matching Home */}
          <div className="relative flex w-[70px] justify-center">
            <Link 
              href={`/${locale}`}
              className="absolute -top-12 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[5px] border-background bg-gradient-to-tr from-[#86ab62] via-[#bdd49f] to-[#e4eed7] text-[2.5rem] font-bold tracking-tighter text-[#0A2520] shadow-[0_12px_28px_rgba(134,171,98,0.45)] transition-transform hover:scale-105 active:scale-95"
            >
              <span className="drop-shadow-sm">C</span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex flex-1 items-center justify-between pl-6">
            <button 
              onClick={onToggleLocale}
              className="flex flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <Languages className="h-5 w-5" />
              <span className="text-[10px] font-medium">{locale === "en" ? "العربية" : "English"}</span>
            </button>
            
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className={cn("flex flex-col items-center gap-1.5 transition-colors", open ? "text-primary" : "text-muted-foreground")}>
                  <Menu className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{moreLabel}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[2rem] p-6 pb-12 z-[200]">
                <SheetHeader className="mb-6 border-b pb-4">
                  <SheetTitle className="flex items-center justify-between text-right">
                    <span>{moreLabel}</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col gap-4">
                  {isAuthenticated ? (
                    <>
                      <div className="mb-2 flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                          {patient?.full_name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "PT"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{patient?.full_name || "User"}</div>
                          <div className="truncate text-xs text-muted-foreground">{patient?.email || ""}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button asChild variant="outline" className="h-14 justify-start gap-3 rounded-xl" onClick={() => setOpen(false)}>
                          <Link href={`/${locale}/dashboard`}>
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                            {t("dashboard")}
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-14 justify-start gap-3 rounded-xl" onClick={() => setOpen(false)}>
                          <Link href={`/${locale}/profile`}>
                            <User className="h-5 w-5 text-primary" />
                            {t("profile")}
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-14 justify-start gap-3 rounded-xl col-span-2" onClick={() => setOpen(false)}>
                          <Link href={`/${locale}/requests/new`}>
                            <ClipboardList className="h-5 w-5 text-primary" />
                            {t("newRequest")}
                          </Link>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        className="mt-4 h-14 justify-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground focus:ring-destructive"
                        onClick={() => {
                          setOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        {t("logout")}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="mb-4 text-center text-sm text-muted-foreground">
                        قم بتسجيل الدخول للحصول على تجربة صحية متكاملة
                      </div>
                      <Button asChild size="lg" className="h-14 w-full gap-3 rounded-xl bg-primary hover:bg-primary/90 text-[1.1rem]" onClick={() => setOpen(false)}>
                        <Link href={`/${locale}/login`}>
                          <LogIn className="h-5 w-5" />
                          {t("login")}
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="h-14 w-full gap-3 rounded-xl text-[1.1rem]" onClick={() => setOpen(false)}>
                        <Link href={`/${locale}/register`}>
                          <UserPlus className="h-5 w-5" />
                          {t("getStarted")}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}
