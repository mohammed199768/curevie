import { labPackagesApi, labPanelsApi } from "@/lib/api/lab-panels";
import { servicesApi } from "@/lib/api/services";
import type { LabPackageItem, LabPanelItem, PackageItem, ServiceItem } from "@/lib/api/types";
import { normalizeListResponse, toNumber } from "@/lib/utils";

export const BRAND_COLORS = {
  primary: "#104d49",
  secondary: "#304a43",
  accent: "#86ab62",
  olive: "#5a7a50",
  stone: "#9c9fa2",
} as const;

export type AnalyticsServiceKind = "MEDICAL" | "RADIOLOGY" | "LAB" | "PACKAGE";

export type PublicServiceCategorySlug =
  | "medical-visits"
  | "home-nursing"
  | "physical-therapy"
  | "occupational-therapy"
  | "imaging"
  | "lab-diagnostics"
  | "care-programs";

export type PublicServiceCategoryTranslationKey =
  | "medicalVisits"
  | "nursingCare"
  | "homeNursing"
  | "physicalTherapy"
  | "occupationalTherapy"
  | "imaging"
  | "labDiagnostics"
  | "carePrograms";

export type RequestPreset = {
  serviceType: AnalyticsServiceKind;
  labMode?: "TEST" | "PANEL" | "PACKAGE";
  serviceId?: string;
};

export type PublicCatalogEntry =
  | {
      id: string;
      type: "service";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      serviceKind: "MEDICAL" | "RADIOLOGY";
    }
  | {
      id: string;
      type: "lab";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      unit: string | null;
      referenceRange: string | null;
    }
  | {
      id: string;
      type: "panel";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      testsCount: number;
      testsPreview: string[];
    }
  | {
      id: string;
      type: "package";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      packageScope: "LAB_ONLY" | "COMPREHENSIVE";
      testsCount: number;
      servicesCount: number;
      testsPreview: string[];
      servicesPreview: string[];
    };

export type PublicCategoryCatalog = {
  entries: PublicCatalogEntry[];
  total: number;
};

export type PublicCategoryCountMap = Record<PublicServiceCategoryTranslationKey, number>;

type PublicServiceCategoryRuntimeTranslationKey = Exclude<PublicServiceCategoryTranslationKey, "homeNursing">;

type PublicServiceCategoryDefinition = {
  slug: PublicServiceCategorySlug;
  translationKey: PublicServiceCategoryRuntimeTranslationKey;
  source: "services" | "services-by-category" | "lab" | "packages";
  serviceKind?: "MEDICAL" | "RADIOLOGY";
  categoryId?: string;
  defaultRequestPreset: RequestPreset;
  theme: {
    base: string;
    secondary: string;
    accent: string;
    soft: string;
    muted: string;
    shadow: string;
  };
};

