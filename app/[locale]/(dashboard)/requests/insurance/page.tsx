"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppCard, PageIntro, appButton } from "@/components/app/ui";
import { LabFeeNote } from "@/components/lab/LabTestBrowser";
import { AreaPicker } from "@/components/orders/AreaPicker";
import { useAreas } from "@/components/orders/AreaSelect";
import { RecipientPicker } from "@/components/orders/RecipientPicker";
import { SchedulePicker, type ScheduleMode } from "@/components/orders/SchedulePicker";
import { DocumentUploadField } from "@/components/shared/DocumentUploadField";
import { PrelaunchRequestPage } from "@/components/shared/PrelaunchNotice";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { needsVerification, PatientVerificationStep, useVerificationStatus } from "@/components/verification/VerificationStep";
import { casesApi, RECIPIENT_AGE_GROUPS, RECIPIENT_GENDERS } from "@/lib/api/cases";
import { useLabHomeVisitFee } from "@/lib/api/settings";
import {
  getVerificationErrorMessage,
  getVerificationRequired,
  VERIFICATION_STATUS_QUERY_KEY,
} from "@/lib/api/verification";
import { BOOKINGS_ENABLED } from "@/lib/launch";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { isFutureScheduleInput, scheduleInputToIso } from "@/lib/order-items";
import { recipientAgeGroupFromBirthDate, recipientGenderFromProfile } from "@/lib/order-recipient";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getApiError } from "@/lib/utils/apiError";
import { cn } from "@/lib/utils";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const FILE_ERROR_CODES = new Set(["NO_FILE", "INVALID_FILE_TYPE", "INVALID_FILE_CONTENTS"]);
const HOW_STEPS = ["upload", "quote", "approve"] as const;

function createInsuranceSchema(t: Translate, tRecipient: Translate, addressRequired: boolean) {
  return z.object({
    recipient_gender: z.enum(RECIPIENT_GENDERS, { error: tRecipient("genderRequired") }),
    recipient_age_group: z.enum(RECIPIENT_AGE_GROUPS, { error: tRecipient("ageRequired") }),
    area_id: z.string().min(1, t("areaRequired")),
    address: addressRequired
      ? z.string().trim().min(3, t("addressRequired")).max(500)
      : z.string().trim().max(500).refine((value) => !value || value.length >= 3, t("addressRequired")),
    scheduled_for: z.string().optional().refine((value) => isFutureScheduleInput(value), t("scheduledInPast")),
    notes: z.string().trim().max(2000).optional(),
  });
}

type InsuranceValues = z.infer<ReturnType<typeof createInsuranceSchema>>;

export default function InsuranceRequestPage() {
  if (!BOOKINGS_ENABLED) {
    return <PrelaunchRequestPage />;
  }

  return <InsuranceRequestForm />;
}

/**
 * "Lab test with insurance": the patient sends a photo of the insurance card and the visit details, without
 * choosing tests. The lab then answers with what the insurance covers and what is left to pay.
 */
