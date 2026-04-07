export type ServiceCatalogSlug =
  | "medical-visits"
  | "nursing-care"
  | "physical-therapy"
  | "occupational-therapy"
  | "imaging"
  | "lab-diagnostics";

export interface ServiceCatalogTabTheme {
  base: string;
  secondary: string;
  accent: string;
  soft: string;
  muted: string;
  shadow: string;
}

export interface ServiceCatalogTab {
  slug: ServiceCatalogSlug;
  translationKey: string;
  serviceKind: "MEDICAL" | "RADIOLOGY" | "LAB";
  source: "services" | "lab";
  icon: string;
  theme: ServiceCatalogTabTheme;
  hero: {
    eyebrow: { ar: string; en: string };
    title: { ar: string; en: string };
    summary: { ar: string; en: string };
    stats: Array<{ value: string; label: { ar: string; en: string } }>;
  };
}

export const SERVICE_CATALOG_TABS: ServiceCatalogTab[] = [
  {
    slug: "medical-visits",
    translationKey: "medicalVisits",
    serviceKind: "MEDICAL",
    source: "services",
    icon: "Stethoscope",
    theme: {
      base: "#104d49",
      secondary: "#304a43",
      accent: "#86ab62",
      soft: "rgba(16, 77, 73, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(16, 77, 73, 0.24)",
    },
    hero: {
      eyebrow: { ar: "الحضور السريري", en: "Clinical Presence" },
      title: { ar: "الزيارات الطبية", en: "Medical Visits" },
      summary: {
        ar: "تقييمات طبية دقيقة ورعاية سريرية مباشرة للمرضى في خصوصية منازلهم.",
        en: "Expert clinical evaluations and hands-on care for patients at home.",
      },
      stats: [
        { value: "٢٤/٧", label: { ar: "خدمة مستمرة", en: "Around the clock" } },
        { value: "+٥٠", label: { ar: "طبيب متخصص", en: "Specialists" } },
        { value: "٣٠د", label: { ar: "متوسط الوصول", en: "Avg. arrival" } },
      ],
    },
  },
  {
    slug: "nursing-care",
    translationKey: "nursingCare",
    serviceKind: "MEDICAL",
    source: "services",
    icon: "Heart",
    theme: {
      base: "#304a43",
      secondary: "#104d49",
      accent: "#86ab62",
      soft: "rgba(48, 74, 67, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(48, 74, 67, 0.22)",
    },
    hero: {
      eyebrow: { ar: "الرعاية التمريضية", en: "Nursing Care" },
      title: { ar: "التمريض المنزلي", en: "Home Nursing" },
      summary: {
        ar: "خدمات تمريضية شاملة تشمل الحقن والتضميد وتركيب المحاليل والعناية بالمرضى المزمنين.",
        en: "Comprehensive nursing including injections, wound care, IV fluids, and chronic patient management.",
      },
      stats: [
        { value: "+١٧", label: { ar: "خدمة تمريضية", en: "Nursing services" } },
        { value: "معتمد", label: { ar: "كوادر معتمدة", en: "Certified staff" } },
        { value: "منزلي", label: { ar: "بيئة آمنة", en: "Home setting" } },
      ],
    },
  },
  {
    slug: "physical-therapy",
    translationKey: "physicalTherapy",
    serviceKind: "MEDICAL",
    source: "services",
    icon: "Activity",
    theme: {
      base: "#5a7a50",
      secondary: "#304a43",
      accent: "#86ab62",
      soft: "rgba(90, 122, 80, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(90, 122, 80, 0.22)",
    },
    hero: {
      eyebrow: { ar: "إعادة التأهيل", en: "Rehabilitation" },
      title: { ar: "العلاج الطبيعي", en: "Physical Therapy" },
      summary: {
        ar: "برامج علاج طبيعي متخصصة لتأهيل الإصابات والجلطات وأمراض المفاصل في بيئة منزلية آمنة.",
        en: "Specialized physiotherapy for injury recovery, stroke rehab, and joint conditions at home.",
      },
      stats: [
        { value: "+١٣", label: { ar: "برنامج تأهيل", en: "Rehab programs" } },
        { value: "متخصص", label: { ar: "معالجون فيزيائيون", en: "Physiotherapists" } },
        { value: "منزلي", label: { ar: "جلسات منزلية", en: "Home sessions" } },
      ],
    },
  },
  {
    slug: "occupational-therapy",
    translationKey: "occupationalTherapy",
    serviceKind: "MEDICAL",
    source: "services",
    icon: "Brain",
    theme: {
      base: "#104d49",
      secondary: "#5a7a50",
      accent: "#9c9fa2",
      soft: "rgba(16, 77, 73, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(16, 77, 73, 0.18)",
    },
    hero: {
      eyebrow: { ar: "التأهيل الوظيفي", en: "Functional Rehab" },
      title: { ar: "العلاج الوظيفي", en: "Occupational Therapy" },
      summary: {
        ar: "خدمات علاج وظيفي للأطفال ذوي الاحتياجات الخاصة ومرضى الجهاز العصبي لاستعادة الاستقلالية.",
        en: "Occupational therapy for special needs children and neurological patients to restore daily independence.",
      },
      stats: [
        { value: "+٤", label: { ar: "برامج متخصصة", en: "Specialized programs" } },
        { value: "أطفال", label: { ar: "واحتياجات خاصة", en: "& special needs" } },
        { value: "فردي", label: { ar: "برنامج مخصص", en: "Personalized plan" } },
      ],
    },
  },
  {
    slug: "imaging",
    translationKey: "imaging",
    serviceKind: "RADIOLOGY",
    source: "services",
    icon: "Crosshair",
    theme: {
      base: "#304a43",
      secondary: "#104d49",
      accent: "#9c9fa2",
      soft: "rgba(48, 74, 67, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(48, 74, 67, 0.2)",
    },
    hero: {
      eyebrow: { ar: "التشخيص الدقيق", en: "Precision Diagnostics" },
      title: { ar: "الأشعة التشخيصية", en: "Radiology" },
      summary: {
        ar: "تقنيات الأشعة المتنقلة تجلب دقة المختبرات والمستشفيات إلى سرير المريض.",
        en: "Advanced portable radiology bringing hospital-grade imaging to the patient's bedside.",
      },
      stats: [
        { value: "+٤", label: { ar: "نوع أشعة", en: "Imaging types" } },
        { value: "رقمي", label: { ar: "تقرير فوري", en: "Digital report" } },
        { value: "متنقل", label: { ar: "جهاز متنقل", en: "Portable device" } },
      ],
    },
  },
  {
    slug: "lab-diagnostics",
    translationKey: "labDiagnostics",
    serviceKind: "LAB",
    source: "lab",
    icon: "FlaskConical",
    theme: {
      base: "#5a7a50",
      secondary: "#304a43",
      accent: "#86ab62",
      soft: "rgba(90, 122, 80, 0.08)",
      muted: "#9c9fa2",
      shadow: "rgba(90, 122, 80, 0.18)",
    },
    hero: {
      eyebrow: { ar: "المختبر السريري", en: "Clinical Laboratory" },
      title: { ar: "التحاليل المخبرية", en: "Lab Diagnostics" },
      summary: {
        ar: "خدمات مخبرية منظمة مصممة للسحب المنزلي مع نظام إبلاغ رقمي متكامل.",
        en: "Structured lab services optimized for home collection with seamless digital reporting.",
      },
      stats: [
        { value: "+١٠٠", label: { ar: "فحص مخبري", en: "Lab tests" } },
        { value: "٢٤س", label: { ar: "وقت النتيجة", en: "Result time" } },
        { value: "معتمد", label: { ar: "مختبر معتمد", en: "Certified lab" } },
      ],
    },
  },
];

export const CATEGORY_LABELS: Record<ServiceCatalogSlug, { ar: string; en: string }> = {
  "medical-visits": { ar: "الزيارات الطبية", en: "Medical Visits" },
  "nursing-care": { ar: "التمريض المنزلي", en: "Home Nursing" },
  "physical-therapy": { ar: "العلاج الطبيعي", en: "Physical Therapy" },
  "occupational-therapy": { ar: "العلاج الوظيفي", en: "Occupational Therapy" },
  "imaging": { ar: "الأشعة", en: "Radiology" },
  "lab-diagnostics": { ar: "التحاليل", en: "Lab Tests" },
};

export function getServiceCatalogTab(slug: string): ServiceCatalogTab | null {
  return SERVICE_CATALOG_TABS.find((tab) => tab.slug === slug) ?? null;
}