export const PUBLIC_SERVICE_CATEGORIES: readonly PublicServiceCategoryDefinition[] = [
  {
    slug: "medical-visits",
    translationKey: "medicalVisits",
    source: "services",
    serviceKind: "MEDICAL",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: BRAND_COLORS.primary,
      secondary: BRAND_COLORS.secondary,
      accent: BRAND_COLORS.accent,
      soft: "rgba(16, 77, 73, 0.08)",
      muted: BRAND_COLORS.stone,
      shadow: "rgba(16, 77, 73, 0.24)",
    },
  },
  {
    slug: "home-nursing",
    translationKey: "nursingCare",
    source: "services-by-category",
    categoryId: "9bd587f7-2b6e-4885-b704-f3d53cd02414",
    serviceKind: "MEDICAL",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#0f7c6e",
      secondary: "#0a5c52",
      accent: "#14a899",
      soft: "rgba(15, 124, 110, 0.08)",
      muted: "#4a7a74",
      shadow: "rgba(15, 124, 110, 0.22)",
    },
  },
  {
    slug: "physical-therapy",
    translationKey: "physicalTherapy",
    source: "services-by-category",
    categoryId: "3a3ab6d1-6b90-42b3-80aa-a0ef754576df",
    serviceKind: "MEDICAL",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#1e6fa8",
      secondary: "#155a8a",
      accent: "#2d8fd4",
      soft: "rgba(30, 111, 168, 0.08)",
      muted: "#4a7a9b",
      shadow: "rgba(30, 111, 168, 0.22)",
    },
  },
  {
    slug: "occupational-therapy",
    translationKey: "occupationalTherapy",
    source: "services-by-category",
    categoryId: "53123e20-0e97-43b0-85e8-c8876e2b0dbc",
    serviceKind: "MEDICAL",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#6b4fa8",
      secondary: "#533d8a",
      accent: "#8b6fd4",
      soft: "rgba(107, 79, 168, 0.08)",
      muted: "#7a6a9b",
      shadow: "rgba(107, 79, 168, 0.22)",
    },
  },
  {
    slug: "imaging",
    translationKey: "imaging",
    source: "services",
    serviceKind: "RADIOLOGY",
    defaultRequestPreset: { serviceType: "RADIOLOGY" },
    theme: {
      base: BRAND_COLORS.secondary,
      secondary: BRAND_COLORS.primary,
      accent: BRAND_COLORS.stone,
      soft: "rgba(48, 74, 67, 0.08)",
      muted: BRAND_COLORS.stone,
      shadow: "rgba(48, 74, 67, 0.2)",
    },
  },
  {
    slug: "lab-diagnostics",
    translationKey: "labDiagnostics",
    source: "lab",
    defaultRequestPreset: { serviceType: "LAB", labMode: "PANEL" },
    theme: {
      base: BRAND_COLORS.olive,
      secondary: BRAND_COLORS.secondary,
      accent: BRAND_COLORS.accent,
      soft: "rgba(90, 122, 80, 0.08)",
      muted: BRAND_COLORS.stone,
      shadow: "rgba(90, 122, 80, 0.18)",
    },
  },
  {
    slug: "care-programs",
    translationKey: "carePrograms",
    source: "packages",
    defaultRequestPreset: { serviceType: "PACKAGE" },
    theme: {
      base: BRAND_COLORS.secondary,
      secondary: BRAND_COLORS.olive,
      accent: BRAND_COLORS.accent,
      soft: "rgba(156, 159, 162, 0.08)",
      muted: BRAND_COLORS.stone,
      shadow: "rgba(48, 74, 67, 0.18)",
    },
  },
] as const;

function sortEntries(entries: PublicCatalogEntry[]) {
  return [...entries].sort((left, right) => {
    const priceDelta = (left.price ?? Number.MAX_SAFE_INTEGER) - (right.price ?? Number.MAX_SAFE_INTEGER);
    if (priceDelta !== 0) return priceDelta;
    return left.name.localeCompare(right.name);
  });
}

function normalizeTotal(total: number | undefined, fallbackLength: number) {
  return Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : fallbackLength;
}

function mapServiceEntry(item: ServiceItem, serviceKind: "MEDICAL" | "RADIOLOGY"): PublicCatalogEntry {
  return {
    id: item.id,
    type: "service",
    name: item.name,
    description: item.description || null,
    categoryName: item.category_name || null,
    price: item.price != null ? toNumber(item.price, 0) : null,
    serviceKind,
  };
}

function getLocalizedLabName<T extends {
  name_en?: string;
  name_ar?: string;
}>(item: T, locale: string) {
  return locale === "ar"
    ? item.name_ar || item.name_en || ""
    : item.name_en || item.name_ar || "";
}

function getLocalizedLabDescription<T extends {
  description_en?: string | null;
  description_ar?: string | null;
}>(item: T, locale: string) {
  return locale === "ar"
    ? item.description_ar || item.description_en || null
    : item.description_en || item.description_ar || null;
}

function mapPackageEntry(item: PackageItem, packageScope: "LAB_ONLY" | "COMPREHENSIVE"): PublicCatalogEntry {
  return {
    id: item.id,
    type: "package",
    name: item.name,
    description: item.description || null,
    categoryName: item.category_name || null,
    price: item.total_cost != null ? toNumber(item.total_cost, 0) : null,
    packageScope,
    testsCount: item.tests?.length || item.test_ids?.length || 0,
    servicesCount: item.services?.length || item.service_ids?.length || 0,
    testsPreview: (item.tests || []).map((test) => test.name).slice(0, 3),
    servicesPreview: (item.services || []).map((service) => service.name).slice(0, 3),
  };
}