function InsuranceRequestForm() {
  const locale = useLocale();
  const t = useTranslations("insurance");
  const tForm = useTranslations("orderForm");
  const tFlow = useTranslations("app.newOrder");
  const tOrders = useTranslations("orders");
  const tRecipient = useTranslations("app.recipient");
  const tVerify = useTranslations("verification");
  const router = useRouter();
  const queryClient = useQueryClient();
  const patient = useAuthStore((state) => state.patient);
  const areasQuery = useAreas();
  const labFee = useLabHomeVisitFee();
  const verificationQuery = useVerificationStatus();
  const verificationMissing = needsVerification(verificationQuery.data);
  // Once the identity step was needed on this visit it stays on the page (and shows "done" afterwards).
  const [verifyShown, setVerifyShown] = useState(false);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("asap");
  const cardRef = useRef<HTMLDivElement>(null);
  const verifyRef = useRef<HTMLDivElement>(null);

  const addressRequired = !patient?.address?.trim();
  const profileRecipientGender = recipientGenderFromProfile(patient?.gender);
  const profileRecipientAgeGroup = recipientAgeGroupFromBirthDate(patient?.date_of_birth);
  const form = useForm<InsuranceValues>({
    resolver: zodResolver(createInsuranceSchema(tForm, tRecipient, addressRequired)),
    defaultValues: {
      recipient_gender: profileRecipientGender ?? undefined,
      recipient_age_group: profileRecipientAgeGroup ?? undefined,
      area_id: "",
      address: patient?.address || "",
      scheduled_for: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (verificationMissing) setVerifyShown(true);
  }, [verificationMissing]);

  // Default the area to the one saved on the patient profile.
  useEffect(() => {
    if (form.getValues("area_id") || !patient?.area_id || !areasQuery.data) return;
    if (areasQuery.data.some((area) => area.id === patient.area_id)) {
      form.setValue("area_id", patient.area_id);
    }
  }, [areasQuery.data, form, patient?.area_id]);

  const scrollTo = (element: HTMLElement | null) => element?.scrollIntoView({ behavior: "smooth", block: "center" });

  const createMutation = useMutation({
    mutationFn: (values: InsuranceValues) => {
      if (!cardFile) throw new Error("CARD_REQUIRED");
      const scheduledFor = scheduleInputToIso(values.scheduled_for);
      return casesApi.createInsurance({
        file: cardFile,
        area_id: values.area_id,
        address: values.address.trim() || undefined,
        scheduled_for: scheduledFor || undefined,
        notes: values.notes?.trim() || undefined,
        recipient_gender: values.recipient_gender,
        recipient_age_group: values.recipient_age_group,
      });
    },
    onSuccess: async (view) => {
      toast.success(t("form.success"));
      queryClient.setQueryData(["cases", "detail", view.case.id], view);
      await queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
      router.replace(`/${locale}/requests/${view.case.id}`);
    },
    onError: (error) => {
      // The account still has to prove identity (ID / phone): show that part of the page.
      if (getVerificationRequired(error)) {
        setVerifyShown(true);
        void queryClient.invalidateQueries({ queryKey: VERIFICATION_STATUS_QUERY_KEY });
        toast.error(getVerificationErrorMessage(error, tVerify));
        window.setTimeout(() => scrollTo(verifyRef.current), 50);
        return;
      }
      const { code } = getApiError(error);
      if (FILE_ERROR_CODES.has(code)) {
        const message = tVerify(`errors.${code}`);
        setCardError(message);
        toast.error(message);
        scrollTo(cardRef.current);
        return;
      }
      toast.error(getOrderErrorMessage(error, tOrders));
    },
  });

  const handleSubmit = (values: InsuranceValues) => {
    if (!cardFile) {
      setCardError(t("form.cardRequired"));
      toast.error(t("form.cardRequired"));
      scrollTo(cardRef.current);
      return;
    }
    if (scheduleMode === "pick" && !values.scheduled_for) {
      form.setError("scheduled_for", { message: tFlow("timeRequired") });
      toast.error(tFlow("timeRequired"));
      return;
    }
    if (verificationMissing) {
      toast.error(tVerify("completeFirst"));
      scrollTo(verifyRef.current);
      return;
    }
    createMutation.mutate(values);
  };

  const handleInvalid = (errors: FieldErrors<InsuranceValues>) => {
    const firstMessage = Object.values(errors).find((error) => error?.message)?.message;
    if (firstMessage) toast.error(String(firstMessage));
  };

  const recipientGender = form.watch("recipient_gender");
  const recipientAgeGroup = form.watch("recipient_age_group");
  const recipientErrors = form.formState.errors;
  const textareaClass =
    "w-full resize-none rounded-2xl border border-[#dbe6e0] bg-card px-4 py-3 text-[16px] leading-6 outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2 dark:border-border";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageIntro title={t("form.title")} description={t("form.intro")} />

      <AppCard className="p-4 sm:p-5">
        <p className="text-[15px] font-bold text-foreground">{t("how.title")}</p>
        <ol className="mt-3 space-y-2.5">
          {HOW_STEPS.map((key, index) => (
            <li key={key} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6f0ee] text-[13px] font-bold text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
                {index + 1}
              </span>
              <span className="pt-0.5 text-[14.5px] leading-6 text-foreground">{t(`how.${key}`)}</span>
            </li>
          ))}
        </ol>
      </AppCard>

      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} noValidate>
          <div ref={cardRef} className="scroll-mt-24">
            <AppCard className="space-y-3 p-4 sm:p-5">
              <div className="px-1">
                <p className="text-[17px] font-bold text-foreground">{t("form.cardTitle")}</p>
                <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">{t("form.cardHint")}</p>
              </div>
              <DocumentUploadField
                idPrefix="insurance-card"
                fileName={cardFile?.name}
                done={Boolean(cardFile)}
                doneLabel={t("form.cardReady")}
                error={cardError}
                onPick={(file) => {
                  setCardFile(file);
                  setCardError(null);
                }}
                onInvalid={(reason) =>
                  setCardError(reason === "size" ? tVerify("errors.FILE_TOO_LARGE") : tVerify("errors.INVALID_FILE_TYPE"))
                }
                note={
                  <p className="flex items-start gap-2 rounded-xl bg-[#f1f5f4] px-3 py-2.5 text-[13.5px] leading-5 text-[#46625b]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5a7a50]" />
                    <span>{t("form.cardPrivacy")}</span>
                  </p>
                }
              />
            </AppCard>
          </div>

          <AppCard className="p-4 sm:p-5">
            <RecipientPicker
              idPrefix="insurance"
              gender={recipientGender}
              ageGroup={recipientAgeGroup}
              onGenderChange={(value) => form.setValue("recipient_gender", value, { shouldValidate: true })}
              onAgeGroupChange={(value) => form.setValue("recipient_age_group", value, { shouldValidate: true })}
              genderError={recipientErrors.recipient_gender?.message}
              ageGroupError={recipientErrors.recipient_age_group?.message}
              prefilled={Boolean(profileRecipientGender || profileRecipientAgeGroup)}
            />
          </AppCard>

          <AppCard className="space-y-4 p-4 sm:p-5">
            <FormField
              control={form.control}
              name="area_id"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-2">
                  <FormControl>
                    <AreaPicker value={field.value} onChange={field.onChange} invalid={Boolean(fieldState.error)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <label htmlFor="insurance-address" className="block px-1 text-[14px] font-semibold text-foreground">
                    {tForm("address")}
                  </label>
                  <FormControl>
                    <textarea id="insurance-address" {...field} rows={2} placeholder={tForm("addressPlaceholder")} className={textareaClass} />
                  </FormControl>
                  {!addressRequired ? <p className="px-1 text-[13px] text-muted-foreground">{tForm("addressHint")}</p> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          </AppCard>

          <AppCard className="space-y-3 p-4 sm:p-5">
            <p className="px-1 text-[17px] font-bold text-foreground">{tFlow("whenTitle")}</p>
            <FormField
              control={form.control}
              name="scheduled_for"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-2">
                  <SchedulePicker
                    mode={scheduleMode}
                    onModeChange={(mode) => {
                      setScheduleMode(mode);
                      form.clearErrors("scheduled_for");
                    }}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      form.clearErrors("scheduled_for");
                    }}
                    invalid={Boolean(fieldState.error)}
                  />
                  <p className="px-1 text-[13px] text-muted-foreground">{tForm("scheduledForHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AppCard>

          <AppCard className="space-y-2 p-4 sm:p-5">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <label htmlFor="insurance-notes" className="block px-1 text-[14px] font-semibold text-foreground">
                    {tForm("notes")}
                  </label>
                  <FormControl>
                    <textarea id="insurance-notes" {...field} rows={3} placeholder={t("form.notesPlaceholder")} className={textareaClass} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AppCard>

          {verifyShown ? (
            <div ref={verifyRef} className="scroll-mt-24 space-y-3">
              <div className="px-1">
                <p className="text-[17px] font-bold text-foreground">{tVerify("stepTitle")}</p>
                <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">{tVerify("stepDescription")}</p>
              </div>
              <PatientVerificationStep />
            </div>
          ) : null}

          <LabFeeNote fee={labFee} />

          <button type="submit" disabled={createMutation.isPending} className={cn(appButton.primary, "w-full")}>
            {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            {createMutation.isPending ? t("form.submitting") : t("form.submit")}
          </button>
          <p className="px-1 text-center text-[13px] leading-5 text-muted-foreground">{t("form.submitHint")}</p>
        </form>
      </Form>
    </div>
  );
}
