"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { appButton } from "@/components/app/ui";
import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/AuthShell";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getSafeRedirectPath } from "@/lib/utils/safe-redirect";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { login } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(() => z.object({ email: z.string().email(), password: z.string().min(1) }), []);
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (hydrated && isAuthenticated && accessToken) {
      const redirectParam = new URLSearchParams(window.location.search).get("redirect");
      router.replace(getSafeRedirectPath(redirectParam) || `/${locale}/dashboard`);
    }
  }, [accessToken, hydrated, isAuthenticated, locale, router]);

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link className="font-bold text-[#104d49] hover:underline dark:text-teal-200" href={`/${locale}/register`}>
            {t("registerNow")}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            const redirectParam =
              typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
            await login({ ...values, redirectTo: getSafeRedirectPath(redirectParam) });
          })}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("email")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" autoComplete="email" inputMode="email" dir="ltr" {...field} className={cn(authInputClass, "ps-12 text-start rtl:text-end")} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("password")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      {...field}
                      className={cn(authInputClass, "pe-12 ps-12")}
                    />
                    <button
                      type="button"
                      aria-label={t("password")}
                      className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <button type="button" className="min-h-10 rounded-full px-2 text-[14px] font-semibold text-[#104d49] hover:underline dark:text-teal-200">
              {t("forgot")}
            </button>
          </div>
          <button type="submit" className={cn(appButton.primary, "min-h-14 w-full text-[16px]")} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {form.formState.isSubmitting ? t("loggingIn") : t("loginButton")}
          </button>
        </form>
      </Form>
    </AuthShell>
  );
}
