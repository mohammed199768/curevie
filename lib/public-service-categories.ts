import type { CaseItemRef, CaseItemType } from "@/lib/api/cases";
import { packagesApi } from "@/lib/api/packages";
import { servicesApi } from "@/lib/api/services";
import type { ApiListResponse, MoneyValue, PackageItem, ServiceItem, ServiceKind } from "@/lib/api/types";
import { BOOKINGS_ENABLED } from "@/lib/launch";
import { buildOrderItemsQuery, getOrderItemTypeLabel } from "@/lib/order-items";
import { normalizeListResponse } from "@/lib/utils";

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
};

export type PublicCatalogEntry =
  | {
      id: string;
      type: "service";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      serviceKind: ServiceKind;
    }
  | {
      id: string;
      type: "package";
      name: string;
      description: string | null;
      categoryName: string | null;
      price: number | null;
      servicesCount: number;
      /** Names of the included services, in package order. */
      includedServices: string[];
      /** What the bundle saves compared to ordering its services one by one (null when nothing). */
      savings: number | null;
    };

export type PublicCategoryCatalog = {
  entries: PublicCatalogEntry[];
  total: number;
};

export type PublicCategoryCountMap = Record<PublicServiceCategoryTranslationKey, number>;

type LocalizedCatalogText = {
  ar: string;
  en: string;
};

type LocalCatalogSeed = {
  key: string;
  name: LocalizedCatalogText;
  description: LocalizedCatalogText;
};

const LOCAL_CATEGORY_LABELS: Record<PublicServiceCategorySlug, LocalizedCatalogText> = {
  "medical-visits": { ar: "الزيارات الطبية", en: "Medical Visits" },
  "home-nursing": { ar: "التمريض والرعاية المنزلية", en: "Home Nursing & Care" },
  "physical-therapy": { ar: "العلاج الطبيعي المنزلي", en: "Home Physical Therapy" },
  "occupational-therapy": { ar: "العلاج الوظيفي المنزلي", en: "Home Occupational Therapy" },
  imaging: { ar: "الأشعة والتصوير المنزلي", en: "Home Radiology & Imaging" },
  "lab-diagnostics": { ar: "التحاليل المنزلية", en: "Home Lab Diagnostics" },
  "care-programs": { ar: "برامج الرعاية والمتابعة", en: "Care & Follow-up Programs" },
};