function mapLabPanelEntry(item: LabPanelItem, locale: string): PublicCatalogEntry {
  return {
    id: item.id,
    type: "panel",
    name: getLocalizedLabName(item, locale),
    description: getLocalizedLabDescription(item, locale),
    categoryName: null,
    price: item.price != null ? toNumber(item.price, 0) : null,
    testsCount: item.tests?.length || item.test_ids?.length || item.tests_count || 0,
    testsPreview: (item.tests || []).map((test) => test.name).slice(0, 3),
  };
}

function mapLabPackageEntry(item: LabPackageItem, locale: string): PublicCatalogEntry {
  return {
    id: item.id,
    type: "package",
    name: getLocalizedLabName(item, locale),
    description: getLocalizedLabDescription(item, locale),
    categoryName: null,
    price: item.price != null ? toNumber(item.price, 0) : null,
    packageScope: "LAB_ONLY",
    testsCount: item.tests?.length || item.test_ids?.length || item.tests_count || 0,
    servicesCount: item.panels?.length || item.panel_ids?.length || item.panels_count || 0,
    testsPreview: (item.tests || []).map((test) => test.name).slice(0, 3),
    servicesPreview: (item.panels || [])
      .map((panel) => getLocalizedLabName(panel, locale))
      .slice(0, 3),
  };
}

