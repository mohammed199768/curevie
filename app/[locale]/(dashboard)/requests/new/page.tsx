"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Phone, ShieldCheck, Stethoscope, UserRound, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { invoicesApi } from "@/lib/api/invoices";
import { labPackagesApi, labPanelsApi } from "@/lib/api/lab-panels";
import { patientsApi } from "@/lib/api/patients";
import { requestsApi } from "@/lib/api/requests";
import { servicesApi } from "@/lib/api/services";
import type {
  CreateRequestPayload,
  LabPackageItem,
  LabPanelItem,
  PackageItem,
  PatientUser,
  ServiceItem,
  ServiceOption,
  ServiceType,
} from "@/lib/api/types";
import { AMMAN_DISTRICT_KEYS, getDistrictLabel } from "@/lib/amman-districts";
import { formatCurrency } from "@/lib/formatting";
import { translateEnumValue } from "@/lib/i18n";
import { useAuthStore } from "@/lib/stores/auth.store";
import { normalizeListResponse } from "@/lib/utils";
import { getApiError } from "@/lib/utils/apiError";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LabMode = "PANEL" | "PACKAGE";

interface PatientProfileData extends PatientUser {
  secondary_phone?: string | null;
  total_points?: number;
}

interface PatientProfileResponse {
  patient?: PatientProfileData | null;
}

const EMPTY_SERVICE_ITEMS: ServiceItem[] = [];
const EMPTY_LAB_PANEL_ITEMS: LabPanelItem[] = [];
const EMPTY_LAB_PACKAGE_ITEMS: LabPackageItem[] = [];
const EMPTY_PACKAGE_ITEMS: PackageItem[] = [];

type LabTestSummary = {
  id: string;
  name: string;
  unit?: string | null;
  reference_range?: string | null;
  display_reference_range?: string | null;
};

function isCreateRequestPayload(payload: Partial<CreateRequestPayload>): payload is CreateRequestPayload {
  if (payload.request_type !== "PATIENT" && payload.request_type !== "GUEST") {
    return false;
  }

  if (payload.service_type === "MEDICAL" || payload.service_type === "RADIOLOGY") {
    return Boolean(payload.service_id);
  }

  if (payload.service_type === "PACKAGE") {
    return Boolean(payload.package_id);
  }

  if (payload.service_type === "LAB") {
    return Boolean(payload.lab_test_id || payload.lab_panel_id || payload.lab_package_id);
  }

  return false;
}

