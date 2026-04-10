"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MapPin, Phone, Shield, User2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesApi } from "@/lib/api/cases";
import { AMMAN_DISTRICT_KEYS, getDistrictLabel } from "@/lib/amman-districts";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { onRequestCreated } from "@/lib/analytics";
import {
  getPublicCatalogEntryAnalyticsKind,
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

function createGuestRequestSchema(tBooking: TranslateFn) {
  return z.object({
    full_name: z.string().trim().min(2, tBooking("fullNameMin")),
    phone: z.string().trim().regex(phonePattern, tBooking("invalidPhone")),
    address: z.string().trim().min(1, tBooking("addressMin")),
    entry_id: z.string().trim().min(1, tBooking("selectService")),
  });
}

type GuestRequestValues = z.infer<ReturnType<typeof createGuestRequestSchema>>;

type GuestServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PublicCatalogEntry[];
  defaultEntryId?: string | null;
  serviceSlug: PublicServiceCategorySlug;
  categoryTitle: string;
  categoryTheme: CategoryTheme;
};

function getEntryTypeLabel(entry: PublicCatalogEntry, t: TranslateFn, tEnums: TranslateFn, tNewRequest: TranslateFn) {
  if (entry.type === "service") {
    return translateEnumValue(entry.serviceKind, tEnums);
  }

  if (entry.type === "lab") {
    return t("labels.labTest");
  }

  if (entry.type === "panel") {
    return tNewRequest("labPanel");
  }

  return entry.packageScope === "LAB_ONLY"
    ? tNewRequest("labPackage")
    : t("labels.comprehensiveBundle");
}

