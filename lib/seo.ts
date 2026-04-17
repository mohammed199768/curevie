import type { Metadata } from "next";

export type SeoLocale = "en" | "ar";

export const DEFAULT_SITE_TITLE = "كيورفي | رعاية منزلية وتمريض ومختبر وأشعة في الأردن";
export const DEFAULT_SITE_DESCRIPTION =
  "كيورفي منصة للرعاية الطبية المنزلية في الأردن لطلب الطبيب المنزلي والتمريض المنزلي وخدمات المختبر والتحاليل والأشعة المنزلية في عمان ومختلف المناطق.";

export const BASE_SEO_KEYWORDS = [
  "كيورفي",
  "كيورفاي",
  "كيوريفاي",
  "curevie",
  "الرعاية المنزلية",
  "رعاية طبية منزلية",
  "خدمات طبية منزلية",
  "طبيب منزل",
  "زيارة طبيب منزلي",
  "خدمات طبية منزلية الأردن",
  "تمريض منزلي",
  "مختبر منزلي",
  "تحاليل منزلية",
  "تحاليل دم منزلية",
  "أشعة منزلية",
  "اشعة منزلية",
  "رعاية صحية الأردن",
  "عمان طبيب منزلي",
  "منصة طبية منزلية",
  "رعاية منزلية متكاملة",
  "طبيب أطفال منزل",
  "طبيب باطنية منزل",
  "home care jordan",
  "home healthcare jordan",
  "home doctor visit amman",
  "doctor at home jordan",
  "medical home services jordan",
  "home nursing jordan",
  "lab test at home jordan",
  "home lab jordan",
  "portable imaging jordan",
  "radiology at home jordan",
  "xray at home jordan",
  "curevie jordan",
  "كيورفي الأردن",
  "كيورفي عمان",
] as const;

export const ABOUT_PAGE_KEYWORDS = [
  ...BASE_SEO_KEYWORDS,
  "about curevie",
  "عن كيورفي",
  "curevie mission",
  "منصة الرعاية المنزلية في الأردن",
  "home healthcare platform jordan",
] as const;

export const CONTACT_PAGE_KEYWORDS = [
  ...BASE_SEO_KEYWORDS,
  "contact curevie",
  "اتصل بكيورفي",
  "curevie support jordan",
  "رقم كيورفي",
  "دعم كيورفي",
  "curevie contact",
] as const;

export const SERVICES_PAGE_KEYWORDS = [
  ...BASE_SEO_KEYWORDS,
  "home healthcare services jordan",
  "medical services at home jordan",
  "خدمات طبية في الأردن",
  "خدمات كيورفي",
] as const;

const DEFAULT_SITE_SEO: Record<SeoLocale, { title: string; description: string }> = {
  en: {
    title: "Curevie | Home Healthcare, Nursing, Lab & Imaging in Jordan",
    description:
      "Curevie provides home doctor visits, home nursing, lab diagnostics, imaging, and coordinated home healthcare services across Jordan.",
  },
  ar: {
    title: "كيورفي | رعاية منزلية وتمريض ومختبر وأشعة في الأردن",
    description:
      "كيورفي تقدم زيارات الطبيب المنزلية والتمريض والتحاليل والأشعة وبرامج الرعاية المنزلية المتكاملة في الأردن.",
  },
};

const SERVICE_PAGE_KEYWORDS: Record<string, readonly string[]> = {
  "medical-visits": [
    "doctor at home jordan",
    "طبيب منزلي الأردن",
    "pediatrician home visit jordan",
    "internal medicine home visit jordan",
    "كشف منزلي طبي",
  ],
  "home-nursing": [
    "home nursing jordan",
    "nursing at home jordan",
    "تمريض منزلي الأردن",
    "حقن منزلية",
    "تضميد جروح منزلي",
  ],
  "physical-therapy": [
    "physical therapy at home jordan",
    "physiotherapy at home jordan",
    "العلاج الطبيعي المنزلي",
    "تأهيل منزلي",
    "جلسات علاج طبيعي منزلية",
  ],
  "occupational-therapy": [
    "occupational therapy at home jordan",
    "العلاج الوظيفي المنزلي",
    "functional therapy jordan",
    "دعم الأنشطة اليومية",
    "rehabilitation at home jordan",
  ],
  imaging: [
    "portable radiology jordan",
    "radiology at home jordan",
    "أشعة منزلية الأردن",
    "تصوير منزلي",
    "xray at home amman",
  ],
  "lab-diagnostics": [
    "home lab jordan",
    "lab test at home jordan",
    "مختبر منزلي الأردن",
    "سحب عينات منزلي",
    "تحاليل في المنزل عمان",
  ],
  "care-programs": [
    "home care programs jordan",
    "رعاية منزلية متكاملة الأردن",
    "care packages jordan",
    "برامج رعاية منزلية",
    "coordinated home care jordan",
  ],
};

