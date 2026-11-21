"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Home, Loader2, Phone, Shield, User2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Illustration } from "@/components/app/ui";
import { AreaSelect } from "@/components/orders/AreaSelect";
import { RecipientLine, RecipientPicker } from "@/components/orders/RecipientPicker";
import { TrackingLinkCard } from "@/components/orders/TrackingLinkCard";
import {
  EMPTY_GUEST_VERIFICATION,
  GuestVerificationStep,
  isGuestVerificationComplete,
  type GuestVerificationValue,
} from "@/components/verification/VerificationStep";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  casesApi,
  MAX_CASE_ITEMS,
  RECIPIENT_AGE_GROUPS,
  RECIPIENT_GENDERS,
  type GuestCaseCreated,
} from "@/lib/api/cases";
import { useLabHomeVisitFee, usePublicSettings, type VerificationRules } from "@/lib/api/settings";
import { getVerificationErrorMessage, getVerificationRequired } from "@/lib/api/verification";
import { formatCurrency } from "@/lib/formatting";
import { onRequestCreated } from "@/lib/analytics";
import { isLabEntry } from "@/lib/lab-catalog";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { getMinScheduleInputValue, isFutureScheduleInput, scheduleInputToIso } from "@/lib/order-items";
import {
  getCatalogEntryTypeLabel,
  getPublicCatalogEntryAnalyticsKind,
  isOrderableCatalogEntry,
  toCatalogItemRef,
  type PublicCatalogEntry,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";

const phonePattern = /^[0-9+\-\s()]{7,20}$/;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

type CategoryTheme = {
  base: string;
  secondary: string;
  accent: string;
  soft: string;
  muted: string;
  shadow: string;
};

function createGuestRequestSchema(tBooking: TranslateFn, tForm: TranslateFn, tRecipient: TranslateFn) {
  return z.object({
    full_name: z.string().trim().min(2, tBooking("fullNameMin")).max(100),
    phone: z.string().trim().regex(phonePattern, tBooking("invalidPhone")),
    recipient_gender: z.enum(RECIPIENT_GENDERS, { error: tRecipient("genderRequired") }),
    recipient_age_group: z.enum(RECIPIENT_AGE_GROUPS, { error: tRecipient("ageRequired") }),
    area_id: z.string().min(1, tForm("areaRequired")),
    address: z.string().trim().min(3, tForm("addressRequired")).max(500),
    scheduled_for: z
      .string()
      .optional()
      .refine((value) => isFutureScheduleInput(value), tForm("scheduledInPast")),
    notes: z.string().trim().max(2000).optional(),
  });
}

type GuestRequestValues = z.infer<ReturnType<typeof createGuestRequestSchema>>;

// Guests always choose who the care is for, so the recipient starts empty.
const EMPTY_VALUES: DefaultValues<GuestRequestValues> = {
  full_name: "",
  phone: "",
  recipient_gender: undefined,
  recipient_age_group: undefined,
  area_id: "",
  address: "",
  scheduled_for: "",
  notes: "",
};

type GuestServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PublicCatalogEntry[];
  defaultEntryId?: string | null;
  preSelectedEntryIds?: string[];
  serviceSlug: PublicServiceCategorySlug;
  categoryTitle: string;
  categoryTheme: CategoryTheme;
  /** Called once an order was created (e.g. to clear the page selection). */
  onOrderCreated?: () => void;
};

