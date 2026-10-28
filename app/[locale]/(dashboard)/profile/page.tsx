"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AreaSelect } from "@/components/orders/AreaSelect";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { I18nDatePicker } from "@/components/shared/I18nDatePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/lib/api/auth";
import { patientsApi } from "@/lib/api/patients";
import type { PatientUser } from "@/lib/api/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getApiError, getValidationErrors } from "@/lib/utils/apiError"; // FIX: F12 â€” reuse the shared backend error parser in patient profile mutations.

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

type ProfileInfoTabProps = {
  avatarFile: File | null;
  isUploadingAvatar: boolean;
  patient: PatientUser | PatientProfileData | null;
  personalForm: UseFormReturn<ProfileFormValues>;
  t: TranslateFn;
  tCommon: TranslateFn;
  tEnums: TranslateFn;
  onAvatarChange: (file: File | null) => void;
  onAvatarUpload: () => void;
  onSubmit: (values: ProfileFormValues) => void;
};

function ProfileInfoTab({
  avatarFile,
  isUploadingAvatar,
  patient,
  personalForm,
  t,
  tCommon,
  tEnums,
  onAvatarChange,
  onAvatarUpload,
  onSubmit,
}: ProfileInfoTabProps) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle>{t("personalTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <Avatar className="h-14 w-14">
            {patient?.avatar_url ? <AvatarImage src={patient.avatar_url} alt={patient.full_name} className="object-cover" /> : null}
            <AvatarFallback>
              {patient?.full_name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "PT"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{patient?.full_name}</p>
            <p className="text-sm text-muted-foreground">{patient?.email}</p>
          </div>
          <Input
            type="file"
            className="max-w-[220px]"
            onChange={(event) => onAvatarChange(event.target.files?.[0] || null)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!avatarFile || isUploadingAvatar}
            onClick={onAvatarUpload}
          >
            {tCommon("upload")}
          </Button>
        </div>

        <Form {...personalForm}>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={personalForm.handleSubmit(onSubmit)}>
            <FormField
              control={personalForm.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={personalForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={personalForm.control}
              name="area_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("area")}</FormLabel>
                  <FormControl>
                    <AreaSelect value={field.value} onChange={field.onChange} allowEmpty />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={personalForm.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={personalForm.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dateOfBirth")}</FormLabel>
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
                <FormItem>
                  <FormLabel>{t("gender")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{tEnums("male")}</SelectItem>
                      <SelectItem value="female">{tEnums("female")}</SelectItem>
                      <SelectItem value="other">{tEnums("other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {tCommon("saveChanges")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

type ProfileSecurityTabProps = {
  isPending: boolean;
  passwordForm: UseFormReturn<PasswordFormValues>;
  t: TranslateFn;
  tCommon: TranslateFn;
  onSubmit: (values: PasswordFormValues) => void;
};

function ProfileSecurityTab({
  isPending,
  passwordForm,
  t,
  tCommon,
  onSubmit,
}: ProfileSecurityTabProps) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle>{t("securityTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...passwordForm}>
          <form className="space-y-3" onSubmit={passwordForm.handleSubmit(onSubmit)}>
            <FormField
              control={passwordForm.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("currentPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("newPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPending}>
              {tCommon("saveChanges")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const locale = useLocale();
  const t = useTranslations("profilePage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const patient = useAuthStore((state) => state.patient);
  const patchPatient = useAuthStore((state) => state.patchPatient);
  const { logout } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const personalSchema = createPersonalSchema(t);
  const medicalSchema = createMedicalSchema();
  const passwordSchema = createPasswordSchema(t);

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
      const { code, error: message } = getApiError(error); // FIX: F12 â€” inspect backend password-change codes before choosing patient feedback.
      if (code === "VALIDATION_ERROR") { // FIX: F12 â€” map backend validation details into password form field errors.
        Object.entries(getValidationErrors(error)).forEach(([field, validationMessage]) => { // FIX: F12 â€” apply every backend validation message to the matching password field.
          passwordForm.setError(field as keyof PasswordFormValues, { message: validationMessage }); // FIX: F12 â€” show server validation feedback inline on the password form.
        });
        toast.error(t("validationError")); // FIX: F12 â€” keep a top-level validation toast alongside the field-level password errors.
        return;
      }
      if (code === "INVALID_CURRENT_PASSWORD") { // FIX: F12 â€” surface the backend current-password check clearly to the patient.
        passwordForm.setError("current_password", { message: "Current password is incorrect" }); // FIX: F12 â€” anchor the backend password mismatch on the current password field.
      }
      toast.error(message || t("passwordUpdateFailed")); // FIX: F12 â€” fall back to the backend message or the existing patient password failure copy.
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async () => {
      if (!patient?.id || !avatarFile) return;
      const formData = new FormData();
      formData.append("file", avatarFile); // FIX: F1 â€” backend upload.js expects field name "file".
      return (await patientsApi.updateAvatar(patient.id, formData)).data;
    },
    onSuccess: (data) => {
      setAvatarFile(null);
      if (data) patchPatient({ avatar_url: data.avatar_url ?? null });
      toast.success(t("avatarUploaded"));
    },
    onError: (error) => {
      const { code, error: message } = getApiError(error); // FIX: F12 â€” inspect backend upload codes before choosing patient avatar feedback.
      if (code === "INVALID_FILE_TYPE" || code === "INVALID_FILE_CONTENTS") { // FIX: F12 â€” surface backend file validation failures instead of a generic avatar error.
        toast.error(message); // FIX: F12 â€” show the exact backend upload validation reason to the patient.
        return;
      }
      toast.error(message || t("avatarUploadFailed")); // FIX: F12 â€” preserve a backend-aware fallback for patient avatar upload failures.
    },
  });

  const switchLocale = (targetLocale: "en" | "ar") => {
    const segments = pathname.split("/").filter(Boolean);
    if (!segments.length) {
      router.replace(`/${targetLocale}`);
      return;
    }
    segments[0] = targetLocale;
    router.replace(`/${segments.join("/")}`);
  };

  const typedLocale: "en" | "ar" = locale === "ar" || locale === "en" ? locale : "en";
  const profilePatient = patientQuery.data ?? patient ?? null;
  const handleLocaleChange = (value: string) => {
    const nextLocale: "en" | "ar" = value === "ar" ? "ar" : "en";
    switchLocale(nextLocale);
  };

  if (patientQuery.isLoading && !patientQuery.data && !patient) {
    return <AppPreloader variant="page" title={t("title")} description={tCommon("loading")} blockCount={4} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Tabs defaultValue="personal" className="space-y-4" dir={typedLocale === "ar" ? "rtl" : "ltr"}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="personal">{t("tabs.personal")}</TabsTrigger>
          <TabsTrigger value="medical">{t("tabs.medical")}</TabsTrigger>
          <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("tabs.appearance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <ProfileInfoTab
            avatarFile={avatarFile}
            isUploadingAvatar={uploadAvatar.isPending}
            patient={profilePatient}
            personalForm={personalForm}
            t={t}
            tCommon={tCommon}
            tEnums={tEnums}
            onAvatarChange={setAvatarFile}
            onAvatarUpload={() => uploadAvatar.mutate()}
            onSubmit={(values) => updatePersonal.mutate(values)}
          />
        </TabsContent>

        <TabsContent value="medical">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>{t("medicalTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...medicalForm}>
                <form className="space-y-3" onSubmit={medicalForm.handleSubmit((values) => updateMedical.mutate(values))}>
                  <FormField
                    control={medicalForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("height")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value ? Number(event.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={medicalForm.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("weight")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value ? Number(event.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={medicalForm.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("allergies")}</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {tCommon("saveChanges")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <ProfileSecurityTab
            isPending={changePassword.isPending}
            passwordForm={passwordForm}
            t={t}
            tCommon={tCommon}
            onSubmit={(values) => changePassword.mutate(values)}
          />
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>{t("appearanceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{tCommon("language")}</p>
                <Select value={typedLocale} onValueChange={handleLocaleChange}>
                  <SelectTrigger className="max-w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{tCommon("english")}</SelectItem>
                    <SelectItem value="ar">{tCommon("arabic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{tCommon("theme")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
                    <Sun className="me-2 h-4 w-4" />
                    {tCommon("light")}
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
                    <Moon className="me-2 h-4 w-4" />
                    {tCommon("dark")}
                  </Button>
                  <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>
                    {tCommon("system")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
