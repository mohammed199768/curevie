import { publicApiClient } from "./client";
import type { Area } from "./types";

export const areasApi = {
  /** Active service districts, already ordered by the backend. */
  list: async () => (await publicApiClient.get<{ data: Area[] }>("/areas", { timeout: 15_000 })).data.data || [],
};

export function getAreaLabel(area: Pick<Area, "name_ar" | "name_en"> | null | undefined, locale: string) {
  if (!area) return "";
  return locale.startsWith("ar") ? area.name_ar || area.name_en : area.name_en || area.name_ar;
}
