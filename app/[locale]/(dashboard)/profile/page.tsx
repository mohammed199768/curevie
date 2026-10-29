"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Crown,
  FileText,
  HeartPulse,
  Languages,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Sun,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AppCard, ForwardChevron, IconBubble, Shimmer, appButton } from "@/components/app/ui";
import { AreaSelect } from "@/components/orders/AreaSelect";
import { I18nDatePicker } from "@/components/shared/I18nDatePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/lib/api/auth";
import { patientsApi } from "@/lib/api/patients";
import type { PatientUser } from "@/lib/api/types";
import { initialsOf } from "@/lib/app-routes";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getApiError, getValidationErrors } from "@/lib/utils/apiError"; // FIX: F12 - reuse the shared backend error parser in patient profile mutations.
import { cn } from "@/lib/utils";

interface TranslationValues {
  [key: string]: string | number;
}

interface ProfileFormValues {
  full_name: string;
  phone: string;
  area_id?: string;
  address: string;
  gender: "male" | "female" | "other";
  date_of_birth?: string;
}

interface MedicalFormValues {
  height?: number;
  weight?: number;
  allergies?: string;
}

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface PatientProfileData extends PatientUser {
  height?: number | string | null;
  weight?: number | string | null;
  allergies?: string | null;
}

interface PatientProfileResponse {
  patient?: PatientProfileData | null;
}

type TranslateFn = (key: string, values?: TranslationValues) => string;
type Section = "personal" | "medical" | "security" | "appearance";

const SECTIONS: Section[] = ["personal", "medical", "security", "appearance"];

const fieldClass =
  "h-12 rounded-2xl border-[#dbe6e0] bg-card px-4 text-[16px] shadow-none focus-visible:ring-2 focus-visible:ring-[#86ab62] md:text-[16px] dark:border-border";
const labelClass = "px-1 text-[14px] font-semibold text-foreground";

function createPersonalSchema(t: TranslateFn) {
  return z.object({
    full_name: z.string().min(2, t("validation.fullNameMin")),
    phone: z.string().min(7, t("validation.phoneMin")),
    area_id: z.string().optional(),
    address: z.string().min(3, t("validation.addressMin")),
    gender: z.enum(["male", "female", "other"]),
    date_of_birth: z.string().optional(),
  });
}

function createMedicalSchema() {
  return z.object({
    height: z.number().optional(),
    weight: z.number().optional(),
    allergies: z.string().optional(),
  });
}

function createPasswordSchema(t: TranslateFn) {
  return z
    .object({
      current_password: z.string().min(1, t("validation.currentPasswordRequired")),
      new_password: z.string().min(8, t("validation.newPasswordMin")),
      confirm_password: z.string().min(8, t("validation.confirmPasswordMin")),
    })
    .refine((value) => value.new_password === value.confirm_password, {
      path: ["confirm_password"],
      message: t("validation.passwordsDoNotMatch"),
    });
}

function normalizeGender(value?: string | null): ProfileFormValues["gender"] {
  return value === "female" || value === "other" ? value : "male";
}

function SaveButton({ pending, label }: { pending?: boolean; label: string }) {
  return (
    <button type="submit" className={cn(appButton.primary, "w-full")} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
    </button>
  );
}

