"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { appButton } from "@/components/app/ui";
import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/AuthShell";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AreaSelect } from "@/components/orders/AreaSelect";
import { I18nDatePicker } from "@/components/shared/I18nDatePicker";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApiError, getValidationErrors } from "@/lib/utils/apiError"; // FIX: F12 - map backend registration errors into field-level form feedback.
import { getSafeRedirectPath } from "@/lib/utils/safe-redirect";
import { cn } from "@/lib/utils";

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

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 flex w-full items-center gap-3 text-[13px] font-bold text-[#5a7a50] dark:text-lime-200">
        {title}
        <span className="h-px flex-1 bg-[var(--app-card-border)]" aria-hidden="true" />
      </legend>
      {children}
    </fieldset>
  );
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app.auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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

  const optional = <span className="text-[12.5px] font-normal text-muted-foreground">({t("optional")})</span>;

  return (
    <AuthShell
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      compactHero
      footer={
        <>
          {t("alreadyHaveAccount")}{" "}
          <Link className="font-bold text-[#104d49] hover:underline dark:text-teal-200" href={`/${locale}/login`}>
            {t("login")}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form
          className="space-y-7"
          onSubmit={form.handleSubmit(async (values) => {
            const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
            try { // FIX: F12 - catch backend registration failures so field errors can be surfaced inline.
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
            } catch (error) { // FIX: F12 - map backend registration codes into react-hook-form errors when possible.
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
          <Group title={tApp("accountSection")}>
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("fullName")}</FormLabel>
                <FormControl><Input autoComplete="name" className={authInputClass} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("email")}</FormLabel>
                <FormControl><Input type="email" autoComplete="email" inputMode="email" dir="ltr" className={cn(authInputClass, "text-start rtl:text-end")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("password")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} autoComplete="new-password" className={cn(authInputClass, "pe-12")} {...field} />
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
            )} />
            <FormField control={form.control} name="confirm_password" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("confirmPassword")}</FormLabel>
                <FormControl><Input type={showPassword ? "text" : "password"} autoComplete="new-password" className={authInputClass} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Group>

          <Group title={tApp("contactSection")}>
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("phone")}</FormLabel>
                <FormControl><Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={cn(authInputClass, "text-start rtl:text-end")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="secondary_phone" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("secondaryPhone")} {optional}</FormLabel>
                <FormControl><Input type="tel" inputMode="tel" dir="ltr" className={cn(authInputClass, "text-start rtl:text-end")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="area_id" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("area")} {optional}</FormLabel>
                <FormControl>
                  <AreaSelect value={field.value} onChange={field.onChange} allowEmpty withIcon className={authInputClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("address")} {optional}</FormLabel>
                <FormControl><Input autoComplete="street-address" className={authInputClass} placeholder={t("addressPlaceholder")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Group>

          <Group title={tApp("personalSection")}>
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("gender")}</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e9efed] p-1 dark:bg-white/5" role="radiogroup">
                    {(["male", "female"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          "min-h-11 rounded-xl text-[15px] font-semibold transition-colors",
                          field.value === value ? "bg-card text-[#104d49] shadow-sm dark:text-teal-50" : "text-muted-foreground",
                        )}
                      >
                        {t(value)}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="date_of_birth" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={authLabelClass}>{t("dateOfBirth")}</FormLabel>
                <FormControl><I18nDatePicker value={field.value} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </Group>

          <button type="submit" className={cn(appButton.primary, "min-h-14 w-full text-[16px]")} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {form.formState.isSubmitting ? t("registering") : t("registerButton")}
          </button>
        </form>
      </Form>
    </AuthShell>
  );
}