export function GuestServiceRequestDialog({
  open,
  onOpenChange,
  entries,
  defaultEntryId,
  serviceSlug,
  categoryTitle,
  categoryTheme,
}: GuestServiceRequestDialogProps) {
  const locale = useLocale();
  const t = useTranslations("serviceExplorer");
  const tBooking = useTranslations("booking");
  const tNewRequest = useTranslations("newRequestPage");
  const tEnums = useTranslations("enums");
  const pendingTrackingRef = useRef<Parameters<typeof onRequestCreated>[0] | null>(null);

  const form = useForm<GuestRequestValues>({
    resolver: zodResolver(createGuestRequestSchema(tBooking)),
    defaultValues: {
      full_name: "",
      phone: "",
      address: "",
      entry_id: defaultEntryId || entries[0]?.id || "",
    },
  });

  useEffect(() => {
    if (!open) return;

    const nextEntryId = defaultEntryId || entries[0]?.id || "";
    const currentEntryId = form.getValues("entry_id");

    if (!currentEntryId && nextEntryId) {
      form.setValue("entry_id", nextEntryId, { shouldValidate: true });
      return;
    }

    const currentStillExists = entries.some((entry) => entry.id === currentEntryId);
    if (!currentStillExists && nextEntryId) {
      form.setValue("entry_id", nextEntryId, { shouldValidate: true });
      return;
    }

    if (defaultEntryId && currentEntryId !== defaultEntryId) {
      form.setValue("entry_id", defaultEntryId, { shouldValidate: true });
    }
  }, [defaultEntryId, entries, form, open]);

  const selectedEntryId = form.watch("entry_id");
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) || null,
    [entries, selectedEntryId],
  );

  const createMutation = useMutation({
    mutationFn: async (values: GuestRequestValues) => {
      const targetEntry = entries.find((entry) => entry.id === values.entry_id);
      if (!targetEntry) {
        throw new Error("ENTRY_NOT_FOUND");
      }

      const response = await casesApi.createPublic({
        guest_name: values.full_name,
        guest_phone: values.phone,
        guest_address: values.address,
        services: [{
          service_id: targetEntry.id,
          original_price: Number(targetEntry.price ?? 0),
          bundle_price: Number(targetEntry.price ?? 0),
          notes: "",
        }],
        notes: "",
      });

      return response.data.case;
    },
    onSuccess: (createdCase) => {
      toast.success(tBooking("successMessage", { id: createdCase.id }));
      form.reset({
        full_name: "",
        phone: "",
        address: "",
        entry_id: defaultEntryId || entries[0]?.id || "",
      });
      onOpenChange(false);

      if (pendingTrackingRef.current) {
        onRequestCreated(pendingTrackingRef.current);
        pendingTrackingRef.current = null;
      }
    },
    onError: () => {
      toast.error(t("guestRequest.error"));
    },
  });

  const handleSubmit = (values: GuestRequestValues) => {
    const targetEntry = entries.find((entry) => entry.id === values.entry_id);

    pendingTrackingRef.current = targetEntry
      ? {
          service_slug: serviceSlug,
          service_kind: getPublicCatalogEntryAnalyticsKind(targetEntry),
          locale,
        }
      : null;

    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-2 top-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] translate-y-0 overflow-hidden rounded-[1.75rem] border-white/80 bg-[#f7faf8] p-0 shadow-[0_40px_120px_-44px_rgba(15,79,72,0.36)] sm:bottom-auto sm:top-[50%] sm:w-[min(46rem,calc(100vw-2rem))] sm:max-w-[46rem] sm:translate-y-[-50%]">
        <div className="relative max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain">
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
            <DialogHeader className="space-y-3 text-left">
              <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#104d49]">
                  <Shield className="h-4 w-4" />
                </span>
                Curevie
              </div>
              <DialogTitle className="text-xl font-semibold text-white sm:text-2xl">
                {t("guestRequest.title")}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6 text-white/86 sm:leading-7">
                {t("guestRequest.description", { category: categoryTitle })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="rounded-[1.5rem] border border-[#dbe7e2] bg-white/88 p-4 shadow-[0_24px_70px_-54px_rgba(15,79,72,0.22)] sm:rounded-[1.7rem]">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#9c9fa2]">
                    {t("guestRequest.guestInfo")}
                  </div>

                  <div className="mt-4 grid gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tBooking("fullName")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User2 className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9fa2]" />
                              <Input {...field} className="h-12 rounded-full ps-11 text-sm" />
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
                          <FormLabel>{tBooking("phone")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c9fa2]" />
                              <Input {...field} className="h-12 rounded-full ps-11 text-sm" />
                            </div>
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
                          <FormLabel>{tBooking("address")}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-full ps-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-[#9c9fa2]" />
                                  <SelectValue placeholder={tBooking("selectDistrict")} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AMMAN_DISTRICT_KEYS.map((key) => (
                                <SelectItem key={key} value={getDistrictLabel(key, locale)}>
                                  {getDistrictLabel(key, locale)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entry_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("guestRequest.serviceFieldLabel")}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-full text-sm">
                                <SelectValue placeholder={t("guestRequest.serviceFieldPlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {entries.map((entry) => (
                                <SelectItem key={entry.id} value={entry.id}>
                                  {entry.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="sticky bottom-0 flex-col-reverse gap-3 border-t border-[#e2ece7] bg-[#f7faf8]/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:flex-row sm:justify-between sm:pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full rounded-full border-[#d9e6df] bg-white px-5 text-[#12312d] hover:bg-white sm:w-auto"
                    onClick={() => onOpenChange(false)}
                  >
                    {tBooking("close")}
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-12 w-full rounded-full px-5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: categoryTheme.base }}
                    disabled={createMutation.isPending || !entries.length}
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
              </form>
            </Form>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-[#dbe7e2] bg-white/88 p-4 shadow-[0_24px_70px_-54px_rgba(15,79,72,0.22)] sm:rounded-[1.7rem]">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#9c9fa2]">
                  {t("guestRequest.serviceCardTitle")}
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-white/70 p-4 shadow-[0_20px_56px_-50px_rgba(15,79,72,0.2)]" style={{ background: `linear-gradient(180deg, ${categoryTheme.soft} 0%, #ffffff 100%)` }}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]" style={{ color: categoryTheme.muted }}>
                    {selectedEntry ? getEntryTypeLabel(selectedEntry, t, tEnums, tNewRequest) : categoryTitle}
                  </div>
                  <div className="mt-3 break-words text-xl font-semibold text-[#12312d] sm:text-2xl">
                    {selectedEntry?.name || t("guestRequest.serviceFieldPlaceholder")}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#617672]">
                    {selectedEntry?.description || t("guestRequest.serviceHint")}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#dbe7e2] bg-white/88 p-4 shadow-[0_24px_70px_-54px_rgba(15,79,72,0.22)] sm:rounded-[1.7rem]">
                <div className="grid gap-4">
                  <div>
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#9c9fa2]">
                      {t("guestRequest.requestMode")}
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#12312d]">
                      {t("guestRequest.requestModeValue")}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[#e5eeea] bg-[#f9fbfa] p-4">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                        {t("guestRequest.categoryLabel")}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#12312d]">
                        {selectedEntry?.categoryName || categoryTitle}
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-[#e5eeea] bg-[#f9fbfa] p-4">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                        {t("guestRequest.priceLabel")}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#12312d]">
                        {selectedEntry?.price === null || selectedEntry?.price === undefined || !Number.isFinite(selectedEntry.price)
                          ? t("labels.priceOnRequest")
                          : formatCurrency(selectedEntry.price, locale)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-[#dfe9e4] bg-[#f4f8f6] px-4 py-4 text-sm leading-7 text-[#304a43]">
                    {t("guestRequest.footerNote")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
