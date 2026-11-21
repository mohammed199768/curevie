import type { PublicCatalogEntry } from "@/lib/public-service-categories";

/**
 * The public "cart": ids of the catalog entries a visitor picked on the service pages (one list for the
 * whole site), plus a small copy of each picked entry. The copy is needed because lab tests are loaded
 * a page at a time, so a picked test may not be in the list that is on screen when the order is placed.
 */
export const SELECTION_STORAGE_KEY = "curevie_selected_services";
const ENTRIES_STORAGE_KEY = "curevie_selected_entries";

export type SelectedEntryMap = Record<string, PublicCatalogEntry>;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the selection simply lives in memory for this page.
  }
}

export function readSelectedIds(): string[] {
  const ids = read<unknown>(SELECTION_STORAGE_KEY, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export function readSelectedEntries(): SelectedEntryMap {
  const entries = read<unknown>(ENTRIES_STORAGE_KEY, {});
  return entries && typeof entries === "object" && !Array.isArray(entries) ? (entries as SelectedEntryMap) : {};
}

/** Saves the picked ids and keeps only the entry copies that are still picked. */
export function writeSelection(ids: string[], entries: SelectedEntryMap) {
  const kept: SelectedEntryMap = {};
  ids.forEach((id) => {
    if (entries[id]) kept[id] = entries[id];
  });
  write(SELECTION_STORAGE_KEY, ids);
  write(ENTRIES_STORAGE_KEY, kept);
}

export function clearSelectionStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SELECTION_STORAGE_KEY);
    window.localStorage.removeItem(ENTRIES_STORAGE_KEY);
  } catch {
    // ignore
  }
}
