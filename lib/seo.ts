export const DEFAULT_SITE_TITLE = "كيورفي | Curevie Home Healthcare in Jordan";
export const DEFAULT_SITE_DESCRIPTION =
  "كيورفي منصة رعاية طبية منزلية في الأردن لزيارة الطبيب المنزلي والتمريض والمختبر والأشعة المنزلية في عمان ومختلف المناطق.";

export const BASE_SEO_KEYWORDS = [
  "كيورفي",
  "curevie",
  "رعاية طبية منزلية",
  "طبيب منزل",
  "زيارة طبيب منزلي",
  "خدمات طبية منزلية الأردن",
  "تمريض منزلي",
  "مختبر منزلي",
  "أشعة منزلية",
  "رعاية صحية الأردن",
  "عمان طبيب منزلي",
  "خدمات صحية منزلية",
  "تطبيق طبي الأردن",
  "حقن منزلية",
  "قياس ضغط منزلي",
  "تحاليل منزلية",
  "home healthcare jordan",
  "home doctor visit amman",
  "medical home services jordan",
  "home nursing jordan",
  "curevie jordan",
  "كيورفي الأردن",
  "كيورفي عمان",
  "منصة طبية منزلية",
  "رعاية منزلية متكاملة",
  "طبيب أطفال منزل",
  "طبيب باطنية منزل",
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

const SERVICE_PAGE_KEYWORDS: Record<string, readonly string[]> = {
  "medical-visits": [
    "doctor at home jordan",
    "طبيب منزل الأردن",
    "pediatrician home visit jordan",
    "internal medicine home visit jordan",
    "كشف منزلي طبي",
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

const SERVICE_PAGE_TITLES: Record<string, string> = {
  "medical-visits": "Home Doctor Visits in Jordan | كيورفي",
  imaging: "Home Imaging Services in Jordan | كيورفي",
  "lab-diagnostics": "Home Lab Diagnostics in Jordan | كيورفي",
  "care-programs": "Integrated Home Care Programs in Jordan | كيورفي",
};

const SERVICE_PAGE_DESCRIPTIONS: Record<string, string> = {
  "medical-visits":
    "Book home doctor visits with Curevie for internal medicine, pediatric, and general medical support in Jordan.",
  imaging:
    "Explore Curevie home imaging and radiology services in Jordan with coordinated booking for at-home diagnostics.",
  "lab-diagnostics":
    "Browse Curevie home lab diagnostics, sample collection, and test packages for patients across Jordan.",
  "care-programs":
    "Discover Curevie coordinated home care programs that combine medical, lab, and follow-up services in Jordan.",
};

export function getServicePageSeo(slug: string) {
  return {
    title: SERVICE_PAGE_TITLES[slug] || DEFAULT_SITE_TITLE,
    description: SERVICE_PAGE_DESCRIPTIONS[slug] || DEFAULT_SITE_DESCRIPTION,
    keywords: [...BASE_SEO_KEYWORDS, ...(SERVICE_PAGE_KEYWORDS[slug] || [])],
  };
}