export function GuestServiceRequestDialog({
  open,
  onOpenChange,
  entries,
  defaultEntryId,
  preSelectedEntryIds,
  serviceSlug,
  categoryTitle,
  categoryTheme,
  onOrderCreated,
}: GuestServiceRequestDialogProps) {
  const locale = useLocale();
  const t = useTranslations("serviceExplorer");
  const tBooking = useTranslations("booking");
  const tForm = useTranslations("orderForm");
  const tOrders = useTranslations("orders");
  const tRecipient = useTranslations("app.recipient");
  const tLab = useTranslations("labCatalog");
  const tVerify = useTranslations("verification");
  const labFee = useLabHomeVisitFee();
  const settingsQuery = usePublicSettings();
  // "details" is the form; "verify" is the identity step shown before the order is sent (when required).
  const [stage, setStage] = useState<"details" | "verify">("details");
  const [verification, setVerification] = useState<GuestVerificationValue>(EMPTY_GUEST_VERIFICATION);
  const [pendingValues, setPendingValues] = useState<GuestRequestValues | null>(null);
  // Set when the server asked for a verification the settings did not announce (settings not loaded yet).
  const [requiredByServer, setRequiredByServer] = useState<VerificationRules | null>(null);
  const pendingTrackingRef = useRef<Parameters<typeof onRequestCreated>[0] | null>(null);
  const [createdOrder, setCreatedOrder] = useState<GuestCaseCreated | null>(null);
  const orderableEntries = useMemo(() => entries.filter(isOrderableCatalogEntry), [entries]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    const isKnown = (id: string) => orderableEntries.some((entry) => entry.id === id);

    if (preSelectedEntryIds?.length) {
      setSelectedEntryIds(preSelectedEntryIds.filter(isKnown).slice(0, MAX_CASE_ITEMS));
      return;
    }

    if (defaultEntryId && isKnown(defaultEntryId)) {
      setSelectedEntryIds([defaultEntryId]);
      return;
    }

    setSelectedEntryIds((current) => current.filter(isKnown));
  }, [defaultEntryId, open, orderableEntries, preSelectedEntryIds]);

  const form = useForm<GuestRequestValues>({
    resolver: zodResolver(createGuestRequestSchema(tBooking, tForm, tRecipient)),
    defaultValues: EMPTY_VALUES,
  });

  const groupedEntries = useMemo(() => {
    const groups: Record<string, PublicCatalogEntry[]> = {};

    for (const entry of orderableEntries) {
      const key = entry.categoryName || t("otherCategory");
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }

    return groups;
  }, [orderableEntries, t]);
  const shouldShowGroupHeaders = Object.keys(groupedEntries).length > 1;
  const selectionLimitReached = selectedEntryIds.length >= MAX_CASE_ITEMS;
  const selectedEntries = useMemo(
    () => orderableEntries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [orderableEntries, selectedEntryIds],
  );
  // Orders with lab tests get one home sample-collection visit fee, added by the server.
  const hasLabSelection = selectedEntries.some(isLabEntry);
  const visitFee = hasLabSelection ? labFee : 0;
  const estimatedTotal = selectedEntries.reduce((sum, entry) => sum + Number(entry.price || 0), 0) + visitFee;
  const hasUnpricedSelection = selectedEntries.some((entry) => entry.price === null);
  const rules: VerificationRules = {
    require_id: Boolean(settingsQuery.data?.verification?.require_id || requiredByServer?.require_id),
    require_phone: Boolean(settingsQuery.data?.verification?.require_phone || requiredByServer?.require_phone),
  };
  const verificationRequired = rules.require_id || rules.require_phone;

  const handleEntryCheckedChange = (entryId: string, checked: boolean) => {
    setSelectedEntryIds((current) => {
      if (checked) {
        if (current.includes(entryId) || current.length >= MAX_CASE_ITEMS) {
          return current;
        }

        return [...current, entryId];
      }

      return current.filter((id) => id !== entryId);
    });
  };

  const createMutation = useMutation({
    mutationFn: async (values: GuestRequestValues) => {
      if (!selectedEntries.length) {
        throw new Error("ENTRY_NOT_FOUND");
      }

      const scheduledFor = scheduleInputToIso(values.scheduled_for);

      return casesApi.createPublic({
        guest_name: values.full_name.trim(),
        guest_phone: values.phone.trim(),
        area_id: values.area_id,
        address: values.address.trim(),
        ...(scheduledFor ? { scheduled_for: scheduledFor } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        items: selectedEntries.map(toCatalogItemRef),
        recipient_gender: values.recipient_gender,
        recipient_age_group: values.recipient_age_group,
        ...(verification.idDocumentToken ? { id_document_token: verification.idDocumentToken } : {}),
        ...(verification.phoneToken && verification.phoneTokenFor === values.phone.trim()
          ? { phone_verification_token: verification.phoneToken }
          : {}),
      });
    },
    onSuccess: (result) => {
      setCreatedOrder(result);
      form.reset(EMPTY_VALUES);
      setSelectedEntryIds([]);
      // A guest ID upload and a phone code each serve one order.
      setVerification(EMPTY_GUEST_VERIFICATION);
      setPendingValues(null);
      setStage("details");
      onOrderCreated?.();

      if (pendingTrackingRef.current) {
        onRequestCreated(pendingTrackingRef.current);
        pendingTrackingRef.current = null;
      }
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "ENTRY_NOT_FOUND") {
        toast.error(t("minSelectionError"));
        return;
      }

      // The server still misses the ID or the phone code (or the uploaded ID expired): back to that step.
      const missing = getVerificationRequired(error);
      if (missing) {
        setRequiredByServer((current) => ({
          require_id: Boolean(current?.require_id) || missing.includes("id_document"),
          require_phone: Boolean(current?.require_phone) || missing.includes("phone"),
        }));
        setVerification((current) => ({
          ...current,
          ...(missing.includes("id_document") ? { idDocumentToken: null, idDocumentName: null } : {}),
          ...(missing.includes("phone") ? { phoneToken: null, phoneTokenFor: null } : {}),
        }));
        setPendingValues(form.getValues());
        setStage("verify");
        toast.error(getVerificationErrorMessage(error, tVerify));
        return;
      }

      toast.error(getOrderErrorMessage(error, tOrders));
    },
  });

  const handleSubmit = (values: GuestRequestValues) => {
    if (selectedEntryIds.length === 0) {
      toast.error(t("minSelectionError"));
      return;
    }

    const targetEntry = selectedEntries[0];

    pendingTrackingRef.current = targetEntry
      ? {
          service_slug: serviceSlug,
          service_kind: getPublicCatalogEntryAnalyticsKind(targetEntry),
          locale,
        }
      : null;

    // Identity step first (ID photo and/or phone code) when the admin requires it.
    if (verificationRequired && !isGuestVerificationComplete(rules, verification, values.phone.trim())) {
      setPendingValues(values);
      setStage("verify");
      return;
    }

    createMutation.mutate(values);
  };

  const confirmAfterVerification = () => {
    if (!pendingValues) {
      setStage("details");
      return;
    }
    handleSubmit(pendingValues);
  };

  const recipientGender = form.watch("recipient_gender");
  const recipientAgeGroup = form.watch("recipient_age_group");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // The tracking token is shown only once; drop it when the dialog closes.
      setCreatedOrder(null);
      setStage("details");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bottom-2 top-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] translate-y-0 overflow-hidden rounded-[1.75rem] border-white/80 bg-[#f7faf8] p-0 shadow-[0_40px_120px_-44px_rgba(15,79,72,0.36)] sm:bottom-auto sm:top-[50%] sm:w-[min(46rem,calc(100vw-2rem))] sm:max-w-[46rem] sm:translate-y-[-50%]">
        <div className="relative max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto overscroll-contain">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: categoryTheme.accent }}
          />
          <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-white/65 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/40 blur-3xl" />

          <div
            className="relative px-4 pb-4 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5"
            style={{
              background: `linear-gradient(140deg, ${categoryTheme.base} 0%, ${categoryTheme.secondary} 62%, #12312d 100%)`,
            }}
          >
            <DialogHeader className="space-y-3 text-start">
              <div className="type-eyebrow inline-flex w-fit items-center gap-3 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#104d49]">
                  {createdOrder ? <CheckCircle2 className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </span>
                Curevie
              </div>
              <DialogTitle className="text-xl font-semibold text-white sm:text-2xl">
                {createdOrder
                  ? tForm("guest.successTitle")
                  : stage === "verify"
                    ? tVerify("stepTitle")
                    : t("guestRequest.title")}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6 text-white/86 sm:leading-7">
                {createdOrder
                  ? tForm("guest.successDescription")
                  : stage === "verify"
                    ? tVerify("stepDescriptionGuest")
                    : t("guestRequest.description", { category: categoryTitle })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            {createdOrder ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Illustration name="order-placed" className="h-36 w-auto" sizes="160px" />
                </div>
                <TrackingLinkCard token={createdOrder.tracking_token} reference={createdOrder.case.reference} />
                <RecipientLine
                  gender={createdOrder.case.recipient_gender}
                  ageGroup={createdOrder.case.recipient_age_group}
                  className="rounded-2xl border border-[#dbe7e2] bg-white px-4 py-3 text-sm text-[#12312d]"
                />
                {createdOrder.case.invoice ? (
                  <div className="flex items-center justify-between rounded-2xl border border-[#dbe7e2] bg-white px-4 py-3 text-sm">
                    <span className="text-[#617672]">{tForm("orderTotal")}</span>
                    <span className="font-semibold text-[#12312d]">
                      {formatCurrency(createdOrder.case.invoice.final_amount, locale)}
                    </span>
                  </div>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    className="min-h-12 w-full rounded-full px-5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: categoryTheme.base }}
                    onClick={() => handleOpenChange(false)}
                  >
                    {tBooking("close")}
                  </Button>
                </DialogFooter>
              </div>
            ) : stage === "verify" ? (
              <div className="min-w-0 space-y-4">
                <GuestVerificationStep
                  rules={rules}
                  phone={(pendingValues?.phone || "").trim()}
                  value={verification}
                  onChange={setVerification}
                />

                <div className="space-y-1.5 rounded-2xl border border-[#dbe7e2] bg-white px-4 py-3 text-sm">
                  <p className="font-semibold text-[#12312d]">{tVerify("orderSummary")}</p>
                  <ul className="space-y-1 text-[#46625b]">
                    {selectedEntries.map((entry) => (
                      <li key={entry.id} className="flex items-start justify-between gap-3">
                        <span className="min-w-0">{entry.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {entry.price === null ? t("labels.priceOnRequest") : formatCurrency(entry.price, locale)}
                        </span>
                      </li>
                    ))}
                    {visitFee > 0 ? (
                      <li className="flex items-start justify-between gap-3 text-[#4a6b32]">
                        <span className="min-w-0">{tLab("feeLine")}</span>
                        <span className="shrink-0 tabular-nums">{formatCurrency(visitFee, locale)}</span>
                      </li>
                    ) : null}
                  </ul>
                  <div className="flex items-center justify-between border-t border-[#e2ece7] pt-2 text-[#617672]">
                    <span>{tForm("estimatedTotal")}</span>
                    <span className="font-semibold tabular-nums text-[#12312d]">
                      {formatCurrency(estimatedTotal, locale)}
                      {hasUnpricedSelection ? " +" : ""}
                    </span>
                  </div>
                </div>

                <DialogFooter className="sticky bottom-0 flex-col-reverse gap-3 border-t border-[#e2ece7] bg-[#f7faf8]/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:flex-row sm:justify-between sm:pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full rounded-full border-[#d9e6df] bg-white px-5 text-[#12312d] hover:bg-white sm:w-auto"
                    onClick={() => setStage("details")}
                    disabled={createMutation.isPending}
                  >
                    {locale === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    {tVerify("back")}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-12 w-full rounded-full px-5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: categoryTheme.base }}
                    onClick={confirmAfterVerification}
                    disabled={
                      createMutation.isPending
                      || !isGuestVerificationComplete(rules, verification, (pendingValues?.phone || "").trim())
                    }
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {tBooking("submitting")}
                      </>
                    ) : (
                      t("guestRequest.confirm")
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="min-w-0 space-y-4">
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <User2 className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9fa2]" />
                              <Input {...field} placeholder={tBooking("fullNamePlaceholder")} className="h-12 rounded-full ps-11 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9fa2]" />
                              <Input
                                {...field}
                                type="tel"
                                inputMode="tel"
                                placeholder={tBooking("phonePlaceholder")}
                                className="h-12 rounded-full ps-11 text-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-2xl border border-[#dbe7e2] bg-white p-3 sm:p-4">
                      <RecipientPicker
                        idPrefix="guest"
                        gender={recipientGender}
                        ageGroup={recipientAgeGroup}
                        onGenderChange={(value) => form.setValue("recipient_gender", value, { shouldValidate: true })}
                        onAgeGroupChange={(value) => form.setValue("recipient_age_group", value, { shouldValidate: true })}
                        genderError={form.formState.errors.recipient_gender?.message}
                        ageGroupError={form.formState.errors.recipient_age_group?.message}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="area_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <AreaSelect
                              value={field.value}
                              onChange={field.onChange}
                              withIcon
                              className="h-12 rounded-full ps-4 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Home className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9fa2]" />
                              <Input {...field} placeholder={tForm("addressPlaceholder")} className="h-12 rounded-full ps-11 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduled_for"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CalendarClock className="h-4 w-4 text-[#9c9fa2]" />
                            {tForm("scheduledFor")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="datetime-local"
                              min={getMinScheduleInputValue()}
                              className="h-12 rounded-full px-4 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder={tForm("notesPlaceholder")} className="rounded-2xl text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {t("guestRequest.serviceFieldLabel")}
                      </p>
                      <div className="max-h-[200px] overflow-x-hidden overflow-y-auto rounded-2xl border border-[#dbe7e2] bg-[#f9fbfa] p-2.5">
                        <div className="space-y-2">
                          {Object.entries(groupedEntries).map(([groupName, groupEntries]) => (
                            <div key={groupName} className="space-y-2">
                              {shouldShowGroupHeaders ? (
                                <div className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                  {groupName}
                                </div>
                              ) : null}
                              {groupEntries.map((entry) => {
                                const isChecked = selectedEntryIds.includes(entry.id);
                                const isDisabled = !isChecked && selectionLimitReached;

                                return (
                                  <label
                                    key={entry.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-2 transition ${
                                      isChecked
                                        ? "border-[#bcd2ca] shadow-[0_14px_34px_-28px_rgba(15,79,72,0.35)]"
                                        : "border-[#e4eeea]"
                                    } ${isDisabled ? "cursor-not-allowed opacity-55" : "hover:border-[#c8d9d2]"} overflow-hidden`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onChange={(event) => handleEntryCheckedChange(entry.id, event.target.checked)}
                                      className="mt-0.5 h-4 w-4 rounded border-[#bfd3ca] accent-[#104d49]"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-[#12312d]">{entry.name}</p>
                                          <p className="mt-1 text-xs text-[#7a8f89]">
                                            {entry.price === null || !Number.isFinite(entry.price)
                                              ? t("labels.priceOnRequest")
                                              : formatCurrency(entry.price, locale)}
                                            {entry.type === "package" && entry.savings !== null ? (
                                              <span className="ms-2 font-semibold text-emerald-700">
                                                {t("labels.youSave", { amount: formatCurrency(entry.savings, locale) })}
                                              </span>
                                            ) : null}
                                          </p>
                                          {entry.type === "package" && entry.includedServices.length ? (
                                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#7a8f89]">
                                              {t("labels.includedServicesCount", { count: entry.servicesCount })}
                                              {": "}
                                              {entry.includedServices.join(locale === "ar" ? "، " : ", ")}
                                            </p>
                                          ) : null}
                                        </div>
                                        <Badge variant="outline" className="shrink-0 rounded-full border-[#dbe7e2] text-[0.65rem] text-[#46625b]">
                                          {getCatalogEntryTypeLabel(entry, tOrders)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectionLimitReached ? (
                        <p className="text-xs font-medium text-[#a15b18]">{t("maxSelectionHint", { max: MAX_CASE_ITEMS })}</p>
                      ) : null}
                      {visitFee > 0 ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#eef5e6] px-3 py-2 text-xs leading-5 text-[#3d5a2c]">
                          <span>{tLab("feeNoteShort")}</span>
                          <span className="shrink-0 font-semibold tabular-nums">+ {formatCurrency(visitFee, locale)}</span>
                        </div>
                      ) : null}
                      {selectedEntries.length ? (
                        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-[#617672]">
                          <span>{tForm("estimatedTotal")}</span>
                          <span className="font-semibold text-[#12312d]">
                            {formatCurrency(estimatedTotal, locale)}
                            {hasUnpricedSelection ? " +" : ""}
                          </span>
                        </div>
                      ) : null}
                      <p className="text-[11px] leading-5 text-[#7a8f89]">{tForm("priceNote")}</p>
                    </div>
                  </div>

                  <DialogFooter className="sticky bottom-0 flex-col-reverse gap-3 border-t border-[#e2ece7] bg-[#f7faf8]/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:flex-row sm:justify-between sm:pb-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12 w-full rounded-full border-[#d9e6df] bg-white px-5 text-[#12312d] hover:bg-white sm:w-auto"
                      onClick={() => handleOpenChange(false)}
                    >
                      {tBooking("close")}
                    </Button>
                    <Button
                      type="submit"
                      className="min-h-12 w-full rounded-full px-5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
                      style={{ backgroundColor: categoryTheme.base }}
                      disabled={createMutation.isPending || !orderableEntries.length}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {tBooking("submitting")}
                        </>
                      ) : verificationRequired
                        && !isGuestVerificationComplete(rules, verification, (form.watch("phone") || "").trim()) ? (
                        tVerify("continue")
                      ) : (
                        t("guestRequest.confirm")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