const SERVICE_PAGE_TITLES: Record<string, Record<SeoLocale, string>> = {
  "medical-visits": {
    en: "Home Doctor Visits in Jordan | Curevie",
    ar: "زيارات الطبيب المنزلية في الأردن | كيورفي",
  },
  "home-nursing": {
    en: "Home Nursing Services in Jordan | Curevie",
    ar: "خدمات التمريض المنزلي في الأردن | كيورفي",
  },
  "physical-therapy": {
    en: "Physical Therapy at Home in Jordan | Curevie",
    ar: "العلاج الطبيعي المنزلي في الأردن | كيورفي",
  },
  "occupational-therapy": {
    en: "Occupational Therapy at Home in Jordan | Curevie",
    ar: "العلاج الوظيفي المنزلي في الأردن | كيورفي",
  },
  imaging: {
    en: "Home Imaging and X-Ray Services in Jordan | Curevie",
    ar: "خدمات الأشعة المنزلية في الأردن | كيورفي",
  },
  "lab-diagnostics": {
    en: "Home Lab Tests and Diagnostics in Jordan | Curevie",
    ar: "خدمات المختبر والتحاليل المنزلية في الأردن | كيورفي",
  },
  "care-programs": {
    en: "Integrated Home Care Programs in Jordan | Curevie",
    ar: "برامج الرعاية المنزلية المتكاملة في الأردن | كيورفي",
  },
};

const SERVICE_PAGE_DESCRIPTIONS: Record<string, Record<SeoLocale, string>> = {
  "medical-visits": {
    en: "Book home doctor visits with Curevie for internal medicine, pediatric, and general medical support in Jordan.",
    ar: "احجز زيارات الطبيب المنزلية مع كيورفي لخدمات الباطنية والأطفال والمتابعة الطبية المنزلية في الأردن.",
  },
  "home-nursing": {
    en: "Explore Curevie home nursing services for injections, wound care, bedside follow-up, and nursing support in Jordan.",
    ar: "استعرض خدمات التمريض المنزلي من كيورفي للحقن وتضميد الجروح والمتابعة التمريضية والدعم السريري في الأردن.",
  },
  "physical-therapy": {
    en: "Discover Curevie physical therapy at home for rehabilitation, mobility recovery, and guided home sessions in Jordan.",
    ar: "اكتشف خدمات العلاج الطبيعي المنزلي من كيورفي للتأهيل واستعادة الحركة والجلسات العلاجية المنزلية في الأردن.",
  },
  "occupational-therapy": {
    en: "Browse Curevie occupational therapy at home to support daily function, independence, and recovery in Jordan.",
    ar: "تصفح خدمات العلاج الوظيفي المنزلي من كيورفي لدعم الاستقلالية والوظائف اليومية والتعافي في الأردن.",
  },
  imaging: {
    en: "Explore Curevie home imaging, radiology, and X-ray services in Jordan with coordinated booking for at-home diagnostics.",
    ar: "استعرض خدمات الأشعة والتصوير المنزلي من كيورفي في الأردن مع تنسيق كامل للحجز والمتابعة المنزلية.",
  },
  "lab-diagnostics": {
    en: "Browse Curevie home lab diagnostics, blood tests, sample collection, and test packages for patients across Jordan.",
    ar: "تصفح خدمات المختبر المنزلي وتحاليل الدم وسحب العينات وباقات التحاليل من كيورفي للمرضى في مختلف مناطق الأردن.",
  },
  "care-programs": {
    en: "Discover Curevie coordinated home care programs that combine medical, lab, and follow-up services in Jordan.",
    ar: "اكتشف برامج كيورفي للرعاية المنزلية المتكاملة التي تجمع بين الخدمات الطبية والتحاليل والمتابعة في الأردن.",
  },
};

