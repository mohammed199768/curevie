"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { gsap } from "gsap";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { login } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const isRtl = locale === "ar";

  useEffect(() => {
    const ctx = gsap.context(() => {
      const xOffset = isRtl ? -200 : 200; // Slide from the direction of the green aside
      gsap.from(formRef.current, { x: xOffset, opacity: 0, duration: 1, ease: "power3.out" });
      if (asideRef.current) gsap.from(asideRef.current.children, { x: -xOffset / 2, opacity: 0, stagger: 0.15, duration: 1, ease: "power3.out", delay: 0.2 });
    });
    return () => ctx.revert(); // Ensures GSAP instances are killed on unmount, optimizing CPU
  }, [isRtl]);

  const schema = useMemo(() => z.object({ email: z.string().email(), password: z.string().min(1) }), []);
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (hydrated && isAuthenticated && accessToken) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [accessToken, hydrated, isAuthenticated, locale, router]);

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[40%_60%]">
      <section className="relative z-10 flex items-center justify-center p-4">
        <Card ref={formRef} className="w-full max-w-md rounded-2xl shadow-lg border-muted/50">
          <CardContent className="p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">{t("login")}</h2>
            <Form {...form}>
              <form
                className="space-y-5"
                onSubmit={form.handleSubmit(async (values) => {
                  const redirectParam =
                    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
                  const redirectPath = redirectParam?.startsWith("/") ? redirectParam : undefined;
                  await login({ ...values, redirectTo: redirectPath });
                })}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} {...field} className="h-11 pe-10" />
                          <button
                            type="button"
                            className="absolute inset-y-0 end-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-end text-sm">
                  <button type="button" className="text-primary font-medium hover:underline">{t("forgot")}</button>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t("loggingIn") : t("loginButton")}
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("noAccount")} <Link className="font-semibold text-primary hover:underline" href={`/${locale}/register`}>{t("registerNow")}</Link>
            </p>
          </CardContent>
        </Card>
      </section>

      <aside ref={asideRef} className="hero-gradient relative z-20 hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-1 items-center justify-center py-10">
          <svg className="w-full max-w-sm opacity-90 transition-transform duration-700 hover:scale-105 drop-shadow-2xl" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="500" height="400" rx="40" fill="url(#paint0_linear)" fillOpacity="0.1"/>
            <path d="M250 120C250 120 180 120 180 190C180 260 250 310 250 310C250 310 320 260 320 190C320 120 250 120 250 120Z" fill="white" fillOpacity="0.2"/>
            <path d="M190 200h35l20-40 30 90 20-50h45" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="250" cy="200" r="140" stroke="white" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="10 10"/>
            <defs>
              <linearGradient id="paint0_linear" x1="0" y1="0" x2="500" y2="400" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.5"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="text-start">
          <h1 className="text-4xl font-bold lg:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-lg text-lg text-white/90">{t("subtitle")}</p>
        </div>
      </aside>
    </div>
  );
}

