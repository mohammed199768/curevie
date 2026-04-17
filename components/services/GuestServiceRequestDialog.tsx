"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MapPin, Phone, Shield, User2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
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
  });
}

type GuestRequestValues = z.infer<ReturnType<typeof createGuestRequestSchema>>;

type GuestServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PublicCatalogEntry[];
  defaultEntryId?: string | null;
  preSelectedEntryIds?: string[];
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
  preSelectedEntryIds,
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
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>(() => {
    if (preSelectedEntryIds?.length) {
      return preSelectedEntryIds;
    }

    if (defaultEntryId && entries.some((entry) => entry.id === defaultEntryId)) {
      return [defaultEntryId];
    }

    return [];
  });

  useEffect(() => {
    if (open && preSelectedEntryIds) {
      setSelectedEntryIds(preSelectedEntryIds);
    }
  }, [open, preSelectedEntryIds]);

  const form = useForm<GuestRequestValues>({
    resolver: zodResolver(createGuestRequestSchema(tBooking)),
    defaultValues: {
      full_name: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    if (preSelectedEntryIds) {
      setSelectedEntryIds(preSelectedEntryIds.filter((id) => entries.some((entry) => entry.id === id)));
      return;
    }

    if (defaultEntryId && entries.some((entry) => entry.id === defaultEntryId)) {
      setSelectedEntryIds([defaultEntryId]);
      return;
    }

    setSelectedEntryIds((current) => current.filter((id) => entries.some((entry) => entry.id === id)));
  }, [defaultEntryId, entries, open, preSelectedEntryIds]);

  const selectedEntries = useMemo(
    () =>
      selectedEntryIds
        .map((id) => entries.find((entry) => entry.id === id) || null)
        .filter((entry): entry is PublicCatalogEntry => entry !== null),
    [entries, selectedEntryIds],
  );
  const totalSelectedPrice = useMemo(
    () => selectedEntries.reduce((sum, entry) => sum + Number(entry.price ?? 0), 0),
    [selectedEntries],
  );
  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof entries> = {};

    for (const entry of entries) {
      const key = entry.categoryName || t("otherCategory");
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }

    return groups;
  }, [entries, t]);
  const shouldShowGroupHeaders = Object.keys(groupedEntries).length > 1;
  const selectionLimitReached = selectedEntryIds.length >= 5;

  const handleEntryCheckedChange = (entryId: string, checked: boolean) => {
    setSelectedEntryIds((current) => {
      if (checked) {
        if (current.includes(entryId) || current.length >= 5) {
          return current;
        }

        return [...current, entryId];
      }

      return current.filter((id) => id !== entryId);
    });
  };

  const createMutation = useMutation({
    mutationFn: async (values: GuestRequestValues) => {
      const services = selectedEntryIds.map((id) => {
        const entry = entries.find((item) => item.id === id);

        return {
          service_id: id,
          original_price: Number(entry?.price ?? 0),
          bundle_price: Number(entry?.price ?? 0),
          notes: "",
        };
      });

      if (!services.length) {
        throw new Error("ENTRY_NOT_FOUND");
      }

      const response = await casesApi.createPublic({
        guest_name: values.full_name,
        guest_phone: values.phone,
        guest_address: values.address,
        services,
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
      });
      setSelectedEntryIds(defaultEntryId && entries.some((entry) => entry.id === defaultEntryId) ? [defaultEntryId] : []);
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
    if (selectedEntryIds.length === 0) {
      toast.error(t("minSelectionError"));
      return;
    }

    const targetEntry = entries.find((entry) => entry.id === selectedEntryIds[0]);

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

          <div className="grid gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:gap-6">
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
                              <Input {...field} placeholder={tBooking("phonePlaceholder")} className="h-12 rounded-full ps-11 text-sm" />
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
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-full ps-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-[#9c9fa2]" />
                                  <SelectValue placeholder={tBooking("addressPlaceholder")} />
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
                                            {entry.price === null || entry.price === undefined || !Number.isFinite(entry.price)
                                              ? t("labels.priceOnRequest")
                                              : formatCurrency(entry.price, locale)}
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="shrink-0 rounded-full border-[#dbe7e2] text-[0.65rem] text-[#46625b]">
                                          {getEntryTypeLabel(entry, t, tEnums, tNewRequest)}
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
                        <p className="text-xs font-medium text-[#a15b18]">{t("maxSelectionHint")}</p>
                      ) : null}
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

            <div className="min-w-0 space-y-4">
              <div className="rounded-[1.5rem] border border-[#dbe7e2] bg-white/88 p-4 shadow-[0_24px_70px_-54px_rgba(15,79,72,0.22)] sm:rounded-[1.7rem]">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#9c9fa2]">
                  {t("guestRequest.serviceCardTitle")}
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-white/70 p-4 shadow-[0_20px_56px_-50px_rgba(15,79,72,0.2)]" style={{ background: `linear-gradient(180deg, ${categoryTheme.soft} 0%, #ffffff 100%)` }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]" style={{ color: categoryTheme.muted }}>
                      {categoryTitle}
                    </div>
                    <Badge className="rounded-full bg-[#12312d] px-3 py-1 text-xs font-semibold text-white hover:bg-[#12312d]">
                      {selectedEntries.length} {t("selectedCount")}
                    </Badge>
                  </div>
                  <div className="mt-3 break-words text-xl font-semibold text-[#12312d] sm:text-2xl">
                    {selectedEntries.length ? t("guestRequest.serviceCardTitle") : t("guestRequest.serviceFieldPlaceholder")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEntries.length ? (
                      selectedEntries.map((entry) => (
                        <span
                          key={entry.id}
                          className="inline-flex items-center rounded-full border border-[#d9e6df] bg-white/90 px-3 py-1 text-xs font-medium text-[#12312d]"
                        >
                          {entry.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-[#617672]">{t("guestRequest.serviceHint")}</p>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#12312d]">
                    {selectedEntries.length
                      ? formatCurrency(totalSelectedPrice, locale)
                      : t("labels.priceOnRequest")}
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
                        {categoryTitle}
                      </div>
                      <div className="mt-1 text-xs text-[#7a8f89]">
                        {selectedEntries.length} / 5
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-[#e5eeea] bg-[#f9fbfa] p-4">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9c9fa2]">
                        {t("guestRequest.priceLabel")}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#12312d]">
                        {!selectedEntries.length
                          ? t("labels.priceOnRequest")
                          : formatCurrency(totalSelectedPrice, locale)}
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