function getLocalizedValue<T extends { name?: string; name_en?: string; name_ar?: string; description?: string | null; description_en?: string | null; description_ar?: string | null }>(
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

function getDisplayReferenceRange(test: { display_reference_range?: string | null; reference_range?: string | null }) {
  return test.display_reference_range ?? test.reference_range ?? null;
}

function getOptionRawPrice(option: ServiceOption | null | undefined): number | string | null | undefined {
  if (!option) return null;
  if ("price" in option) return option.price;
  if ("cost" in option) return option.cost;
  if ("total_cost" in option) return option.total_cost;
  return null;
}

function getOptionTestsCount(option: ServiceOption): number {
  if ("tests" in option && Array.isArray(option.tests) && option.tests.length) {
    return option.tests.length;
  }
  if ("test_ids" in option && Array.isArray(option.test_ids) && option.test_ids.length) {
    return option.test_ids.length;
  }
  if ("tests_count" in option && typeof option.tests_count === "number") {
    return option.tests_count;
  }
  return 0;
}

function getOptionPanelsCount(option: ServiceOption): number {
  if ("panels" in option && Array.isArray(option.panels) && option.panels.length) {
    return option.panels.length;
  }
  if ("panel_ids" in option && Array.isArray(option.panel_ids) && option.panel_ids.length) {
    return option.panel_ids.length;
  }
  if ("panels_count" in option && typeof option.panels_count === "number") {
    return option.panels_count;
  }
  return 0;
}

function getOptionServicesCount(option: ServiceOption): number {
  if ("services" in option && Array.isArray(option.services) && option.services.length) {
    return option.services.length;
  }
  if ("service_ids" in option && Array.isArray(option.service_ids) && option.service_ids.length) {
    return option.service_ids.length;
  }
  return 0;
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

  const [serviceType, setServiceType] = useState<ServiceType>("MEDICAL");
  const [labMode, setLabMode] = useState<LabMode>("PANEL");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [overridePhone, setOverridePhone] = useState<string>("");
  const [overrideAddress, setOverrideAddress] = useState<string>("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    discount_amount: number;
    final_amount: number;
    discount_type: "PERCENTAGE" | "FIXED";
    discount_value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const servicesQuery = useQuery({
    queryKey: ["new-request", "services", serviceType],
    queryFn: async () =>
      normalizeListResponse<ServiceItem>(
        (await servicesApi.list({ limit: 100, service_kind: serviceType === "RADIOLOGY" ? "RADIOLOGY" : "MEDICAL" })).data,
      ).data,
    enabled: serviceType === "MEDICAL" || serviceType === "RADIOLOGY",
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

  const labPanelsQuery = useQuery({
    queryKey: ["lab-panels", "list"],
    queryFn: async () => normalizeListResponse<LabPanelItem>((await labPanelsApi.list({ limit: 100, is_active: true })).data).data,
    enabled: serviceType === "LAB" && labMode === "PANEL",
  });

  const labPackagesQuery = useQuery({
    queryKey: ["lab-packages", "list"],
    queryFn: async () => normalizeListResponse<LabPackageItem>((await labPackagesApi.list({ limit: 100, is_active: true })).data).data,
    enabled: serviceType === "LAB" && labMode === "PACKAGE",
  });

  const medicalPackagesQuery = useQuery({
    queryKey: ["new-request", "packages", "medical"],
    queryFn: async () => normalizeListResponse<PackageItem>((await servicesApi.listPackages({ limit: 100 })).data).data,
    enabled: serviceType === "PACKAGE",
  });

  const serviceOptions = servicesQuery.data ?? EMPTY_SERVICE_ITEMS;
  const labPanelOptions = labPanelsQuery.data ?? EMPTY_LAB_PANEL_ITEMS;
  const labPackageOptions = labPackagesQuery.data ?? EMPTY_LAB_PACKAGE_ITEMS;
  const medicalPackageOptions = medicalPackagesQuery.data ?? EMPTY_PACKAGE_ITEMS;

  const options = useMemo<ServiceOption[]>(() => {
    if (serviceType === "LAB" && labMode === "PANEL") return labPanelOptions;
    if (serviceType === "LAB" && labMode === "PACKAGE") return labPackageOptions;
    if (serviceType === "PACKAGE") return medicalPackageOptions;
    return serviceOptions;
  }, [
    labMode,
    labPackageOptions,
    labPanelOptions,
    medicalPackageOptions,
    serviceType,
    serviceOptions,
  ]);

  const selectedMedicalPackage =
    serviceType === "PACKAGE"
      ? medicalPackageOptions.find((item) => item.id === serviceId) || null
      : null;
  const selectedLabPackageId =
    serviceType === "LAB" && labMode === "PACKAGE"
      ? serviceId || null
      : null;
  const selectedLabPanelId =
    serviceType === "LAB" && labMode === "PANEL"
      ? serviceId || null
      : null;
  const selectedLabPackage =
    serviceType === "LAB" && labMode === "PACKAGE"
      ? labPackageOptions.find((item) => item.id === selectedLabPackageId) || null
      : null;
  const selectedLabPanel =
    serviceType === "LAB" && labMode === "PANEL"
      ? labPanelOptions.find((item) => item.id === selectedLabPanelId) || null
      : null;

  const selectedLabPanelDetailsQuery = useQuery({
    queryKey: ["lab-panels", "details", selectedLabPanelId],
    queryFn: async () => {
      if (!selectedLabPanelId) return null;
      return (await labPanelsApi.getById(selectedLabPanelId ?? "")).data;
    },
    enabled: Boolean(selectedLabPanelId),
  });

  const selectedLabPackageDetailsQuery = useQuery({
    queryKey: ["lab-packages", "details", selectedLabPackageId],
    queryFn: async () => {
      if (!selectedLabPackageId) return null;
      return (await labPackagesApi.getById(selectedLabPackageId ?? "")).data;
    },
    enabled: Boolean(selectedLabPackageId),
  });

  const selectedLabPanelDetails = selectedLabPanelDetailsQuery.data || selectedLabPanel;
  const selectedLabPackageDetails = selectedLabPackageDetailsQuery.data || selectedLabPackage;
  const deduplicatedPackageTests = useMemo<LabTestSummary[]>(() => {
    if (!selectedLabPackageDetails) return [];

    const seen = new Set<string>();
    const all: LabTestSummary[] = [];

    for (const test of selectedLabPackageDetails.tests || []) {
      if (!seen.has(test.id)) {
        seen.add(test.id);
        all.push(test);
      }
    }

    for (const panel of selectedLabPackageDetails.panels || []) {
      for (const test of panel.tests || []) {
        if (!seen.has(test.id)) {
          seen.add(test.id);
          all.push(test);
        }
      }
    }

    return all;
  }, [selectedLabPackageDetails]);

  const patientProfile = patientProfileQuery.data;
  const patientDisplayName = patientProfile?.full_name || patient?.full_name || "";
  const patientPhone = patientProfile?.phone || patient?.phone || "";
  const patientAddress = patientProfile?.address || patient?.address || "";
  const selectDistrictLabel = tPage.has("selectDistrict") ? tPage("selectDistrict") : tBooking("selectDistrict");
  const activeCatalogLoading = servicesQuery.isLoading
    || labPanelsQuery.isLoading
    || labPackagesQuery.isLoading
    || medicalPackagesQuery.isLoading;

  const effectiveServiceId = serviceId || options[0]?.id || "";
  const selectedOption = useMemo(
    () => options.find((item) => item.id === effectiveServiceId) || options[0] || null,
    [effectiveServiceId, options],
  );
  const selectedName = getLocalizedValue(selectedOption, locale, "name");
  const selectedDescription = getLocalizedValue(selectedOption, locale, "description");
  const selectedPrice = useMemo(() => {
    const rawPrice = getOptionRawPrice(selectedOption);
    if (rawPrice === null || rawPrice === undefined || rawPrice === "") return null;
    const numericPrice = Number(rawPrice);
    return Number.isFinite(numericPrice) ? numericPrice : null;
  }, [selectedOption]);
  const formattedPrice = useMemo(() => {
    if (selectedPrice === null) return tPage("notProvided");
    return formatCurrency(selectedPrice, locale);
  }, [locale, selectedPrice, tPage]);

  useEffect(() => {
    if (appliedPresetRef.current) return;

    const presetServiceType = searchParams.get("serviceType");
    const presetLabMode = searchParams.get("labMode");
    const presetServiceId = searchParams.get("serviceId");

    if (presetServiceType === "MEDICAL" || presetServiceType === "RADIOLOGY" || presetServiceType === "LAB" || presetServiceType === "PACKAGE") {
      setServiceType(presetServiceType);
    }

    if (presetLabMode === "PANEL" || presetLabMode === "PACKAGE") {
      setLabMode(presetLabMode);
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

  const resetCouponState = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError(null);
  };

  const handleReviewOpenChange = (open: boolean) => {
    setIsReviewOpen(open);
    if (!open) {
      resetCouponState();
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponResult(null);
    setIsValidatingCoupon(true);
    try {
      const res = await invoicesApi.validateCoupon(couponCode, Number(selectedPrice) || 0);
      setCouponResult({
        discount_amount: Number(res.data.discount_amount) || 0,
        final_amount: Number(res.data.final_amount) || 0,
        discount_type: res.data.coupon.discount_type,
        discount_value: Number(res.data.coupon.discount_value) || 0,
      });
    } catch (err) {
      const { error } = getApiError(err);
      setCouponError(error ?? "Invalid coupon code");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!effectiveServiceId) throw new Error(tPage("noServices"));
      const trimmedOverridePhone = overridePhone.trim();
      const payload: Partial<CreateRequestPayload> = {
        request_type: "PATIENT",
        patient_id: patient?.id,
        service_type: serviceType,
        notes: [
          notes,
          (trimmedOverridePhone && trimmedOverridePhone !== patientPhone)
            ? `📞 رقم بديل: ${trimmedOverridePhone}`
            : "",
          (overrideAddress.trim() && overrideAddress.trim() !== patientAddress)
            ? `📍 عنوان بديل: ${overrideAddress.trim()}`
            : "",
        ].filter(Boolean).join("\n") || null,
      };

      if (serviceType === "MEDICAL" || serviceType === "RADIOLOGY") {
        payload.service_id = effectiveServiceId;
      }
      if (serviceType === "PACKAGE") {
        payload.service_type = "PACKAGE";
        payload.package_id = effectiveServiceId;
      }
      if (serviceType === "LAB") {
        payload.service_type = "LAB";
        if (labMode === "PANEL") {
          payload.lab_panel_id = effectiveServiceId;
        } else {
          payload.lab_package_id = effectiveServiceId;
        }
      }

      if (couponResult && couponCode.trim()) {
        payload.coupon_code = couponCode.toUpperCase().trim();
      }

      if (!isCreateRequestPayload(payload)) {
        throw new Error(tPage("noServices"));
      }

      const response = await requestsApi.create(payload);
      return response.data.request;
    },
    onSuccess: (request) => {
      handleReviewOpenChange(false);
      toast.success(tPage("requestSubmitted"));
      router.push(`/${locale}/requests/${request.id}`);
    },
    onError: () => toast.error(tCommon("error")),
  });

  const handleOpenReview = () => {
    if (!effectiveServiceId || !selectedOption) {
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

            {/* Phone: dropdown of available numbers */}
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

            {/* Address: dropdown of Amman districts */}
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

          <div className="grid gap-2 md:grid-cols-4">
            {(["MEDICAL", "RADIOLOGY", "LAB", "PACKAGE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setServiceType(type);
                  if (type === "LAB") {
                    setLabMode("PANEL");
                  }
                  setServiceId("");
                }}
                className={`rounded-2xl border p-3 text-left transition ${serviceType === type ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"}`}
              >
                <p className="font-semibold">
                  {type === "MEDICAL"
                    ? tPage("medical")
                    : type === "RADIOLOGY"
                      ? tPage("radiology")
                      : type === "LAB"
                        ? tPage("lab")
                        : tPage("comprehensivePackages")}
                </p>
              </button>
            ))}
          </div>

          {serviceType === "LAB" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={labMode === "PANEL" ? "default" : "outline"} onClick={() => { setLabMode("PANEL"); setServiceId(""); }}>
                {tPage("testPanel")}
              </Button>
              <Button type="button" variant={labMode === "PACKAGE" ? "default" : "outline"} onClick={() => { setLabMode("PACKAGE"); setServiceId(""); }}>
                {tPage("labPackage")}
              </Button>
            </div>
          ) : null}

          {activeCatalogLoading ? (
            <AppPreloader variant="panel" title={tCommon("loading")} blockCount={3} blockVariant="line" />
          ) : !options.length ? (
            <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm text-muted-foreground">
              {serviceType === "PACKAGE"
                ? tPage("noComprehensivePackages")
                : serviceType === "LAB" && labMode === "PACKAGE"
                  ? tPage("noLabPackages")
                  : serviceType === "LAB" && labMode === "PANEL"
                    ? tPage("noLabPanels")
                    : tPage("noServices")}
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setServiceId(item.id)}
                  className={`rounded-2xl border p-3 text-left transition ${serviceId === item.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"}`}
                >
                  <p className="font-semibold">{getLocalizedValue(item, locale, "name")}</p>
                  <p className="text-xs text-muted-foreground">{getLocalizedValue(item, locale, "description") || "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {"price" in item && item.price ? <Badge>{item.price} JD</Badge> : null}
                    {"cost" in item && item.cost ? <Badge>{item.cost} JD</Badge> : null}
                    {"total_cost" in item && item.total_cost ? <Badge>{item.total_cost} JD</Badge> : null}
                    {getOptionTestsCount(item)
                      ? <Badge variant="outline">{tPage("testsCount", { count: getOptionTestsCount(item) })}</Badge>
                      : null}
                    {getOptionPanelsCount(item)
                      ? <Badge variant="outline">{tPage("panelsCount", { count: getOptionPanelsCount(item) })}</Badge>
                      : null}
                    {getOptionServicesCount(item)
                      ? <Badge variant="outline">{tPage("servicesCount", { count: getOptionServicesCount(item) })}</Badge>
                      : null}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedLabPanel ? (
            <Card className="border-dashed border-emerald-200 bg-white/80">
              <CardHeader>
                <CardTitle className="text-base">{tPage("panelTests")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {selectedLabPanelDetailsQuery.isLoading ? (
                  <p className="text-muted-foreground">{tCommon("loading")}</p>
                  ) : (selectedLabPanelDetails?.tests || []).length ? (
                    (selectedLabPanelDetails?.tests || []).map((test) => (
                      <div key={test.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="font-medium">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tPage("unit")}: {test.unit || "-"} | {tPage("reference")}: {getDisplayReferenceRange(test) || "-"}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">{tPage("noLabTestsInPackage")}</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {selectedLabPackage ? (
            <Card className="border-dashed border-emerald-200 bg-white/80">
              <CardHeader>
                <CardTitle className="text-base">{tPage("packageContents")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">{tPage("labPanels")}</p>
                  {selectedLabPackageDetailsQuery.isLoading ? (
                    <p className="text-muted-foreground">{tCommon("loading")}</p>
                  ) : (selectedLabPackageDetails?.panels || []).length ? (
                    (selectedLabPackageDetails?.panels || []).map((panel) => (
                      <div key={panel.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{getLocalizedValue(panel, locale, "name")}</p>
                          <Badge variant="outline">{tPage("testsCount", { count: panel.tests?.length || panel.tests_count || 0 })}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">{tPage("noLabPanels")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="font-medium">{tPage("includedLabTests")}</p>
                  {selectedLabPackageDetailsQuery.isLoading ? (
                    <p className="text-muted-foreground">{tCommon("loading")}</p>
                  ) : deduplicatedPackageTests.length ? (
                    deduplicatedPackageTests.map((test) => (
                      <div key={test.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="font-medium">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tPage("unit")}: {test.unit || "-"} | {tPage("reference")}: {getDisplayReferenceRange(test) || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">{tPage("noLabTestsInPackage")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {selectedMedicalPackage ? (
            <Card className="border-dashed border-emerald-200 bg-white/80">
              <CardHeader>
                <CardTitle className="text-base">{tPage("packageContents")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {(selectedMedicalPackage.services || []).length ? (
                  <div className="space-y-2">
                    <p className="font-medium">{tPage("includedConsultations")}</p>
                    {(selectedMedicalPackage.services || []).map((service) => (
                      <div key={service.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{service.name}</p>
                          <Badge variant="outline">{translateEnumValue(service.service_kind || "MEDICAL", tEnums)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{service.category_name || "-"}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="font-medium">{tPage("includedLabTests")}</p>
                  {(selectedMedicalPackage.tests || []).length ? (
                    (selectedMedicalPackage.tests || []).map((test) => (
                      <div key={test.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="font-medium">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tPage("unit")}: {test.unit || "-"} | {tPage("reference")}: {getDisplayReferenceRange(test) || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">{tPage("noLabTestsInPackage")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Textarea rows={4} placeholder={tPage("notesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} />

          <Button className="min-h-12 bg-primary hover:bg-primary/90" onClick={handleOpenReview} disabled={mutation.isPending || activeCatalogLoading || !options.length}>
            {mutation.isPending ? tBooking("submitting") : tPage("reviewBeforeSubmit")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isReviewOpen} onOpenChange={handleReviewOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1rem)] overflow-hidden border-0 bg-[#f5fbf8] p-0 shadow-[0_40px_120px_-28px_rgba(13,68,64,0.38)] sm:max-w-3xl">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0d4440_0%,#15514c_52%,#234740_100%)] px-5 pb-6 pt-5 text-white sm:px-8 sm:pb-8 sm:pt-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#c69d2e]" />
            <div className="absolute inset-y-0 right-0 w-44 bg-white/5 blur-3xl" />
            <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#0d4440] shadow-lg shadow-black/10">
                    C
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-emerald-100/70">Curevie</p>
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-2xl font-semibold leading-tight text-white sm:text-[2rem]">
                      {tPage("reviewTitle")}
                    </DialogTitle>
                    <DialogDescription className="max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-[0.95rem]">
                      {tPage("reviewSubtitle")}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <div className="self-start rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-50/65">{tCommon("amount")}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{formattedPrice}</p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(92vh-10rem)] overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
            <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.6rem] border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
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
                        <p className="mt-2 text-sm font-medium text-slate-900">{patientPhone || tPage("notProvided")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-[#14514b]" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("addressLabel")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">{patientAddress || tPage("notProvided")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-[#14514b]">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#7a8f89]">{tPage("serviceCardTitle")}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedName || tPage("notProvided")}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("selectedServiceLabel")}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{selectedName || tPage("notProvided")}</p>
                    {selectedDescription ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDescription}</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("serviceTypeLabel")}</p>
                    <div className="mt-2">
                      <Badge className="rounded-full bg-[#14514b] px-3 py-1 text-white hover:bg-[#14514b]">
                        {translateEnumValue(serviceType, tEnums)}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <div className="flex items-start gap-3">
                      <Wallet className="mt-0.5 h-4 w-4 text-[#14514b]" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("priceLabel")}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{formattedPrice}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-dashed border-[#14514b]/30 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a8f89]">Have a coupon?</p>

                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value.toUpperCase());
                          setCouponResult(null);
                          setCouponError(null);
                        }}
                        placeholder="Enter discount code"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-wider focus:border-[#14514b] focus:outline-none disabled:opacity-50"
                        disabled={isValidatingCoupon || mutation.isPending}
                      />
                      <Button
                        type="button"
                        onClick={handleValidateCoupon}
                        disabled={!couponCode.trim() || isValidatingCoupon || mutation.isPending}
                        className="rounded-xl bg-[#14514b] px-4 py-2 text-sm text-white transition-colors hover:bg-[#103e3a] disabled:opacity-40"
                      >
                        {isValidatingCoupon ? "..." : "Verify"}
                      </Button>
                    </div>

                    {couponError ? (
                      <p className="mt-2 text-xs text-red-500">{couponError}</p>
                    ) : null}

                    {couponResult ? (
                      <div className="mt-3 space-y-1.5 rounded-xl bg-[#14514b]/5 p-3">
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Original price</span>
                          <span className="line-through">{Number(selectedPrice).toFixed(2)} JD</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-green-600">
                          <span>
                            {couponResult.discount_type === "PERCENTAGE"
                              ? `Discount (${couponResult.discount_value}%)`
                              : "Discount"}
                          </span>
                          <span>- {couponResult.discount_amount.toFixed(2)} JD</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-[#14514b]">
                          <span>Final amount</span>
                          <span>{couponResult.final_amount.toFixed(2)} JD</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-[#f3faf7] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#7a8f89]">{tPage("notesLabel")}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{notes.trim() || tPage("notProvided")}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-emerald-100 bg-white px-4 py-4 shadow-sm">
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

                <DialogFooter className="gap-3 sm:flex-row sm:items-center sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-full border-slate-200 bg-white px-5"
                    onClick={() => handleReviewOpenChange(false)}
                  >
                    {tPage("editRequest")}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 rounded-full bg-[#14514b] px-6 hover:bg-[#103e3a]"
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? tBooking("submitting") : tPage("confirmRequest")}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