const LOCAL_CATALOG_SEEDS: Record<PublicServiceCategorySlug, readonly LocalCatalogSeed[]> = {
  "medical-visits": [
    {
      key: "doctor-home-visit",
      name: { ar: "زيارة طبيب إلى المنزل", en: "Doctor Home Visit" },
      description: { ar: "تقييم سريري وفحص طبي في المنزل مع خطة علاج ومتابعة.", en: "At-home clinical assessment, examination, and follow-up plan." },
    },
    {
      key: "comprehensive-medical-visit",
      name: { ar: "زيارة طبية شاملة", en: "Comprehensive Medical Visit" },
      description: { ar: "زيارة منزلية لتقييم الحالة الصحية والاحتياجات الطبية بصورة شاملة.", en: "A comprehensive home visit to assess health needs and next steps." },
    },
    {
      key: "online-consultation",
      name: { ar: "استشارة طبية عن بُعد", en: "Online Medical Consultation" },
      description: { ar: "استشارة أولية عن بُعد لتوجيه المريض إلى المسار الأنسب.", en: "A remote first consultation to guide the patient to the right care path." },
    },
    {
      key: "urologist-home-visit",
      name: { ar: "زيارة طبيب مسالك بولية", en: "Urologist Home Visit" },
      description: { ar: "تقييم متخصص لحالات المسالك البولية ضمن راحة المنزل.", en: "Specialist assessment for urology needs in the comfort of home." },
    },
    {
      key: "chronic-disease-follow-up",
      name: { ar: "متابعة الأمراض المزمنة", en: "Chronic Disease Follow-up" },
      description: { ar: "متابعة دورية للحالات المزمنة ومراجعة الخطة العلاجية.", en: "Ongoing review of chronic conditions and the care plan." },
    },
    {
      key: "elderly-medical-assessment",
      name: { ar: "تقييم طبي لكبار السن", en: "Elderly Medical Assessment" },
      description: { ar: "تقييم منزلي يراعي الأدوية والحركة والاحتياجات اليومية لكبار السن.", en: "A home assessment covering medication, mobility, and daily needs for older adults." },
    },
    {
      key: "pediatric-home-visit",
      name: { ar: "زيارة طبيب أطفال إلى المنزل", en: "Pediatric Home Visit" },
      description: { ar: "تقييم الأطفال في المنزل للحالات التي لا تتطلب طوارئ.", en: "At-home pediatric assessment for non-emergency concerns." },
    },
  ],
  "home-nursing": [
    {
      key: "iv-cannula-injections",
      name: { ar: "حقن وريدي وتركيب كانيولا", en: "IV / Cannula Injections" },
      description: { ar: "إعطاء الحقن الوريدي وتركيب الكانيولا بواسطة كادر تمريضي مؤهل.", en: "IV administration and cannula placement by qualified nursing staff." },
    },
    {
      key: "im-subcutaneous-injections",
      name: { ar: "حقن عضلي أو تحت الجلد", en: "IM / Subcutaneous Injections" },
      description: { ar: "إعطاء الحقن العضلية أو تحت الجلد وفق الوصفة الطبية.", en: "Intramuscular or subcutaneous injections according to the prescription." },
    },
    {
      key: "nebulizer-session",
      name: { ar: "جلسة تبخيرة", en: "Nebulizer Session" },
      description: { ar: "تجهيز ومتابعة جلسة التبخيرة في المنزل.", en: "Setup and monitoring of a home nebulizer session." },
    },
    {
      key: "post-operative-care",
      name: { ar: "رعاية ما بعد العمليات", en: "Post-operative Care" },
      description: { ar: "متابعة الجرح والعلامات الحيوية والتعليمات بعد الخروج من المستشفى.", en: "Wound, vital-sign, and recovery follow-up after hospital discharge." },
    },
    {
      key: "deep-wound-care",
      name: { ar: "العناية بالجروح العميقة", en: "Deep Wound Care" },
      description: { ar: "تنظيف وتضميد الجروح العميقة وفق خطة الرعاية.", en: "Cleaning and dressing of deep wounds according to the care plan." },
    },
    {
      key: "wound-care",
      name: { ar: "العناية بالجروح وتغيير الضماد", en: "Wound Care & Dressing" },
      description: { ar: "تنظيف الجرح وتغيير الضماد ومراقبة مؤشرات الالتهاب.", en: "Wound cleaning, dressing changes, and monitoring for signs of infection." },
    },
    {
      key: "burn-care",
      name: { ar: "العناية بالحروق", en: "Burn Care" },
      description: { ar: "غيار الحروق ومتابعة التئامها حسب توجيهات الفريق الطبي.", en: "Burn dressing and healing follow-up under clinical guidance." },
    },
    {
      key: "urinary-catheter-insertion",
      name: { ar: "تركيب قسطرة بولية", en: "Urinary Catheter Insertion" },
      description: { ar: "تركيب أو تبديل القسطرة البولية في المنزل ضمن معايير التعقيم.", en: "Home urinary catheter insertion or replacement using sterile practice." },
    },
    {
      key: "diabetic-foot-care",
      name: { ar: "العناية بالقدم السكري", en: "Diabetic Foot Care" },
      description: { ar: "تقييم وعناية تمريضية للجروح المرتبطة بالقدم السكري.", en: "Nursing assessment and care for diabetic foot wounds." },
    },
    {
      key: "vital-signs-monitoring",
      name: { ar: "قياس ومتابعة العلامات الحيوية", en: "Vital Signs Monitoring" },
      description: { ar: "متابعة الضغط والنبض والحرارة والأكسجين وتوثيق القراءات.", en: "Monitoring and documenting blood pressure, pulse, temperature, and oxygen." },
    },
    {
      key: "medication-administration",
      name: { ar: "إعطاء الأدوية ومتابعتها", en: "Medication Administration & Follow-up" },
      description: { ar: "مساعدة تمريضية منظمة لإعطاء الأدوية ومتابعة الجرعات.", en: "Structured nursing support for medication administration and schedules." },
    },
    {
      key: "elderly-nursing-care",
      name: { ar: "رعاية تمريضية لكبار السن", en: "Elderly Nursing Care" },
      description: { ar: "رعاية منزلية تراعي الحالة الصحية والاحتياجات اليومية لكبار السن.", en: "Home nursing tailored to older adults' health and daily needs." },
    },
    {
      key: "patient-companion-home",
      name: { ar: "مرافقة مريض في المنزل", en: "Patient Companion at Home" },
      description: { ar: "دعم ومرافقة للمريض في المنزل بالتنسيق مع الأسرة.", en: "Patient support and companionship at home in coordination with the family." },
    },
    {
      key: "patient-companion-hospital",
      name: { ar: "مرافقة مريض في المستشفى", en: "Patient Companion in Hospital" },
      description: { ar: "مرافقة منظمة للمريض أثناء الإقامة أو المراجعات في المستشفى.", en: "Organized patient companionship during hospital stays or visits." },
    },
  ],
  "physical-therapy": [
    {
      key: "physiotherapy-assessment",
      name: { ar: "تقييم علاج طبيعي منزلي", en: "Home Physiotherapy Assessment" },
      description: { ar: "تقييم الحركة والقوة ووضع خطة علاج تناسب المنزل.", en: "Mobility and strength assessment with a home-based treatment plan." },
    },
    {
      key: "post-operative-rehabilitation",
      name: { ar: "تأهيل ما بعد العمليات", en: "Post-operative Rehabilitation" },
      description: { ar: "جلسات تدريجية لاستعادة الحركة بعد العمليات.", en: "Progressive sessions to restore movement after surgery." },
    },
    {
      key: "stroke-neurological-rehab",
      name: { ar: "تأهيل الجلطات والحالات العصبية", en: "Stroke & Neurological Rehabilitation" },
      description: { ar: "برنامج منزلي لتحسين الحركة والتوازن بعد الجلطات والحالات العصبية.", en: "Home rehabilitation to improve movement and balance after stroke or neurological illness." },
    },
    {
      key: "mobility-balance-training",
      name: { ar: "تدريب الحركة والتوازن", en: "Mobility & Balance Training" },
      description: { ar: "تدريب آمن لتحسين المشي والتوازن وتقليل خطر السقوط.", en: "Safe training to improve walking, balance, and fall prevention." },
    },
    {
      key: "joint-pain-therapy",
      name: { ar: "علاج آلام المفاصل والعضلات", en: "Joint & Musculoskeletal Therapy" },
      description: { ar: "جلسات لتحسين المرونة وتخفيف الألم واستعادة النشاط.", en: "Sessions to improve flexibility, reduce pain, and restore activity." },
    },
  ],
  "occupational-therapy": [
    {
      key: "daily-living-skills",
      name: { ar: "تدريب مهارات الحياة اليومية", en: "Daily Living Skills Training" },
      description: { ar: "تدريب عملي لاستعادة الاستقلالية في الأنشطة اليومية.", en: "Practical training to regain independence in everyday activities." },
    },
    {
      key: "neurological-occupational-rehab",
      name: { ar: "تأهيل وظيفي للحالات العصبية", en: "Neurological Occupational Rehabilitation" },
      description: { ar: "تأهيل وظيفي لتحسين استخدام الأطراف والمهارات اليومية.", en: "Functional rehabilitation for limb use and daily skills." },
    },
    {
      key: "pediatric-occupational-therapy",
      name: { ar: "علاج وظيفي للأطفال", en: "Pediatric Occupational Therapy" },
      description: { ar: "برنامج منزلي لدعم مهارات الأطفال واحتياجاتهم الوظيفية.", en: "Home-based support for children's functional and developmental skills." },
    },
    {
      key: "home-independence-assessment",
      name: { ar: "تقييم الاستقلالية وسلامة المنزل", en: "Home Independence & Safety Assessment" },
      description: { ar: "تقييم البيئة المنزلية واقتراح تعديلات تساعد على الحركة الآمنة.", en: "Home environment assessment with recommendations for safer independence." },
    },
  ],
  imaging: [
    { key: "xray-ankle", name: { ar: "أشعة سينية للكاحل", en: "X-ray Ankle" }, description: { ar: "تصوير الكاحل بالأشعة السينية في المنزل.", en: "Portable ankle X-ray at home." } },
    { key: "xray-elbow", name: { ar: "أشعة سينية للمرفق", en: "X-ray Elbow" }, description: { ar: "تصوير المرفق بالأشعة السينية في المنزل.", en: "Portable elbow X-ray at home." } },
    { key: "xray-knee", name: { ar: "أشعة سينية للركبة", en: "X-ray Knee" }, description: { ar: "تصوير الركبة بالأشعة السينية في المنزل.", en: "Portable knee X-ray at home." } },
    { key: "xray-wrist", name: { ar: "أشعة سينية للرسغ", en: "X-ray Wrist" }, description: { ar: "تصوير الرسغ بالأشعة السينية في المنزل.", en: "Portable wrist X-ray at home." } },
    { key: "xray-hand", name: { ar: "أشعة سينية لليد", en: "X-ray Hand" }, description: { ar: "تصوير اليد بالأشعة السينية في المنزل.", en: "Portable hand X-ray at home." } },
    { key: "xray-shoulder", name: { ar: "أشعة سينية للكتف", en: "X-ray Shoulder" }, description: { ar: "تصوير الكتف بالأشعة السينية في المنزل.", en: "Portable shoulder X-ray at home." } },
    { key: "xray-hip", name: { ar: "أشعة سينية للورك", en: "X-ray Hip" }, description: { ar: "تصوير الورك بالأشعة السينية في المنزل.", en: "Portable hip X-ray at home." } },
    { key: "xray-pelvis", name: { ar: "أشعة سينية للحوض", en: "X-ray Pelvis" }, description: { ar: "تصوير الحوض بالأشعة السينية في المنزل.", en: "Portable pelvis X-ray at home." } },
    { key: "xray-spine-2-view", name: { ar: "أشعة سينية للعمود الفقري بوضعيتين", en: "X-ray Spine — 2 Views" }, description: { ar: "تصوير العمود الفقري بوضعيتين في المنزل.", en: "Portable two-view spine X-ray at home." } },
    { key: "xray-chest-1-view", name: { ar: "أشعة صدر بوضعية واحدة", en: "X-ray Chest — 1 View" }, description: { ar: "تصوير الصدر بوضعية واحدة في المنزل.", en: "Portable single-view chest X-ray at home." } },
    { key: "xray-chest-2-view", name: { ar: "أشعة صدر بوضعيتين", en: "X-ray Chest — 2 Views" }, description: { ar: "تصوير الصدر بوضعيتين في المنزل.", en: "Portable two-view chest X-ray at home." } },
    { key: "xray-arm-2-view", name: { ar: "أشعة للذراع بوضعيتين", en: "X-ray Arm — 2 Views" }, description: { ar: "تصوير الذراع بوضعيتين في المنزل.", en: "Portable two-view arm X-ray at home." } },
    { key: "xray-leg-2-view", name: { ar: "أشعة للساق بوضعيتين", en: "X-ray Leg — 2 Views" }, description: { ar: "تصوير الساق بوضعيتين في المنزل.", en: "Portable two-view leg X-ray at home." } },
    { key: "xray-skull-2-view", name: { ar: "أشعة للجمجمة بوضعيتين", en: "X-ray Skull — 2 Views" }, description: { ar: "تصوير الجمجمة بوضعيتين في المنزل.", en: "Portable two-view skull X-ray at home." } },
    { key: "ultrasound-abdomen", name: { ar: "ألتراساوند للبطن", en: "Ultrasound Abdomen" }, description: { ar: "تصوير البطن بالموجات فوق الصوتية.", en: "Abdominal ultrasound imaging." } },
    { key: "ultrasound-pelvis", name: { ar: "ألتراساوند للحوض", en: "Ultrasound Pelvis" }, description: { ar: "تصوير الحوض بالموجات فوق الصوتية.", en: "Pelvic ultrasound imaging." } },
    { key: "ultrasound-parathyroid", name: { ar: "ألتراساوند لجارات الدرقية", en: "Ultrasound Parathyroid" }, description: { ar: "تصوير جارات الدرقية بالموجات فوق الصوتية.", en: "Parathyroid ultrasound imaging." } },
    { key: "ultrasound-thyroid", name: { ar: "ألتراساوند للغدة الدرقية", en: "Ultrasound Thyroid" }, description: { ar: "تصوير الغدة الدرقية بالموجات فوق الصوتية.", en: "Thyroid ultrasound imaging." } },
    { key: "ultrasound-neck", name: { ar: "ألتراساوند للرقبة", en: "Ultrasound Neck" }, description: { ar: "تصوير الرقبة بالموجات فوق الصوتية.", en: "Neck ultrasound imaging." } },
    { key: "ultrasound-breast", name: { ar: "ألتراساوند للثدي", en: "Ultrasound Breast" }, description: { ar: "تصوير الثدي بالموجات فوق الصوتية.", en: "Breast ultrasound imaging." } },
    { key: "ultrasound-soft-tissue", name: { ar: "ألتراساوند للأنسجة الرخوة", en: "Ultrasound Soft Tissue" }, description: { ar: "تصوير الأنسجة الرخوة بالموجات فوق الصوتية.", en: "Soft-tissue ultrasound imaging." } },
    { key: "doppler-one-side", name: { ar: "دوبلر لجهة واحدة", en: "Doppler Ultrasound — One Side" }, description: { ar: "فحص دوبلر للأوعية في جهة واحدة.", en: "One-sided vascular Doppler ultrasound." } },
    { key: "doppler-two-sides", name: { ar: "دوبلر للجهتين", en: "Doppler Ultrasound — Two Sides" }, description: { ar: "فحص دوبلر للأوعية في الجهتين.", en: "Bilateral vascular Doppler ultrasound." } },
    { key: "echocardiogram", name: { ar: "إيكو للقلب", en: "Echocardiogram" }, description: { ar: "تصوير القلب بالموجات فوق الصوتية.", en: "Ultrasound imaging of the heart." } },
    { key: "ecg", name: { ar: "تخطيط القلب", en: "ECG" }, description: { ar: "تسجيل النشاط الكهربائي للقلب في المنزل.", en: "At-home recording of the heart's electrical activity." } },
  ],
  "lab-diagnostics": [
    { key: "home-sample-collection", name: { ar: "سحب عينات مخبرية من المنزل", en: "Home Lab Sample Collection" }, description: { ar: "سحب العينات من المنزل وتنسيق النتائج رقميًا.", en: "At-home sample collection with coordinated digital results." } },
    { key: "complete-blood-count", name: { ar: "فحص تعداد الدم الكامل", en: "Complete Blood Count" }, description: { ar: "فحص أساسي لمكونات الدم الرئيسية.", en: "Core screening of the main blood components." } },
    { key: "kidney-function-panel", name: { ar: "فحوصات وظائف الكلى", en: "Kidney Function Panel" }, description: { ar: "مجموعة فحوصات لمؤشرات وظائف الكلى.", en: "A panel covering key kidney function markers." } },
    { key: "liver-function-panel", name: { ar: "فحوصات وظائف الكبد", en: "Liver Function Panel" }, description: { ar: "مجموعة فحوصات لمؤشرات وظائف الكبد.", en: "A panel covering key liver function markers." } },
    { key: "diabetes-panel", name: { ar: "فحوصات السكري", en: "Diabetes Panel" }, description: { ar: "فحوصات لمتابعة سكر الدم والسيطرة عليه.", en: "Tests for blood glucose screening and follow-up." } },
    { key: "thyroid-panel", name: { ar: "فحوصات الغدة الدرقية", en: "Thyroid Panel" }, description: { ar: "فحوصات لمؤشرات نشاط الغدة الدرقية.", en: "Tests covering key thyroid activity markers." } },
    { key: "lipid-profile", name: { ar: "فحص دهنيات الدم", en: "Lipid Profile" }, description: { ar: "فحص الكوليسترول والدهنيات الأساسية.", en: "Screening of cholesterol and core lipid markers." } },
    { key: "vitamin-panel", name: { ar: "فحوصات الفيتامينات", en: "Vitamin Panel" }, description: { ar: "فحوصات مختارة لمتابعة مستويات الفيتامينات.", en: "Selected tests for common vitamin levels." } },
    { key: "urinalysis", name: { ar: "فحص البول", en: "Urinalysis" }, description: { ar: "تحليل بول روتيني ضمن خدمة السحب المنزلي.", en: "Routine urinalysis coordinated through home collection." } },
  ],
  "care-programs": [
    { key: "elderly-home-care", name: { ar: "برنامج رعاية كبار السن", en: "Elderly Home Care Program" }, description: { ar: "خطة رعاية منظمة تشمل المتابعة الصحية والأدوية والاحتياجات اليومية.", en: "A structured plan covering health follow-up, medication, and daily needs." } },
    { key: "post-surgery-recovery", name: { ar: "برنامج التعافي بعد العمليات", en: "Post-surgery Recovery Program" }, description: { ar: "خطة متابعة منزلية للجروح والعلامات الحيوية والتعافي التدريجي.", en: "Home follow-up for wounds, vital signs, and progressive recovery." } },
    { key: "patient-companion-program", name: { ar: "برنامج مرافقة المريض", en: "Patient Companion Program" }, description: { ar: "مرافقة ودعم للمريض في المنزل أو المستشفى وفق احتياج الأسرة.", en: "Patient support at home or in hospital based on family needs." } },
    { key: "chronic-care-follow-up", name: { ar: "برنامج متابعة الحالات المزمنة", en: "Chronic Care Follow-up Program" }, description: { ar: "متابعة منظمة للقياسات والأدوية والمواعيد الطبية.", en: "Organized follow-up for measurements, medication, and appointments." } },
    { key: "medication-management", name: { ar: "برنامج إدارة ومتابعة الأدوية", en: "Medication Management Program" }, description: { ar: "تنظيم جدول الأدوية ومتابعة الالتزام بالتنسيق مع الأسرة.", en: "Medication schedule organization and adherence follow-up with the family." } },
    { key: "home-care-assessment", name: { ar: "تقييم وخطة رعاية منزلية", en: "Home Care Assessment & Plan" }, description: { ar: "تقييم احتياجات المريض وبناء خطة رعاية منزلية مناسبة.", en: "Assessment of patient needs followed by a suitable home-care plan." } },
  ],
};