type PublicPageMetadataInput = {
  locale: SeoLocale;
  pathname?: string;
  title: string;
  description: string;
  keywords?: readonly string[];
};

const DEFAULT_SITE_URL = "https://www.curevie.net";
const INDEXABLE_GOOGLEBOT = {
  index: true,
  follow: true,
  "max-image-preview": "large" as const,
  "max-snippet": -1,
  "max-video-preview": -1,
};

function normalizeSiteUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function normalizeSubPath(pathname: string = "") {
  if (!pathname || pathname === "/") {
    return "";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL,
);

export const INDEXABLE_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: INDEXABLE_GOOGLEBOT,
};

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

export function getDefaultSiteSeo(locale: SeoLocale) {
  return {
    ...DEFAULT_SITE_SEO[locale],
    keywords: [...BASE_SEO_KEYWORDS],
  };
}

export function getServicePageSeo(slug: string, locale: SeoLocale = "en") {
  return {
    title: SERVICE_PAGE_TITLES[slug]?.[locale] || getDefaultSiteSeo(locale).title,
    description: SERVICE_PAGE_DESCRIPTIONS[slug]?.[locale] || getDefaultSiteSeo(locale).description,
    keywords: [...BASE_SEO_KEYWORDS, ...(SERVICE_PAGE_KEYWORDS[slug] || [])],
  };
}

export function getServicesPageSeo(locale: SeoLocale = "en") {
  return {
    title:
      locale === "ar"
        ? "خدمات كيورفي الطبية المنزلية في الأردن | كيورفي"
        : "Curevie Home Healthcare Services in Jordan",
    description:
      locale === "ar"
        ? "تصفح خدمات كيورفي للرعاية المنزلية والتمريض والمختبر والأشعة وبرامج الرعاية الطبية المنزلية في الأردن."
        : "Browse Curevie home healthcare, home nursing, lab diagnostics, imaging, therapy, and coordinated care program pages in Jordan.",
    keywords: [...SERVICES_PAGE_KEYWORDS],
  };
}

export function buildAbsoluteUrl(pathname: string = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, `${SITE_URL}/`).toString();
}

export function buildLocalizedPath(locale: SeoLocale, pathname: string = "") {
  return `/${locale}${normalizeSubPath(pathname)}`;
}

export function buildLocaleAlternates(pathname: string = "") {
  const normalizedPath = normalizeSubPath(pathname);

  return {
    en: buildAbsoluteUrl(`/en${normalizedPath}`),
    ar: buildAbsoluteUrl(`/ar${normalizedPath}`),
    "x-default": buildAbsoluteUrl(`/en${normalizedPath}`),
  };
}

export function buildPublicPageMetadata({
  locale,
  pathname = "",
  title,
  description,
  keywords = [],
}: PublicPageMetadataInput): Metadata {
  const localizedPath = buildLocalizedPath(locale, pathname);
  const localizedUrl = buildAbsoluteUrl(localizedPath);
  const openGraphLocale = locale === "ar" ? "ar_JO" : "en_JO";
  const alternateLocale = locale === "ar" ? "en_JO" : "ar_JO";

  return {
    title,
    description,
    keywords: [...keywords],
    category: "healthcare",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: localizedUrl,
      languages: buildLocaleAlternates(pathname),
    },
    openGraph: {
      title,
      description,
      url: localizedUrl,
      siteName: "Curevie",
      locale: openGraphLocale,
      alternateLocale: [alternateLocale],
      type: "website",
      images: [
        {
          url: buildAbsoluteUrl("/3.png"),
          alt: "Curevie",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [buildAbsoluteUrl("/3.png")],
    },
    robots: INDEXABLE_ROBOTS,
  };
}
