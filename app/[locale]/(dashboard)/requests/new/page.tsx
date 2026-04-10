"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Phone, ShieldCheck, Stethoscope, UserRound, Wallet, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { casesApi } from "@/lib/api/cases";
import { patientsApi } from "@/lib/api/patients";
import { servicesApi } from "@/lib/api/services";
import type { PatientUser, ServiceItem } from "@/lib/api/types";
import { AMMAN_DISTRICT_KEYS, getDistrictLabel } from "@/lib/amman-districts";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { useAuthStore } from "@/lib/stores/auth.store";
import { normalizeListResponse } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PatientProfileData extends PatientUser {
  secondary_phone?: string | null;
  total_points?: number;
}

interface PatientProfileResponse {
  patient?: PatientProfileData | null;
}

const EMPTY_SERVICE_ITEMS: ServiceItem[] = [];
const ALL_CATEGORIES = [
  { id: "79242b41-42dd-44a0-a944-77488fac2441", label: "الزيارات الطبية", type: "MEDICAL" },
  { id: "9bd587f7-2b6e-4885-b704-f3d53cd02414", label: "رعاية تمريضية منزلية", type: "MEDICAL" },
  { id: "3a3ab6d1-6b90-42b3-80aa-a0ef754576df", label: "العلاج الطبيعي", type: "MEDICAL" },
  { id: "53123e20-0e97-43b0-85e8-c8876e2b0dbc", label: "العلاج الوظيفي", type: "MEDICAL" },
  { id: "81b02ae3-76f5-4fd4-9221-6eb069c87d1a", label: "الأشعة", type: "RADIOLOGY" },
] as const;

type SupportedServiceType = (typeof ALL_CATEGORIES)[number]["type"];

type SelectedCaseService = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  serviceType: SupportedServiceType;
};

const MAX_CASE_SERVICES = 5;

function getLocalizedValue<T extends {
  name?: string;
  name_en?: string;
  name_ar?: string;
  description?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
}>(
  item: T | null | undefined,
  locale: string,
  field: "name" | "description",
) {
  if (!item) return field === "name" ? "" : null;

  if (field === "name") {
    return locale === "ar"
      ? item.name_ar || item.name_en || item.name || ""
      : item.name_en || item.name_ar || item.name || "";
  }

  return locale === "ar"
    ? item.description_ar || item.description_en || item.description || null
    : item.description_en || item.description_ar || item.description || null;
}

function getServicePrice(service: ServiceItem | null | undefined) {
  return Number(service?.price ?? service?.cost ?? service?.total_cost ?? 0);
}