function ProfileInfoForm({
  personalForm,
  pending,
  t,
  tCommon,
  tEnums,
  onSubmit,
}: {
  personalForm: UseFormReturn<ProfileFormValues>;
  pending: boolean;
  t: TranslateFn;
  tCommon: TranslateFn;
  tEnums: TranslateFn;
  onSubmit: (values: ProfileFormValues) => void;
}) {
  return (
    <Form {...personalForm}>
      <form className="space-y-4" onSubmit={personalForm.handleSubmit(onSubmit)}>
        <FormField
          control={personalForm.control}
          name="full_name"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("fullName")}</FormLabel>
              <FormControl>
                <Input {...field} className={fieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={personalForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("phone")}</FormLabel>
              <FormControl>
                <Input {...field} type="tel" inputMode="tel" dir="ltr" className={cn(fieldClass, "text-start rtl:text-end")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={personalForm.control}
          name="area_id"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("area")}</FormLabel>
              <FormControl>
                <AreaSelect value={field.value} onChange={field.onChange} allowEmpty withIcon className={fieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={personalForm.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("address")}</FormLabel>
              <FormControl>
                <Input {...field} className={fieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={personalForm.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("dateOfBirth")}</FormLabel>
              <FormControl>
                <I18nDatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={personalForm.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={labelClass}>{t("gender")}</FormLabel>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#e9efed] p-1 dark:bg-white/5" role="radiogroup">
                {(["male", "female", "other"] as const).map((value) => (
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
                    {tEnums(value)}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-1">
          <SaveButton pending={pending} label={tCommon("saveChanges")} />
        </div>
      </form>
    </Form>
  );
}

function ProfileSecurityForm({
  isPending,
  passwordForm,
  t,
  tCommon,
  onSubmit,
}: {
  isPending: boolean;
  passwordForm: UseFormReturn<PasswordFormValues>;
  t: TranslateFn;
  tCommon: TranslateFn;
  onSubmit: (values: PasswordFormValues) => void;
}) {
  return (
    <Form {...passwordForm}>
      <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onSubmit)}>
        {(["current_password", "new_password", "confirm_password"] as const).map((name) => (
          <FormField
            key={name}
            control={passwordForm.control}
            name={name}
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={labelClass}>
                  {t(name === "current_password" ? "currentPassword" : name === "new_password" ? "newPassword" : "confirmPassword")}
                </FormLabel>
                <FormControl>
                  <Input type="password" autoComplete={name === "current_password" ? "current-password" : "new-password"} {...field} className={fieldClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="pt-1">
          <SaveButton pending={isPending} label={tCommon("saveChanges")} />
        </div>
      </form>
    </Form>
  );
}

function MenuRow({
  icon,
  tone,
  label,
  value,
  onClick,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: Parameters<typeof IconBubble>[0]["tone"];
  label: string;
  value?: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <IconBubble icon={icon} tone={tone} className="h-10 w-10 rounded-xl" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{label}</span>
      {value ? <span className="max-w-[40%] truncate text-[14px] text-muted-foreground">{value}</span> : null}
      <ForwardChevron className="text-muted-foreground/60" />
    </>
  );
  const className = "app-press flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-[#f7faf9] dark:hover:bg-white/5";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileScreen />
    </Suspense>
  );
}

function ProfileScreen() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("profilePage");
  const tApp = useTranslations("app.profile");
  const tHome = useTranslations("app.home");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const openedFromMenuRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sectionParam = searchParams.get("section");
  const section = SECTIONS.includes(sectionParam as Section) ? (sectionParam as Section) : null;

  const patient = useAuthStore((state) => state.patient);
  const patchPatient = useAuthStore((state) => state.patchPatient);
  const { logout } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const personalSchema = createPersonalSchema(t);
  const medicalSchema = createMedicalSchema();
  const passwordSchema = createPasswordSchema(t);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const patientQuery = useQuery({
    queryKey: ["patient", patient?.id],
    queryFn: async (): Promise<PatientProfileData | null> => {
      if (!patient?.id) return null;

      const response = await patientsApi.getById(patient.id);
      const data = response.data;

      if (data && typeof data === "object" && "patient" in data) {
        const nestedData = (data as PatientProfileResponse).patient;
        return nestedData ?? null;
      }

      return data;
    },
    enabled: Boolean(patient?.id),
  });

  const personalForm = useForm<ProfileFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      full_name: patient?.full_name || "",
      phone: patient?.phone || "",
      area_id: patient?.area_id || "",
      address: patient?.address || "",
      gender: normalizeGender(patient?.gender),
      date_of_birth: patient?.date_of_birth || "",
    },
  });

  const medicalForm = useForm<MedicalFormValues>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      height: undefined,
      weight: undefined,
      allergies: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    const data = patientQuery.data;
    if (!data) return;

    personalForm.reset({
      full_name: data.full_name || "",
      phone: data.phone || "",
      area_id: data.area_id || "",
      address: data.address || "",
      gender: normalizeGender(data.gender),
      date_of_birth: data.date_of_birth || "",
    });

    medicalForm.reset({
      height: data.height ? Number(data.height) : undefined,
      weight: data.weight ? Number(data.weight) : undefined,
      allergies: data.allergies || "",
    });
  }, [medicalForm, patientQuery.data, personalForm]);

  const updatePersonal = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!patient?.id) return;
      const response = await patientsApi.updateProfile(patient.id, {
        ...values,
        area_id: values.area_id || null,
        date_of_birth: values.date_of_birth || undefined,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!data) return;

      patchPatient({
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
        area_id: data.area_id ?? null,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
      });
      toast.success(t("profileUpdated"));
    },
    onError: () => toast.error(t("profileUpdateFailed")),
  });

  const updateMedical = useMutation({
    mutationFn: async (values: MedicalFormValues) => {
      if (!patient?.id) return;
      await patientsApi.updateMedical(patient.id, values);
    },
    onSuccess: () => toast.success(t("medicalUpdated")),
    onError: () => toast.error(t("medicalUpdateFailed")),
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordFormValues) => authApi.changePassword(values),
    onSuccess: () => {
      passwordForm.reset();
      // The backend revokes every session after a password change, so sign in again.
      toast.success(t("passwordUpdatedRelogin"));
      void logout();
    },
    onError: (error) => {
      const { code, error: message } = getApiError(error); // FIX: F12 - inspect backend password-change codes before choosing patient feedback.
      if (code === "VALIDATION_ERROR") {
        Object.entries(getValidationErrors(error)).forEach(([field, validationMessage]) => {
          passwordForm.setError(field as keyof PasswordFormValues, { message: validationMessage });
        });
        toast.error(t("validationError"));
        return;
      }
      if (code === "INVALID_CURRENT_PASSWORD") {
        passwordForm.setError("current_password", { message: "Current password is incorrect" });
      }
      toast.error(message || t("passwordUpdateFailed"));
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async () => {
      if (!patient?.id || !avatarFile) return;
      const formData = new FormData();
      formData.append("file", avatarFile); // FIX: F1 - backend upload.js expects field name "file".
      return (await patientsApi.updateAvatar(patient.id, formData)).data;
    },
    onSuccess: (data) => {
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (data) patchPatient({ avatar_url: data.avatar_url ?? null });
      toast.success(t("avatarUploaded"));
    },
    onError: (error) => {
      const { code, error: message } = getApiError(error);
      if (code === "INVALID_FILE_TYPE" || code === "INVALID_FILE_CONTENTS") {
        toast.error(message);
        return;
      }
      toast.error(message || t("avatarUploadFailed"));
    },
  });

  const switchLocale = (targetLocale: "en" | "ar") => {
    const segments = pathname.split("/").filter(Boolean);
    if (!segments.length) {
      router.replace(`/${targetLocale}`);
      return;
    }
    segments[0] = targetLocale;
    const query = searchParams.toString();
    router.replace(`/${segments.join("/")}${query ? `?${query}` : ""}`);
  };

  const openSection = (next: Section) => {
    openedFromMenuRef.current = true;
    router.push(`${pathname}?section=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  const closeSection = () => {
    if (openedFromMenuRef.current) {
      openedFromMenuRef.current = false;
      router.back();
      return;
    }
    router.replace(pathname, { scroll: false });
  };

  const profilePatient = patientQuery.data ?? patient ?? null;
  const vipPercent = Number(profilePatient?.vip_discount || 0);
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const themeLabel = theme === "dark" ? tCommon("dark") : theme === "light" ? tCommon("light") : tCommon("system");

  if (section) {
    const titles: Record<Section, string> = {
      personal: t("personalTitle"),
      medical: t("medicalTitle"),
      security: t("securityTitle"),
      appearance: t("appearanceTitle"),
    };

    return (
      <div className="mx-auto max-w-xl space-y-4">
        <button type="button" onClick={closeSection} className="app-press inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-[15px] font-semibold text-[#104d49] dark:text-teal-200">
          <BackIcon className="h-5 w-5" />
          {t("title")}
        </button>
        <h1 className="px-1 text-[24px] font-bold text-foreground">{titles[section]}</h1>

        <AppCard className="p-5">
          {section === "personal" ? (
            patientQuery.isLoading && !patientQuery.data ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((key) => (
                  <Shimmer key={key} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <ProfileInfoForm
                personalForm={personalForm}
                pending={updatePersonal.isPending}
                t={t}
                tCommon={tCommon}
                tEnums={tEnums}
                onSubmit={(values) => updatePersonal.mutate(values)}
              />
            )
          ) : null}

          {section === "medical" ? (
            <Form {...medicalForm}>
              <form className="space-y-4" onSubmit={medicalForm.handleSubmit((values) => updateMedical.mutate(values))}>
                <div className="grid grid-cols-2 gap-3">
                  {(["height", "weight"] as const).map((name) => (
                    <FormField
                      key={name}
                      control={medicalForm.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={labelClass}>{t(name)}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              className={fieldClass}
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormField
                  control={medicalForm.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className={labelClass}>{t("allergies")}</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} className="rounded-2xl border-[#dbe6e0] px-4 py-3 text-[16px] dark:border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SaveButton pending={updateMedical.isPending} label={tCommon("saveChanges")} />
              </form>
            </Form>
          ) : null}

          {section === "security" ? (
            <ProfileSecurityForm
              isPending={changePassword.isPending}
              passwordForm={passwordForm}
              t={t}
              tCommon={tCommon}
              onSubmit={(values) => changePassword.mutate(values)}
            />
          ) : null}

          {section === "appearance" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className={labelClass}>{tCommon("language")}</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e9efed] p-1 dark:bg-white/5" role="radiogroup">
                  {(["ar", "en"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={locale === value}
                      onClick={() => switchLocale(value)}
                      className={cn(
                        "min-h-11 rounded-xl text-[15px] font-semibold transition-colors",
                        locale === value ? "bg-card text-[#104d49] shadow-sm dark:text-teal-50" : "text-muted-foreground",
                      )}
                    >
                      {value === "ar" ? tCommon("arabic") : tCommon("english")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className={labelClass}>{tCommon("theme")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "light", label: tCommon("light"), icon: Sun },
                    { value: "dark", label: tCommon("dark"), icon: Moon },
                    { value: "system", label: tCommon("system"), icon: Monitor },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={theme === option.value}
                      className={cn(
                        "app-press flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-[14px] font-semibold transition-colors",
                        theme === option.value
                          ? "border-[#104d49] bg-[#f0f7f5] text-[#104d49] ring-1 ring-[#104d49] dark:border-teal-300 dark:bg-teal-500/10 dark:text-teal-100 dark:ring-teal-300"
                          : "border-[#dbe6e0] text-foreground dark:border-border",
                      )}
                    >
                      <option.icon className="h-5 w-5" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </AppCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <AppCard className="overflow-hidden">
        <div className="app-hero h-20" />
        <div className="-mt-12 flex flex-col items-center px-5 pb-5 text-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              {avatarPreview || profilePatient?.avatar_url ? (
                <AvatarImage src={avatarPreview || profilePatient?.avatar_url || undefined} alt={profilePatient?.full_name || ""} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-[#e6f0ee] text-[26px] font-bold text-[#104d49]">{initialsOf(profilePatient?.full_name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={tApp("changePhoto")}
              className="app-press absolute -bottom-1 end-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#104d49] text-white shadow-md ring-4 ring-card"
            >
              <Camera className="h-[18px] w-[18px]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
          </div>
          <h1 className="mt-3 text-[21px] font-bold text-foreground">{profilePatient?.full_name || tCommon("patientFallback")}</h1>
          <p className="mt-0.5 text-[14px] text-muted-foreground">{profilePatient?.email}</p>
          {profilePatient?.is_vip ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fff4e0] px-3 py-1.5 text-[13px] font-bold text-[#8a5200] dark:bg-amber-500/15 dark:text-amber-200">
              <Crown className="h-4 w-4" />
              {tHome("vip")}
              {vipPercent > 0 ? ` · ${vipPercent}%` : ""}
            </span>
          ) : null}

          {avatarFile ? (
            <div className="mt-4 flex w-full flex-col gap-2 rounded-2xl bg-[#f3f7f5] p-3 dark:bg-white/5">
              <p className="truncate text-[13px] text-muted-foreground">{tApp("selectedPhoto", { name: avatarFile.name })}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(appButton.secondary, "min-h-11")}
                  onClick={() => {
                    setAvatarFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  {tCommon("clear")}
                </button>
                <button type="button" className={cn(appButton.primary, "min-h-11")} disabled={uploadAvatar.isPending} onClick={() => uploadAvatar.mutate()}>
                  {uploadAvatar.isPending ? <Loader2 className="animate-spin" /> : null}
                  {tApp("savePhoto")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </AppCard>

      <section className="space-y-2">
        <h2 className="px-1 text-[13px] font-bold text-muted-foreground">{tApp("accountSection")}</h2>
        <AppCard className="divide-y divide-[var(--app-card-border)] overflow-hidden">
          <MenuRow icon={User} tone="teal" label={t("tabs.personal")} onClick={() => openSection("personal")} />
          <MenuRow icon={HeartPulse} tone="rose" label={t("tabs.medical")} onClick={() => openSection("medical")} />
          <MenuRow icon={Lock} tone="stone" label={t("tabs.security")} onClick={() => openSection("security")} />
        </AppCard>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-[13px] font-bold text-muted-foreground">{tApp("moreSection")}</h2>
        <AppCard className="divide-y divide-[var(--app-card-border)] overflow-hidden">
          <MenuRow icon={FileText} tone="sky" label={tNav("reports")} href={`/${locale}/reports`} />
          <MenuRow icon={Bell} tone="amber" label={tNav("notifications")} href={`/${locale}/notifications`} />
          <MenuRow icon={MessageCircle} tone="sage" label={tNav("chat")} href={`/${locale}/chat`} />
          <MenuRow
            icon={Languages}
            tone="teal"
            label={tCommon("language")}
            value={locale === "ar" ? tCommon("arabic") : tCommon("english")}
            onClick={() => openSection("appearance")}
          />
          <MenuRow icon={Palette} tone="stone" label={tApp("themeTitle")} value={themeLabel} onClick={() => openSection("appearance")} />
        </AppCard>
      </section>

      <button type="button" onClick={logout} className={cn(appButton.danger, "w-full")}>
        <LogOut />
        {tNav("logout")}
      </button>
    </div>
  );
}