export function getPublicServiceCategory(slug: string) {
  return PUBLIC_SERVICE_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getPublicServiceCategoryAnalyticsKind(slug: string): AnalyticsServiceKind | null {
  const category = getPublicServiceCategory(slug);
  if (!category) {
    return null;
  }

  if (category.serviceKind) {
    return category.serviceKind;
  }

  return category.source === "lab" ? "LAB" : "PACKAGE";
}

export function getPublicServiceCategoryByKey(translationKey: PublicServiceCategoryTranslationKey) {
  return PUBLIC_SERVICE_CATEGORIES.find((category) => category.translationKey === translationKey) || null;
}

export function buildNewRequestHref(locale: string, preset: RequestPreset) {
  const params = new URLSearchParams({ serviceType: preset.serviceType });

  if (preset.labMode) {
    params.set("labMode", preset.labMode);
  }

  if (preset.serviceId) {
    params.set("serviceId", preset.serviceId);
  }

  return `/${locale}/requests/new?${params.toString()}`;
}

export function buildAuthRedirectHref(
  locale: string,
  preset: RequestPreset,
  authPath: "login" | "register" = "login",
) {
  const requestHref = buildNewRequestHref(locale, preset);
  return `/${locale}/${authPath}?redirect=${encodeURIComponent(requestHref)}`;
}

export function getEntryRequestPreset(entry: PublicCatalogEntry): RequestPreset {
  if (entry.type === "service") {
    return {
      serviceType: entry.serviceKind,
      serviceId: entry.id,
    };
  }

  if (entry.type === "lab") {
    return {
      serviceType: "LAB",
      labMode: "TEST",
      serviceId: entry.id,
    };
  }

  if (entry.type === "panel") {
    return {
      serviceType: "LAB",
      labMode: "PANEL",
      serviceId: entry.id,
    };
  }

  if (entry.packageScope === "LAB_ONLY") {
    return {
      serviceType: "LAB",
      labMode: "PACKAGE",
      serviceId: entry.id,
    };
  }

  return { serviceType: "PACKAGE", serviceId: entry.id };
}

export function getPublicCatalogEntryAnalyticsKind(entry: PublicCatalogEntry): AnalyticsServiceKind {
  if (entry.type === "service") {
    return entry.serviceKind;
  }

  if (entry.type === "lab" || entry.type === "panel") {
    return "LAB";
  }

  return entry.packageScope === "LAB_ONLY" ? "LAB" : "PACKAGE";
}

export async function fetchPublicServiceCategoryCatalog(slug: PublicServiceCategorySlug, locale: string = "en"): Promise<PublicCategoryCatalog> {
  const category = getPublicServiceCategory(slug);

  if (!category) {
    throw new Error(`Unknown category slug: ${slug}`);
  }

  if (category.source === "services") {
    const response = normalizeListResponse(
      (await servicesApi.listPublic({ limit: 100, service_kind: category.serviceKind })).data,
    );

    const entries = sortEntries(response.data.map((item) => mapServiceEntry(item, category.serviceKind!)));
    return {
      entries,
      total: normalizeTotal(response.pagination.total, entries.length),
    };
  }

  if (category.source === "services-by-category") {
    const response = normalizeListResponse(
      (await servicesApi.listPublic({
        limit: 100,
        category_id: category.categoryId,
      })).data,
    );
    const entries = sortEntries(
      response.data.map((item) => mapServiceEntry(item, "MEDICAL")),
    );
    return {
      entries,
      total: normalizeTotal(response.pagination.total, entries.length),
    };
  }

  if (category.source === "lab") {
    const [labPanelsResponse, labPackagesResponse] = await Promise.all([
      labPanelsApi.listPublic({ limit: 100, is_active: true }),
      labPackagesApi.listPublic({ limit: 100, is_active: true }),
    ]);
    const labPanels = normalizeListResponse(labPanelsResponse.data);
    const labPackages = normalizeListResponse(labPackagesResponse.data);
    const panelEntries = labPanels.data.map((item) => mapLabPanelEntry(item, locale));
    const packageEntries = labPackages.data.map((item) => mapLabPackageEntry(item, locale));
    const entries = sortEntries([...panelEntries, ...packageEntries]);

    return {
      entries,
      total:
        normalizeTotal(labPanels.pagination.total, panelEntries.length)
        + normalizeTotal(labPackages.pagination.total, packageEntries.length),
    };
  }

  const packageResponse = normalizeListResponse((await servicesApi.listPackagesPublic({ limit: 100 })).data);
  const entries = sortEntries(packageResponse.data.map((item) => mapPackageEntry(item, "COMPREHENSIVE")));

  return {
    entries,
    total: normalizeTotal(packageResponse.pagination.total, entries.length),
  };
}

export async function fetchPublicServiceCounts(): Promise<PublicCategoryCountMap> {
  const [
    medicalResponse,
    nursingResponse,
    physicalTherapyResponse,
    occupationalTherapyResponse,
    imagingResponse,
    labPanelsResponse,
    labPackagesResponse,
    packageResponse,
  ] =
    await Promise.all([
      servicesApi.listPublic({ limit: 1, service_kind: "MEDICAL" }),
      servicesApi.listPublic({ limit: 1, category_id: "9bd587f7-2b6e-4885-b704-f3d53cd02414" }),
      servicesApi.listPublic({ limit: 1, category_id: "3a3ab6d1-6b90-42b3-80aa-a0ef754576df" }),
      servicesApi.listPublic({ limit: 1, category_id: "53123e20-0e97-43b0-85e8-c8876e2b0dbc" }),
      servicesApi.listPublic({ limit: 1, service_kind: "RADIOLOGY" }),
      labPanelsApi.listPublic({ limit: 1, is_active: true }),
      labPackagesApi.listPublic({ limit: 1, is_active: true }),
      servicesApi.listPackagesPublic({ limit: 1 }),
    ]);

  const medical = normalizeListResponse(medicalResponse.data);
  const nursing = normalizeListResponse(nursingResponse.data);
  const physicalTherapy = normalizeListResponse(physicalTherapyResponse.data);
  const occupationalTherapy = normalizeListResponse(occupationalTherapyResponse.data);
  const imaging = normalizeListResponse(imagingResponse.data);
  const labPanels = normalizeListResponse(labPanelsResponse.data);
  const labPackages = normalizeListResponse(labPackagesResponse.data);
  const packages = normalizeListResponse(packageResponse.data);

  return {
    medicalVisits: normalizeTotal(medical.pagination.total, medical.data.length),
    nursingCare: normalizeTotal(nursing.pagination.total, nursing.data.length),
    homeNursing: normalizeTotal(nursing.pagination.total, nursing.data.length),
    physicalTherapy: normalizeTotal(physicalTherapy.pagination.total, physicalTherapy.data.length),
    occupationalTherapy: normalizeTotal(occupationalTherapy.pagination.total, occupationalTherapy.data.length),
    imaging: normalizeTotal(imaging.pagination.total, imaging.data.length),
    labDiagnostics:
      normalizeTotal(labPanels.pagination.total, labPanels.data.length)
      + normalizeTotal(labPackages.pagination.total, labPackages.data.length),
    carePrograms: normalizeTotal(packages.pagination.total, packages.data.length),
  };
}
