import type { Locale } from "next-intl";

export const AMMAN_DISTRICTS: Record<string, { ar: string; en: string }> = {
  abdoun: { ar: "عبدون", en: "Abdoun" },
  abu_nsair: { ar: "أبو نصير", en: "Abu Nsair" },
  gandaweel: { ar: "الجاندويل", en: "Gandaweel" },
  ain_al_basha: { ar: "عين الباشا", en: "Ain Al Basha" },
  abdali: { ar: "العبدلي", en: "Abdali" },
  tariq: { ar: "طارق", en: "Tariq" },
  rabia: { ar: "الرابية", en: "Al Rabia" },
  rusaifeh: { ar: "الرصيفة", en: "Al Rusaifeh" },
  shmeisani: { ar: "شميساني", en: "Shmeisani" },
  sweileh: { ar: "صويلح", en: "Sweileh" },
  tla_ali: { ar: "تلاع العلي", en: "Tla' Al Ali" },
  um_uthaina: { ar: "أم أذينة", en: "Um Uthaina" },
  wadi_seer: { ar: "وادي السير", en: "Wadi Al Seer" },
  marka: { ar: "ماركا", en: "Marka" },
  zarqa: { ar: "الزرقاء", en: "Al Zarqa" },
  juwaida: { ar: "الجويدة", en: "Al Juwaida" },
  seventh_circle: { ar: "الدوار السابع", en: "7th Circle" },
  eighth_circle: { ar: "الدوار الثامن", en: "8th Circle" },
  khalda: { ar: "خلدا", en: "Khalda" },
  marj_hamam: { ar: "مرج الحمام", en: "Marj Al Hamam" },
  naour: { ar: "ناعور", en: "Naour" },
  jubaiha: { ar: "الجبيهة", en: "Al Jubaiha" },
  gardens: { ar: "الجاردنز", en: "The Gardens" },
  seventh: { ar: "السابع", en: "Al Sabe'" },
  muqabaleen: { ar: "المقابلين", en: "Al Muqabaleen" },
  hashmi_shamali: { ar: "الهاشمي الشمالي", en: "Hashmi Shamali" },
  hashmi_janubi: { ar: "الهاشمي الجنوبي", en: "Hashmi Janubi" },
  nuzhah: { ar: "النزهة", en: "Al Nuzhah" },
  bayader: { ar: "البيادر", en: "Al Bayader" },
  abu_alanda: { ar: "أبو علندا", en: "Abu Alanda" },
  qweismeh: { ar: "القويسمة", en: "Al Qweismeh" },
  tanib: { ar: "الطنيب", en: "Al Tanib" },
  muwaqqar: { ar: "الموقر", en: "Al Muwaqqar" },
  ashrafieh: { ar: "الأشرفية", en: "Al Ashrafieh" },
  jabal_hussein: { ar: "جبل الحسين", en: "Jabal Al Hussein" },
  jabal_amman: { ar: "جبل عمان", en: "Jabal Amman" },
  luweibdeh: { ar: "جبل اللويبدة", en: "Jabal Al Luweibdeh" },
  downtown: { ar: "الوسط", en: "Downtown" },
  sports_city: { ar: "المدينة الرياضية", en: "Sports City" },
};

export function getDistrictLabel(
  key: string,
  locale: Locale | string,
): string {
  const entry = AMMAN_DISTRICTS[key];
  if (!entry) return key;
  return locale.startsWith("ar") ? entry.ar : entry.en;
}

export const AMMAN_DISTRICT_KEYS = Object.keys(AMMAN_DISTRICTS);