type PublicServiceCategoryRuntimeTranslationKey = Exclude<PublicServiceCategoryTranslationKey, "homeNursing">;

type PublicServiceCategoryDefinition = {
  slug: PublicServiceCategorySlug;
  translationKey: PublicServiceCategoryRuntimeTranslationKey;
  /** "services": services matching `serviceKind` or `categoryId`; "packages": GET /packages. */
  source: "services" | "packages";
  serviceKind?: ServiceKind;
  /** Services of this admin category (used for sub-specialities that share a kind, e.g. physical therapy). */
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
    source: "services",
    serviceKind: "NURSING",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#104d49",
      secondary: "#304a43",
      accent: "#86ab62",
      soft: "rgba(16, 77, 73, 0.06)",
      muted: "#5a7a50",
      shadow: "rgba(16, 77, 73, 0.20)",
    },
  },
  {
    slug: "physical-therapy",
    translationKey: "physicalTherapy",
    source: "services",
    categoryId: "3a3ab6d1-6b90-42b3-80aa-a0ef754576df",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#304a43",
      secondary: "#104d49",
      accent: "#5a7a50",
      soft: "rgba(48, 74, 67, 0.06)",
      muted: "#5a7a50",
      shadow: "rgba(48, 74, 67, 0.20)",
    },
  },
  {
    slug: "occupational-therapy",
    translationKey: "occupationalTherapy",
    source: "services",
    categoryId: "53123e20-0e97-43b0-85e8-c8876e2b0dbc",
    defaultRequestPreset: { serviceType: "MEDICAL" },
    theme: {
      base: "#5a7a50",
      secondary: "#304a43",
      accent: "#86ab62",
      soft: "rgba(90, 122, 80, 0.06)",
      muted: "#9c9fa2",
      shadow: "rgba(90, 122, 80, 0.18)",
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
    source: "services",
    serviceKind: "LAB",
    defaultRequestPreset: { serviceType: "LAB" },
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

function localizeCatalogText(value: LocalizedCatalogText, locale: string) {
  return locale === "ar" ? value.ar : value.en;
}

export function getLocalPublicServiceCategoryCatalog(
  slug: PublicServiceCategorySlug,
  locale: string = "en",
): PublicCategoryCatalog {
  const categoryName = localizeCatalogText(LOCAL_CATEGORY_LABELS[slug], locale);
  const entries = LOCAL_CATALOG_SEEDS[slug].map<PublicCatalogEntry>((seed) => {
    const shared = {
      id: `local-${slug}-${seed.key}`,
      name: localizeCatalogText(seed.name, locale),
      description: localizeCatalogText(seed.description, locale),
      categoryName,
      price: null,
    };

    if (slug === "care-programs") {
      return {
        ...shared,
        type: "package",
        servicesCount: 0,
        includedServices: [],
        savings: null,
      };
    }

    return {
      ...shared,
      type: "service",
      serviceKind: getPublicServiceCategory(slug)?.serviceKind || "MEDICAL",
    };
  });

  return { entries: sortEntries(entries), total: entries.length };
}

function normalizeCatalogName(name: string) {
  return name.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
}

function mergeWithLocalCatalog(
  slug: PublicServiceCategorySlug,
  locale: string,
  remoteEntries: PublicCatalogEntry[],
): PublicCategoryCatalog {
  // Once ordering is live the catalog only lists real, orderable items with their prices.
  if (BOOKINGS_ENABLED) {
    const entries = sortEntries(remoteEntries);
    return { entries, total: entries.length };
  }

  const localCatalog = getLocalPublicServiceCategoryCatalog(slug, locale);
  const seen = new Set(remoteEntries.map((entry) => normalizeCatalogName(entry.name)));
  const mergedEntries = [
    ...remoteEntries,
    ...localCatalog.entries.filter((entry) => !seen.has(normalizeCatalogName(entry.name))),
  ].map((entry) => ({ ...entry, price: null })) as PublicCatalogEntry[];

  return {
    entries: sortEntries(mergedEntries),
    total: mergedEntries.length,
  };
}

function toPrice(value: MoneyValue | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function localizedText(locale: string, ar?: string | null, en?: string | null, fallback?: string | null) {
  return (locale === "ar" ? ar || en : en || ar) || fallback || "";
}

function mapServiceEntry(item: ServiceItem, locale: string): PublicCatalogEntry {
  return {
    id: item.id,
    type: "service",
    name: localizedText(locale, item.name_ar, item.name_en, item.name),
    description: localizedText(locale, item.description_ar, item.description_en, item.description) || null,
    categoryName: item.category_name || null,
    price: toPrice(item.price),
    serviceKind: item.service_kind || "MEDICAL",
  };
}

function mapPackageEntry(item: PackageItem, locale: string): PublicCatalogEntry {
  const savings = toPrice(item.savings);
  const includedServices = (item.services || []).map((service) =>
    localizedText(locale, service.name_ar, service.name_en, service.name),
  );

  return {
    id: item.id,
    type: "package",
    name: localizedText(locale, item.name_ar, item.name_en, item.name),
    description: localizedText(locale, item.description_ar, item.description_en, item.description) || null,
    categoryName: item.category_name || null,
    price: toPrice(item.total_cost),
    servicesCount: item.services_count ?? includedServices.length,
    includedServices,
    savings: savings !== null && savings > 0 ? savings : null,
  };
}

const PUBLIC_PAGE_LIMIT = 100;
const PUBLIC_MAX_PAGES = 10;

async function fetchAllPublicPages<T>(load: (page: number) => Promise<{ data: ApiListResponse<T> }>) {
  const first = normalizeListResponse<T>((await load(1)).data);
  const totalPages = Math.min(Number(first.pagination.total_pages || first.pagination.pages || 1), PUBLIC_MAX_PAGES);
  if (totalPages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, async (_, index) => normalizeListResponse<T>((await load(index + 2)).data).data),
  );
  return [...first.data, ...rest.flat()];
}

/** Admin categories that have their own page; their services are not repeated on the kind-based pages. */
const DEDICATED_CATEGORY_IDS = new Set(
  PUBLIC_SERVICE_CATEGORIES.map((category) => category.categoryId).filter((id): id is string => Boolean(id)),
);

function belongsToCategory(item: ServiceItem, category: PublicServiceCategoryDefinition) {
  if (category.categoryId) return item.category_id === category.categoryId;
  if ((item.service_kind || "MEDICAL") !== category.serviceKind) return false;
  return !item.category_id || !DEDICATED_CATEGORY_IDS.has(item.category_id);
}

export function getPublicServiceCategory(slug: string) {
  return PUBLIC_SERVICE_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getPublicServiceCategoryAnalyticsKind(slug: string): AnalyticsServiceKind | null {
  const category = getPublicServiceCategory(slug);
  if (!category) {
    return null;
  }

  return category.defaultRequestPreset.serviceType;
}

export function getPublicServiceCategoryByKey(translationKey: PublicServiceCategoryTranslationKey) {
  return PUBLIC_SERVICE_CATEGORIES.find((category) => category.translationKey === translationKey) || null;
}

/** Order item type the backend expects for a catalog entry (POST /cases items[].type). */
export function getCatalogEntryItemType(entry: PublicCatalogEntry): CaseItemType {
  return entry.type === "package" ? "PACKAGE" : "SERVICE";
}

/** Badge label for a catalog entry: the service kind (medical, nursing, radiology, lab test) or "package". */
export function getCatalogEntryTypeLabel(entry: PublicCatalogEntry, tOrders: (key: string) => string) {
  return getOrderItemTypeLabel(
    { type: getCatalogEntryItemType(entry), serviceKind: entry.type === "service" ? entry.serviceKind : null },
    tOrders,
  );
}

export function toCatalogItemRef(entry: PublicCatalogEntry): CaseItemRef {
  return { type: getCatalogEntryItemType(entry), id: entry.id };
}

/** Entries built from the local prelaunch seed have no backend id and cannot be ordered. */
export function isOrderableCatalogEntry(entry: PublicCatalogEntry) {
  return !entry.id.startsWith("local-");
}

export function buildNewRequestHref(locale: string, items: CaseItemRef[] = []) {
  const query = buildOrderItemsQuery(items);
  return `/${locale}/requests/new${query ? `?${query}` : ""}`;
}

export function buildAuthRedirectHref(
  locale: string,
  items: CaseItemRef[] = [],
  authPath: "login" | "register" = "login",
) {
  const requestHref = buildNewRequestHref(locale, items);
  return `/${locale}/${authPath}?redirect=${encodeURIComponent(requestHref)}`;
}

export function getPublicCatalogEntryAnalyticsKind(entry: PublicCatalogEntry): AnalyticsServiceKind {
  if (entry.type === "package") return "PACKAGE";
  if (entry.serviceKind === "RADIOLOGY" || entry.serviceKind === "LAB") return entry.serviceKind;
  return "MEDICAL";
}

export async function fetchPublicServiceCategoryCatalog(slug: PublicServiceCategorySlug, locale: string = "en"): Promise<PublicCategoryCatalog> {
  const category = getPublicServiceCategory(slug);

  if (!category) {
    throw new Error(`Unknown category slug: ${slug}`);
  }

  try {
    if (category.source === "packages") {
      const packages = await fetchAllPublicPages((page) => packagesApi.listPublic({ page, limit: PUBLIC_PAGE_LIMIT }));
      return mergeWithLocalCatalog(slug, locale, packages.map((item) => mapPackageEntry(item, locale)));
    }

    // The API narrows by category or kind; belongsToCategory then leaves out services that already
    // have their own dedicated category page.
    const services = await fetchAllPublicPages((page) =>
      servicesApi.listPublic({
        page,
        limit: PUBLIC_PAGE_LIMIT,
        ...(category.categoryId
          ? { category_id: category.categoryId }
          : category.serviceKind ? { service_kind: category.serviceKind } : {}),
      }),
    );
    const entries = services
      .filter((item) => belongsToCategory(item, category))
      .map((item) => mapServiceEntry(item, locale));

    return mergeWithLocalCatalog(slug, locale, entries);
  } catch {
    return getLocalPublicServiceCategoryCatalog(slug, locale);
  }
}

/**
 * Home-page category counts, computed from the live catalog with the same rules as the category
 * pages. Throws when the API is unreachable so the cards show "pending" instead of invented numbers.
 */
export async function fetchPublicServiceCounts(): Promise<PublicCategoryCountMap> {
  const { data } = (await servicesApi.publicCounts()).data;

  const countFor = (category: PublicServiceCategoryDefinition) => {
    if (category.source === "packages") return data.packages;
    return data.services
      .filter((row) =>
        belongsToCategory(
          { service_kind: row.service_kind || undefined, category_id: row.category_id } as ServiceItem,
          category,
        ),
      )
      .reduce((sum, row) => sum + row.count, 0);
  };

  const counts = Object.fromEntries(
    PUBLIC_SERVICE_CATEGORIES.map((category) => [category.translationKey, countFor(category)]),
  ) as Omit<PublicCategoryCountMap, "homeNursing">;

  return { ...counts, homeNursing: counts.nursingCare };
}