export default function NewRequestPage() {
  const locale = useLocale();
  const tPage = useTranslations("newRequestPage");
  const tBooking = useTranslations("booking");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const searchParams = useSearchParams();
  const patient = useAuthStore((state) => state.patient);
  const patchPatient = useAuthStore((state) => state.patchPatient);
  const appliedPresetRef = useRef(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORIES[0].id);
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [overridePhone, setOverridePhone] = useState<string>("");
  const [overrideAddress, setOverrideAddress] = useState<string>("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<SelectedCaseService[]>([]);

  const activeCategory = useMemo(
    () => ALL_CATEGORIES.find((category) => category.id === activeCategoryId) ?? ALL_CATEGORIES[0],
    [activeCategoryId],
  );
  const serviceType = activeCategory.type;

  const servicesQuery = useQuery({
    queryKey: ["new-request", "services", activeCategoryId],
    queryFn: async () =>
      normalizeListResponse<ServiceItem>(
        (await servicesApi.list({ limit: 100, category_id: activeCategoryId })).data,
      ).data,
    enabled: true,
  });

  const patientProfileQuery = useQuery({
    queryKey: ["new-request", "patient-profile", patient?.id],
    queryFn: async (): Promise<PatientProfileData | null> => {
      if (!patient?.id) return null;
      const response = await patientsApi.getById(patient.id);
      const data = response.data;

      if (data && typeof data === "object" && "patient" in data) {
        const nestedPatient = (data as PatientProfileResponse).patient;
        return nestedPatient ?? null;
      }

      return data;
    },
    enabled: Boolean(patient?.id),
    staleTime: 5 * 60 * 1000,
  });

  const options = servicesQuery.data ?? EMPTY_SERVICE_ITEMS;
  const patientProfile = patientProfileQuery.data;
  const patientDisplayName = patientProfile?.full_name || patient?.full_name || "";
  const patientPhone = patientProfile?.phone || patient?.phone || "";
  const patientAddress = patientProfile?.address || patient?.address || "";
  const selectDistrictLabel = tPage.has("selectDistrict") ? tPage("selectDistrict") : tBooking("selectDistrict");
  const activeCatalogLoading = servicesQuery.isLoading;

  const selectedServiceIds = useMemo(
    () => new Set(selectedServices.map((service) => service.id)),
    [selectedServices],
  );
  const totalSelectedPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices],
  );
  const formattedTotalPrice = useMemo(
    () => formatCurrency(totalSelectedPrice, locale),
    [locale, totalSelectedPrice],
  );
  const effectivePhone = overridePhone || patientPhone;
  const effectiveAddress = overrideAddress || patientAddress;
  const compiledNotes = useMemo(
    () => [
      notes,
      (overridePhone.trim() && overridePhone.trim() !== patientPhone)
        ? `رقم بديل: ${overridePhone.trim()}`
        : "",
      (overrideAddress.trim() && overrideAddress.trim() !== patientAddress)
        ? `عنوان بديل: ${overrideAddress.trim()}`
        : "",
    ].filter(Boolean).join("\n") || null,
    [notes, overrideAddress, overridePhone, patientAddress, patientPhone],
  );
  const reviewServices = useMemo(
    () => selectedServices.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description || undefined,
      price: Number(service.price || 0),
    })),
    [selectedServices],
  );
  const reviewServiceHeading = reviewServices[0]?.name || tPage("notProvided");
  const reviewServiceTypes = useMemo(
    () => Array.from(new Set(selectedServices.map((service) => service.serviceType))),
    [selectedServices],
  );
  const canSubmitCurrentSelection = selectedServices.length > 0;
  const selectionBadges = useMemo(
    () => selectedServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price || 0),
    })),
    [selectedServices],
  );

  useEffect(() => {
    if (appliedPresetRef.current) return;

    const presetCategoryId = searchParams.get("categoryId");
    const presetServiceType = searchParams.get("serviceType");
    const presetServiceId = searchParams.get("serviceId");

    if (presetCategoryId && ALL_CATEGORIES.some((category) => category.id === presetCategoryId)) {
      setActiveCategoryId(presetCategoryId);
    } else if (presetServiceType === "RADIOLOGY") {
      setActiveCategoryId("81b02ae3-76f5-4fd4-9221-6eb069c87d1a");
    }

    if (presetServiceId) {
      setServiceId(presetServiceId);
    }

    appliedPresetRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!patientProfile) return;

    patchPatient({
      full_name: patientProfile.full_name || patient?.full_name || "",
      phone: patientProfile.phone || patient?.phone || "",
      address: patientProfile.address || patient?.address || null,
      gender: patientProfile.gender || patient?.gender || null,
      date_of_birth: patientProfile.date_of_birth || patient?.date_of_birth || null,
      avatar_url: patientProfile.avatar_url || patient?.avatar_url || null,
      points: Number(patientProfile.total_points ?? patient?.points ?? 0),
    });
  }, [
    patchPatient,
    patient?.address,
    patient?.avatar_url,
    patient?.date_of_birth,
    patient?.full_name,
    patient?.gender,
    patient?.phone,
    patient?.points,
    patientProfile,
  ]);

  useEffect(() => {
    if (!options.length) {
      setServiceId("");
      return;
    }

    if (!serviceId || !options.some((item) => item.id === serviceId)) {
      setServiceId(options[0].id);
    }
  }, [options, serviceId]);

  const handleReviewOpenChange = (open: boolean) => {
    setIsReviewOpen(open);
  };

  const addServicesToSelection = (servicesToAdd: SelectedCaseService[]) => {
    if (!servicesToAdd.length) return;

    setSelectedServices((current) => {
      const next = [...current];

      for (const service of servicesToAdd) {
        if (next.some((item) => item.id === service.id)) continue;
        if (next.length >= MAX_CASE_SERVICES) break;
        next.push(service);
      }

      return next;
    });
  };

  const buildSelectableServices = (option: ServiceItem | null): SelectedCaseService[] => {
    if (!option) return [];

    return [{
      id: option.id,
      name: getLocalizedValue(option, locale, "name") || "",
      description: getLocalizedValue(option, locale, "description") || undefined,
      price: getServicePrice(option),
      serviceType,
    }];
  };

  const handleOptionSelect = (item: ServiceItem) => {
    setServiceId(item.id);
    addServicesToSelection(buildSelectableServices(item));
  };

  const removeSelectedService = (serviceIdToRemove: string) => {
    setSelectedServices((current) => current.filter((service) => service.id !== serviceIdToRemove));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!patient?.id) {
        toast.error("يرجى تسجيل الدخول لإتمام الطلب");
        router.push(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/requests/new`)}`);
        throw new Error("AUTH_REQUIRED");
      }

      if (!selectedServices.length) throw new Error(tPage("noServices"));

      const response = await casesApi.create({
        services: selectedServices.slice(0, MAX_CASE_SERVICES).map((service) => ({
          service_id: service.id,
          original_price: service.price,
          bundle_price: service.price,
          notes: "",
        })),
        notes: compiledNotes ?? "",
      });

      return response.data.case;
    },
    onSuccess: () => {
      handleReviewOpenChange(false);
      toast.success(tPage("requestSubmitted"));
      router.push(`/${locale}/requests`);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") return;
      toast.error(tCommon("error"));
    },
  });

  const handleOpenReview = () => {
    if (!canSubmitCurrentSelection) {
      toast.error(tPage("noServices"));
      return;
    }

    setIsReviewOpen(true);
  };

  return (
    <>
      <Card className="rounded-[1.75rem] border-white/60 bg-gradient-to-br from-white via-white to-emerald-50/60 shadow-[0_28px_80px_-32px_rgba(15,76,68,0.28)]">
        <CardHeader className="border-b border-emerald-100/80 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">{tPage("title")}</CardTitle>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
              {tPage("reviewHint")}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Input value={patientDisplayName} disabled />

            <div className="space-y-1">
              {patientProfile?.secondary_phone ? (
                <Select
                  value={overridePhone || patientPhone}
                  onValueChange={setOverridePhone}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={patientPhone} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={patientPhone}>{patientPhone}</SelectItem>
                    <SelectItem value={patientProfile.secondary_phone}>
                      {patientProfile.secondary_phone}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={patientPhone} disabled />
              )}
            </div>

            <Select
              value={overrideAddress || patientAddress}
              onValueChange={setOverrideAddress}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={patientAddress || selectDistrictLabel} />
              </SelectTrigger>
              <SelectContent>
                {AMMAN_DISTRICT_KEYS.map((key) => (
                  <SelectItem key={key} value={getDistrictLabel(key, locale)}>
                    {getDistrictLabel(key, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{tPage("serviceTypeLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setServiceId("");
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    activeCategoryId === category.id
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {activeCatalogLoading ? (
            <AppPreloader variant="panel" title={tCommon("loading")} blockCount={3} blockVariant="line" />
          ) : !options.length ? (
            <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm text-muted-foreground">
              {tPage("noServices")}
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOptionSelect(item)}
                  className={`rounded-2xl border p-3 text-left transition ${(serviceId === item.id || selectedServiceIds.has(item.id)) ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"}`}
                >
                  <p className="font-semibold">{getLocalizedValue(item, locale, "name")}</p>
                  <p className="text-xs text-muted-foreground">{getLocalizedValue(item, locale, "description") || "-"}</p>
                  {getServicePrice(item) ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{formatCurrency(getServicePrice(item), locale)}</Badge>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          {selectionBadges.length ? (
            <div className="flex flex-wrap gap-2">
              {selectionBadges.map((badge) => (
                <Badge key={badge.id} className="gap-2 rounded-full px-3 py-1.5">
                  <span>{badge.name}</span>
                  <span className="opacity-75">{formatCurrency(badge.price, locale)}</span>
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/10"
                    onClick={() => removeSelectedService(badge.id)}
                    aria-label={badge.name}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}

          <Textarea rows={4} placeholder={tPage("notesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} />

          <Button className="min-h-12 bg-primary hover:bg-primary/90" onClick={handleOpenReview} disabled={mutation.isPending || activeCatalogLoading || !canSubmitCurrentSelection}>
            {mutation.isPending ? tBooking("submitting") : tPage("reviewBeforeSubmit")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isReviewOpen} onOpenChange={handleReviewOpenChange}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto z-[260] grid h-[min(100dvh,54rem)] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-t-[2rem] rounded-b-none border-0 bg-[#f5fbf8] p-0 shadow-[0_-18px_50px_-20px_rgba(13,68,64,0.45)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:h-auto sm:max-h-[92dvh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:shadow-[0_40px_120px_-28px_rgba(13,68,64,0.38)]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0d4440_0%,#15514c_52%,#234740_100%)] px-4 pb-4 pt-5 text-white sm:px-8 sm:pb-8 sm:pt-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#c69d2e]" />
            <div className="absolute inset-y-0 right-0 w-44 bg-white/5 blur-3xl" />
            <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/10 ring-1 ring-white/20 backdrop-blur-sm sm:h-16 sm:w-16 sm:rounded-[1.6rem]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#0d4440] shadow-lg shadow-black/10 sm:h-12 sm:w-12 sm:text-xl">
                    C
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-emerald-100/70">Curevie</p>
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-lg font-semibold leading-tight text-white sm:text-[2rem]">
                      {tPage("reviewTitle")}
                    </DialogTitle>
                    <DialogDescription className="max-w-xl text-[0.92rem] leading-6 text-emerald-50/75 sm:text-[0.95rem]">
                      {tPage("reviewSubtitle")}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <div className="w-full self-start rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm sm:w-auto">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-50/65">{tCommon("amount")}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{formattedTotalPrice}</p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-9.5rem)] overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-3 sm:max-h-[calc(92dvh-9rem)] sm:px-6 sm:pb-6 sm:pt-4">
            <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.45rem] border border-emerald-100 bg-white p-4 shadow-sm sm:rounded-[1.6rem] sm:p-5">
                <div className="mb-4 flex items-center gap-3 sm:mb-5">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-[#14514b]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#7a8f89]">{tPage("contactCardTitle")}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{patientDisplayName || tCommon("patientFallback")}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("nameLabel")}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{patientDisplayName || tCommon("patientFallback")}</p>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-[#14514b]" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("phoneLabel")}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{effectivePhone || tPage("notProvided")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-[#14514b]" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("addressLabel")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">{effectiveAddress || tPage("notProvided")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.45rem] border border-emerald-100 bg-white p-4 shadow-sm sm:rounded-[1.6rem] sm:p-5">
                <div className="mb-4 flex items-center gap-3 sm:mb-5">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-[#14514b]">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#7a8f89]">{tPage("serviceCardTitle")}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{reviewServiceHeading}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("selectedServiceLabel")}</p>
                    <div className="mt-2 space-y-2">
                      {reviewServices.map((service) => (
                        <div key={service.id} className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{service.name}</p>
                            {service.description ? (
                              <p className="mt-1 text-sm leading-6 text-slate-600">{service.description}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(service.price, locale)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("serviceTypeLabel")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reviewServiceTypes.map((type) => (
                        <Badge key={type} className="rounded-full bg-[#14514b] px-3 py-1 text-white hover:bg-[#14514b]">
                          {translateEnumValue(type, tEnums)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <div className="flex items-start gap-3">
                      <Wallet className="mt-0.5 h-4 w-4 text-[#14514b]" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("priceLabel")}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{formattedTotalPrice}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("notesLabel")}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{compiledNotes || tPage("notProvided")}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 z-10 -mx-3 mt-4 border-t border-emerald-100 bg-[#f5fbf8]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
              <div className="rounded-[1.4rem] border border-emerald-100 bg-white px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-2.5 text-[#14514b]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tPage("confirmRequest")}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{tPage("reviewHint")}</p>
                    </div>
                  </div>

                  <DialogFooter className="w-full gap-3 sm:w-auto sm:flex-row sm:items-center sm:space-x-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full rounded-full border-slate-200 bg-white px-5 sm:w-auto"
                      onClick={() => handleReviewOpenChange(false)}
                    >
                      {tPage("editRequest")}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 w-full rounded-full bg-[#14514b] px-6 hover:bg-[#103e3a] sm:w-auto"
                      onClick={() => mutation.mutate()}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? tBooking("submitting") : tPage("confirmRequest")}
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
