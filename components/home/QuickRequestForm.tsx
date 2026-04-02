"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Boxes, FlaskConical, Loader2, ScanLine, Stethoscope } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { labPackagesApi, labPanelsApi } from "@/lib/api/lab-panels";
import { requestsApi } from "@/lib/api/requests";
import { servicesApi } from "@/lib/api/services";
import { translateEnumValue } from "@/lib/i18n";
import { normalizeListResponse } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const phonePattern = /^[0-9+\-\s()]{7,20}$/;

type TranslateFn = (key: string, values?: Record<string, any>) => string;
type LabMode = "TEST" | "PANEL" | "PACKAGE";

function createSchema(t: TranslateFn) {
  return z.object({
    full_name: z.string().trim().min(2, t("fullNameMin")),
    phone: z.string().trim().regex(phonePattern, t("invalidPhone")),
    address: z.string().trim().min(5, t("addressMin")),
    service_type: z.enum(["MEDICAL", "RADIOLOGY", "LAB", "PACKAGE"]),
    service_id: z.string().optional(),
    lab_test_id: z.string().optional(),
    lab_panel_id: z.string().optional(),
    lab_package_id: z.string().optional(),
    package_id: z.string().optional(),
    notes: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

function getLocalizedValue<T extends { name?: string; name_en?: string; name_ar?: string; description?: string | null; description_en?: string | null; description_ar?: string | null }>(
  item: T,
  locale: string,
  field: "name" | "description",
) {
  if (field === "name") {
    return locale === "ar"
      ? item.name_ar || item.name_en || item.name || ""
      : item.name_en || item.name_ar || item.name || "";
  }

  return locale === "ar"
    ? item.description_ar || item.description_en || item.description || null
    : item.description_en || item.description_ar || item.description || null;
}

function resetSelectionFields(form: ReturnType<typeof useForm<FormValues>>) {
  form.setValue("service_id", "");
  form.setValue("lab_test_id", "");
  form.setValue("lab_panel_id", "");
  form.setValue("lab_package_id", "");
  form.setValue("package_id", "");
}

export function QuickRequestForm() {
  const locale = useLocale();
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const tNewRequest = useTranslations("newRequestPage");
  const tEnums = useTranslations("enums");
  const schema = createSchema(t);
  const [labMode, setLabMode] = useState<LabMode>("TEST");
  const [search, setSearch] = useState("");
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      address: "",
      service_type: "MEDICAL",
      notes: "",
    },
  });

  const serviceType = form.watch("service_type");

  const servicesQuery = useQuery({
    queryKey: ["guest-services", serviceType],
    queryFn: async () => {
      const response = await servicesApi.listPublic({
        limit: 100,
        service_kind: serviceType === "RADIOLOGY" ? "RADIOLOGY" : "MEDICAL",
      });
      return normalizeListResponse(response.data).data;
    },
    enabled: serviceType === "MEDICAL" || serviceType === "RADIOLOGY",
  });

  const labTestsQuery = useQuery({
    queryKey: ["guest-lab-tests", search],
    queryFn: async () => {
      const response = await servicesApi.listLabPublic({ limit: 100, search, is_active: true });
      return normalizeListResponse(response.data).data;
    },
    enabled: serviceType === "LAB" && labMode === "TEST",
  });

  const labPanelsQuery = useQuery({
    queryKey: ["lab-panels", "list", search],
    queryFn: async () => {
      const response = await labPanelsApi.list({ limit: 100, search, is_active: true });
      return normalizeListResponse(response.data).data;
    },
    enabled: serviceType === "LAB" && labMode === "PANEL",
  });

  const labPackagesQuery = useQuery({
    queryKey: ["lab-packages", "list", search],
    queryFn: async () => {
      const response = await labPackagesApi.list({ limit: 100, search, is_active: true });
      return normalizeListResponse(response.data).data;
    },
    enabled: serviceType === "LAB" && labMode === "PACKAGE",
  });

  const medicalPackagesQuery = useQuery({
    queryKey: ["guest-medical-packages", search],
    queryFn: async () => {
      const response = await servicesApi.listPackagesPublic({ limit: 100, search });
      return normalizeListResponse(response.data).data;
    },
    enabled: serviceType === "PACKAGE",
  });

  const options = useMemo(() => {
    if (serviceType === "LAB" && labMode === "TEST") return labTestsQuery.data || [];
    if (serviceType === "LAB" && labMode === "PANEL") return labPanelsQuery.data || [];
    if (serviceType === "LAB" && labMode === "PACKAGE") return labPackagesQuery.data || [];
    if (serviceType === "PACKAGE") return medicalPackagesQuery.data || [];
    return servicesQuery.data || [];
  }, [
    labMode,
    labPackagesQuery.data,
    labPanelsQuery.data,
    labTestsQuery.data,
    medicalPackagesQuery.data,
    serviceType,
    servicesQuery.data,
  ]);

  const selectedMedicalPackage =
    serviceType === "PACKAGE"
      ? (options.find((option: any) => option.id === form.watch("package_id")) as any)
      : null;
  const selectedLabPackageId =
    serviceType === "LAB" && labMode === "PACKAGE"
      ? form.watch("lab_package_id") || null
      : null;
  const selectedLabPanelId =
    serviceType === "LAB" && labMode === "PANEL"
      ? form.watch("lab_panel_id") || null
      : null;
  const selectedLabPackage =
    serviceType === "LAB" && labMode === "PACKAGE"
      ? (options.find((option: any) => option.id === selectedLabPackageId) as any)
      : null;
  const selectedLabPanel =
    serviceType === "LAB" && labMode === "PANEL"
      ? (options.find((option: any) => option.id === selectedLabPanelId) as any)
      : null;

  const selectedLabPanelDetailsQuery = useQuery({
    queryKey: ["lab-panels", "details", selectedLabPanelId],
    queryFn: async () => (await labPanelsApi.getById(selectedLabPanelId!)).data,
    enabled: Boolean(selectedLabPanelId),
  });

  const selectedLabPackageDetailsQuery = useQuery({
    queryKey: ["lab-packages", "details", selectedLabPackageId],
    queryFn: async () => (await labPackagesApi.getById(selectedLabPackageId!)).data,
    enabled: Boolean(selectedLabPackageId),
  });

  const selectedLabPanelDetails = selectedLabPanelDetailsQuery.data || selectedLabPanel;
  const selectedLabPackageDetails = selectedLabPackageDetailsQuery.data || selectedLabPackage;

  useEffect(() => {
    if (
      servicesQuery.error
      || labTestsQuery.error
      || labPanelsQuery.error
      || labPackagesQuery.error
      || selectedLabPanelDetailsQuery.error
      || selectedLabPackageDetailsQuery.error
      || medicalPackagesQuery.error
    ) {
      toast.error(tCommon("error"));
    }
  }, [
    labPackagesQuery.error,
    labPanelsQuery.error,
    labTestsQuery.error,
    medicalPackagesQuery.error,
    selectedLabPackageDetailsQuery.error,
    selectedLabPanelDetailsQuery.error,
    servicesQuery.error,
    tCommon,
  ]);

  useEffect(() => {
    if (!options.length) return;

    const current =
      serviceType === "MEDICAL" || serviceType === "RADIOLOGY"
        ? form.getValues("service_id")
        : serviceType === "LAB" && labMode === "TEST"
          ? form.getValues("lab_test_id")
          : serviceType === "LAB" && labMode === "PANEL"
            ? form.getValues("lab_panel_id")
            : serviceType === "LAB" && labMode === "PACKAGE"
              ? form.getValues("lab_package_id")
              : form.getValues("package_id");

    const exists = current ? options.some((item: any) => item.id === current) : false;
    if (exists) return;

    const firstId = options[0]?.id;
    if (!firstId) return;

    if (serviceType === "MEDICAL" || serviceType === "RADIOLOGY") {
      form.setValue("service_id", firstId);
    } else if (serviceType === "LAB" && labMode === "TEST") {
      form.setValue("lab_test_id", firstId);
    } else if (serviceType === "LAB" && labMode === "PANEL") {
      form.setValue("lab_panel_id", firstId);
    } else if (serviceType === "LAB" && labMode === "PACKAGE") {
      form.setValue("lab_package_id", firstId);
    } else {
      form.setValue("package_id", firstId);
    }
  }, [form, labMode, options, serviceType]);

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Parameters<typeof requestsApi.createPublic>[0] = {
        request_type: "GUEST",
        guest_name: values.full_name,
        guest_phone: values.phone,
        guest_address: values.address,
        service_type: values.service_type,
        notes: values.notes,
      };

      if (values.service_type === "MEDICAL" || values.service_type === "RADIOLOGY") {
        payload.service_id = values.service_id;
      }

      if (values.service_type === "LAB") {
        payload.service_type = "LAB";
        if (labMode === "TEST") {
          payload.lab_test_id = values.lab_test_id;
        } else if (labMode === "PANEL") {
          payload.lab_panel_id = values.lab_panel_id;
        } else {
          payload.lab_package_id = values.lab_package_id;
        }
      }

      if (values.service_type === "PACKAGE") {
        payload.service_type = "PACKAGE";
        payload.package_id = values.package_id;
      }

      const response = await requestsApi.createPublic(payload);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessRequestId(data.request.id);
      form.reset();
      setLabMode("TEST");
      setSearch("");
    },
    onError: (_error: Error) => {
      const _axiosError = _error as AxiosError<{ message?: string }>;
      void _axiosError;
      toast.error(tCommon("error"));
    },
  });

  const submit = (values: FormValues) => {
    const fallbackId = options[0]?.id || "";
    const normalizedValues = { ...values };

    if (serviceType === "MEDICAL" || serviceType === "RADIOLOGY") {
      const id = values.service_id || form.getValues("service_id") || fallbackId;
      normalizedValues.service_id = id;
      if (id) form.setValue("service_id", id);
    } else if (serviceType === "LAB" && labMode === "TEST") {
      const id = values.lab_test_id || form.getValues("lab_test_id") || fallbackId;
      normalizedValues.lab_test_id = id;
      if (id) form.setValue("lab_test_id", id);
    } else if (serviceType === "LAB" && labMode === "PANEL") {
      const id = values.lab_panel_id || form.getValues("lab_panel_id") || fallbackId;
      normalizedValues.lab_panel_id = id;
      if (id) form.setValue("lab_panel_id", id);
    } else if (serviceType === "LAB" && labMode === "PACKAGE") {
      const id = values.lab_package_id || form.getValues("lab_package_id") || fallbackId;
      normalizedValues.lab_package_id = id;
      if (id) form.setValue("lab_package_id", id);
    } else if (serviceType === "PACKAGE") {
      const id = values.package_id || form.getValues("package_id") || fallbackId;
      normalizedValues.package_id = id;
      if (id) form.setValue("package_id", id);
    }

    if ((serviceType === "MEDICAL" || serviceType === "RADIOLOGY") && !normalizedValues.service_id) {
      toast.error(t("selectService"));
      return;
    }
    if (serviceType === "LAB" && labMode === "TEST" && !normalizedValues.lab_test_id) {
      toast.error(t("selectService"));
      return;
    }
    if (serviceType === "LAB" && labMode === "PANEL" && !normalizedValues.lab_panel_id) {
      toast.error(t("selectService"));
      return;
    }
    if (serviceType === "LAB" && labMode === "PACKAGE" && !normalizedValues.lab_package_id) {
      toast.error(t("selectService"));
      return;
    }
    if (serviceType === "PACKAGE" && !normalizedValues.package_id) {
      toast.error(t("selectService"));
      return;
    }

    createMutation.mutate(normalizedValues);
  };

  const activeLoading = servicesQuery.isLoading
    || labTestsQuery.isLoading
    || labPanelsQuery.isLoading
    || labPackagesQuery.isLoading
    || medicalPackagesQuery.isLoading;

  return (
    <section id="guest-request" className="mx-auto max-w-7xl px-4 py-16">
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
              </div>

              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceType")}</FormLabel>
                    <FormControl>
                      <div className="grid gap-3 md:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange("MEDICAL");
                            resetSelectionFields(form);
                          }}
                          className={`rounded-2xl border p-4 text-left ${field.value === "MEDICAL" ? "border-primary bg-primary/5" : ""}`}
                        >
                          <Stethoscope className="mb-2 h-5 w-5 text-primary" />
                          <p className="font-semibold">{tNewRequest("medical")}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange("RADIOLOGY");
                            resetSelectionFields(form);
                          }}
                          className={`rounded-2xl border p-4 text-left ${field.value === "RADIOLOGY" ? "border-primary bg-primary/5" : ""}`}
                        >
                          <ScanLine className="mb-2 h-5 w-5 text-primary" />
                          <p className="font-semibold">{tNewRequest("radiology")}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange("LAB");
                            setLabMode("TEST");
                            resetSelectionFields(form);
                          }}
                          className={`rounded-2xl border p-4 text-left ${field.value === "LAB" ? "border-primary bg-primary/5" : ""}`}
                        >
                          <FlaskConical className="mb-2 h-5 w-5 text-primary" />
                          <p className="font-semibold">{tNewRequest("lab")}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange("PACKAGE");
                            resetSelectionFields(form);
                          }}
                          className={`rounded-2xl border p-4 text-left ${field.value === "PACKAGE" ? "border-primary bg-primary/5" : ""}`}
                        >
                          <Boxes className="mb-2 h-5 w-5 text-primary" />
                          <p className="font-semibold">{tNewRequest("comprehensivePackages")}</p>
                        </button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {serviceType === "LAB" || serviceType === "PACKAGE" ? (
                <div className="flex flex-wrap gap-2">
                  {serviceType === "LAB" ? (
                    <>
                      <Button type="button" variant={labMode === "TEST" ? "default" : "outline"} onClick={() => { setLabMode("TEST"); resetSelectionFields(form); }}>
                        {tNewRequest("individualTest")}
                      </Button>
                      <Button type="button" variant={labMode === "PANEL" ? "default" : "outline"} onClick={() => { setLabMode("PANEL"); resetSelectionFields(form); }}>
                        {tNewRequest("testPanel")}
                      </Button>
                      <Button type="button" variant={labMode === "PACKAGE" ? "default" : "outline"} onClick={() => { setLabMode("PACKAGE"); resetSelectionFields(form); }}>
                        {tNewRequest("labPackage")}
                      </Button>
                    </>
                  ) : null}
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={tCommon("search")}
                    className="max-w-[280px]"
                  />
                </div>
              ) : null}

              {activeLoading ? (
                <AppPreloader variant="panel" title={tCommon("loading")} blockCount={2} blockVariant="line" />
              ) : !options.length ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  {serviceType === "PACKAGE"
                    ? tNewRequest("noComprehensivePackages")
                    : serviceType === "LAB" && labMode === "PACKAGE"
                      ? tNewRequest("noLabPackages")
                      : serviceType === "LAB" && labMode === "PANEL"
                        ? tNewRequest("noLabPanels")
                        : tNewRequest("noServices")}
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {options.map((option: any) => {
                    const selected =
                      (serviceType === "MEDICAL" || serviceType === "RADIOLOGY")
                        ? form.watch("service_id") === option.id
                        : serviceType === "LAB" && labMode === "TEST"
                          ? form.watch("lab_test_id") === option.id
                          : serviceType === "LAB" && labMode === "PANEL"
                            ? form.watch("lab_panel_id") === option.id
                            : serviceType === "LAB" && labMode === "PACKAGE"
                              ? form.watch("lab_package_id") === option.id
                              : form.watch("package_id") === option.id;
                    const optionName = getLocalizedValue(option, locale, "name");
                    const optionDescription = getLocalizedValue(option, locale, "description");

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-xl border p-3 text-left ${selected ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => {
                          if (serviceType === "MEDICAL" || serviceType === "RADIOLOGY") {
                            form.setValue("service_id", option.id);
                          } else if (serviceType === "LAB" && labMode === "TEST") {
                            form.setValue("lab_test_id", option.id);
                          } else if (serviceType === "LAB" && labMode === "PANEL") {
                            form.setValue("lab_panel_id", option.id);
                          } else if (serviceType === "LAB" && labMode === "PACKAGE") {
                            form.setValue("lab_package_id", option.id);
                          } else {
                            form.setValue("package_id", option.id);
                          }
                        }}
                      >
                        <p className="text-sm font-semibold">{optionName}</p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{optionDescription || "-"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {option.price ? <Badge variant="secondary">{option.price} JD</Badge> : null}
                          {option.cost ? <Badge variant="secondary">{option.cost} JD</Badge> : null}
                          {option.total_cost ? <Badge variant="secondary">{option.total_cost} JD</Badge> : null}
                          {(option.tests?.length || option.test_ids?.length || option.tests_count)
                            ? <Badge variant="outline">{tNewRequest("testsCount", { count: option.tests?.length || option.test_ids?.length || option.tests_count })}</Badge>
                            : null}
                          {(option.panels?.length || option.panel_ids?.length || option.panels_count)
                            ? <Badge variant="outline">{tNewRequest("panelsCount", { count: option.panels?.length || option.panel_ids?.length || option.panels_count })}</Badge>
                            : null}
                          {(option.services?.length || option.service_ids?.length)
                            ? <Badge variant="outline">{tNewRequest("servicesCount", { count: option.services?.length || option.service_ids?.length })}</Badge>
                            : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedLabPanel ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">{tNewRequest("panelTests")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedLabPanelDetailsQuery.isLoading ? (
                      <p className="text-muted-foreground">{tCommon("loading")}</p>
                    ) : (selectedLabPanelDetails?.tests || []).length ? (
                      (selectedLabPanelDetails?.tests || []).map((test: any) => (
                        <div key={test.id} className="rounded-lg border p-3">
                          <p className="font-medium">{test.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tNewRequest("unit")}: {test.unit || "-"} | {tNewRequest("reference")}: {test.reference_range || "-"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">{tNewRequest("noLabTestsInPackage")}</p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {selectedLabPackage ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">{tNewRequest("packageContents")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium">{tNewRequest("labPanels")}</p>
                      {selectedLabPackageDetailsQuery.isLoading ? (
                        <p className="text-muted-foreground">{tCommon("loading")}</p>
                      ) : (selectedLabPackageDetails?.panels || []).length ? (
                        (selectedLabPackageDetails?.panels || []).map((panel: any) => (
                          <div key={panel.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{getLocalizedValue(panel, locale, "name")}</p>
                              <Badge variant="outline">{tNewRequest("testsCount", { count: panel.tests?.length || panel.tests_count || 0 })}</Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">{tNewRequest("noLabPanels")}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium">{tNewRequest("includedLabTests")}</p>
                      {selectedLabPackageDetailsQuery.isLoading ? (
                        <p className="text-muted-foreground">{tCommon("loading")}</p>
                      ) : (selectedLabPackageDetails?.tests || []).length ? (
                        (selectedLabPackageDetails?.tests || []).map((test: any) => (
                          <div key={test.id} className="rounded-lg border p-3">
                            <p className="font-medium">{test.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tNewRequest("unit")}: {test.unit || "-"} | {tNewRequest("reference")}: {test.reference_range || "-"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">{tNewRequest("noLabTestsInPackage")}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {selectedMedicalPackage ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">{tNewRequest("packageContents")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {(selectedMedicalPackage.services || []).length ? (
                      <div className="space-y-2">
                        <p className="font-medium">{tNewRequest("includedConsultations")}</p>
                        {(selectedMedicalPackage.services || []).map((service: any) => (
                          <div key={service.id} className="rounded-lg border p-3">
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
                      <p className="font-medium">{tNewRequest("includedLabTests")}</p>
                      {(selectedMedicalPackage.tests || []).length ? (
                        (selectedMedicalPackage.tests || []).map((test: any) => (
                          <div key={test.id} className="rounded-lg border p-3">
                            <p className="font-medium">{test.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tNewRequest("unit")}: {test.unit || "-"} | {tNewRequest("reference")}: {test.reference_range || "-"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">{tNewRequest("noLabTestsInPackage")}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="rounded-full bg-primary px-8 hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {createMutation.isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={Boolean(successRequestId)} onOpenChange={() => setSuccessRequestId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("successTitle")}</DialogTitle>
            <DialogDescription>{t("successMessage", { id: successRequestId || "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSuccessRequestId(null)}>{t("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
