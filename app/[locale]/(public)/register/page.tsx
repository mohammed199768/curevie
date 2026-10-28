"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AreaSelect } from "@/components/orders/AreaSelect";
import { I18nDatePicker } from "@/components/shared/I18nDatePicker";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApiError, getValidationErrors } from "@/lib/utils/apiError"; // FIX: F12 — map backend registration errors into field-level form feedback.
import { getSafeRedirectPath } from "@/lib/utils/safe-redirect";

const schema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirm_password: z.string().min(8),
    phone: z.string().min(7),
    secondary_phone: z.string().max(30).optional().or(z.literal("")),
    area_id: z.string().optional(),
    address: z.string().trim().max(300).optional(),
    gender: z.enum(["male", "female"]),
    date_of_birth: z.string().optional(),
  })
  .refine((value) => value.password === value.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { register } = useAuth();
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
    return () => ctx.revert();
  }, [isRtl]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      phone: "",
      secondary_phone: "",
      area_id: "",
      address: "",
      gender: "male",
      date_of_birth: "",
    },
  });

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[40%_60%]">
      <section className="relative z-10 flex items-center justify-center p-4">
        <Card ref={formRef} className="w-full max-w-xl rounded-2xl shadow-lg border-muted/50">
          <CardContent className="p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">{t("register")}</h2>
            <Form {...form}>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={form.handleSubmit(async (values) => {
                  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
                  try { // FIX: F12 — catch backend registration failures so field errors can be surfaced inline.
                    await register({
                      full_name: values.full_name,
                      email: values.email,
                      password: values.password,
                      phone: values.phone,
                      secondary_phone: values.secondary_phone || undefined,
                      address: values.address?.trim() || undefined,
                      area_id: values.area_id || undefined,
                      gender: values.gender,
                      date_of_birth: values.date_of_birth || undefined,
                      redirectTo: redirectPath,
                    });
                  } catch (error) { // FIX: F12 — map backend registration codes into react-hook-form errors when possible.
                    const apiError = getApiError(error);
                    if (apiError.code === "EMAIL_EXISTS") {
                      form.setError("email", { message: t("emailExists") });
                      return;
                    }
                    const fieldErrors = apiError.code === "VALIDATION_ERROR" ? getValidationErrors(error) : {};
                    const knownFields = Object.keys(form.getValues());
                    const inline = Object.entries(fieldErrors).filter(([field]) => knownFields.includes(field));
                    inline.forEach(([field, message]) => form.setError(field as keyof Values, { message }));
                    // Anything that cannot be attached to a field (rate limit, server error...) still reaches the user.
                    if (!inline.length) toast.error(apiError.error);
                  }
                })}
              >
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem><FormLabel>{t("fullName")}</FormLabel><FormControl><Input className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>{t("email")}</FormLabel><FormControl><Input type="email" className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>{t("password")}</FormLabel><FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} className="h-10 pe-10" {...field} /><button type="button" className="absolute inset-y-0 end-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="confirm_password" render={({ field }) => (
                  <FormItem><FormLabel>{t("confirmPassword")}</FormLabel><FormControl><Input type={showPassword ? "text" : "password"} className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>{t("phone")}</FormLabel><FormControl><Input className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="secondary_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("secondaryPhone")} <span className="text-xs text-muted-foreground">({t("optional")})</span></FormLabel>
                    <FormControl><Input className="h-10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="area_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("area")} <span className="text-xs text-muted-foreground">({t("optional")})</span></FormLabel>
                    <FormControl>
                      <AreaSelect value={field.value} onChange={field.onChange} allowEmpty />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("address")} <span className="text-xs text-muted-foreground">({t("optional")})</span></FormLabel>
                    <FormControl><Input className="h-10" placeholder={t("addressPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gender")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-4 pt-2">
                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={field.value === "male"} onChange={() => field.onChange("male")} />{t("male")}</label>
                        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={field.value === "female"} onChange={() => field.onChange("female")} />{t("female")}</label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>{t("dateOfBirth")}</FormLabel><FormControl><I18nDatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="md:col-span-2 pt-2">
                  <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t("registering") : t("registerButton")}
                  </Button>
                </div>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("alreadyHaveAccount")} <Link className="font-semibold text-primary hover:underline" href={`/${locale}/login`}>{t("login")}</Link>
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
          <h1 className="text-4xl font-bold lg:text-5xl">{t("registerTitle")}</h1>
          <p className="mt-4 max-w-lg text-lg text-white/90">{t("registerSubtitle")}</p>
        </div>
      </aside>
    </div>
  );
}

