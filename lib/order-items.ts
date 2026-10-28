import { MAX_CASE_ITEMS, type CaseItemRef, type CaseItemType } from "@/lib/api/cases";
import type { ServiceKind } from "@/lib/api/types";

export const ORDER_ITEM_TYPES: readonly CaseItemType[] = ["SERVICE", "PACKAGE"];

export const SERVICE_KINDS: readonly ServiceKind[] = ["MEDICAL", "NURSING", "RADIOLOGY", "LAB"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrderItemType(value: string): value is CaseItemType {
  return (ORDER_ITEM_TYPES as readonly string[]).includes(value);
}

export function orderItemKey(item: CaseItemRef) {
  return `${item.type}:${item.id}`;
}

export function isServiceKind(value: string | null | undefined): value is ServiceKind {
  return Boolean(value) && (SERVICE_KINDS as readonly string[]).includes(String(value));
}

/**
 * Label for an order line or catalog item: services by their kind (medical, nursing, radiology, lab test),
 * packages as packages. `tOrders` must be bound to the "orders" namespace.
 */
export function getOrderItemTypeLabel(
  item: { type: string; serviceKind?: string | null },
  tOrders: (key: string) => string,
) {
  if (item.type === "PACKAGE") return tOrders("itemTypes.PACKAGE");
  return isServiceKind(item.serviceKind) ? tOrders(`serviceKinds.${item.serviceKind}`) : tOrders("itemTypes.SERVICE");
}

/** Removes duplicates (same type + id) and caps the list at the backend limit. */
export function dedupeOrderItems(items: CaseItemRef[]) {
  const seen = new Set<string>();
  const result: CaseItemRef[] = [];

  for (const item of items) {
    const key = orderItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= MAX_CASE_ITEMS) break;
  }

  return result;
}

/** `items=SERVICE:<uuid>,PACKAGE:<uuid>` query string used to pre-fill the new order page. */
export function buildOrderItemsQuery(items: CaseItemRef[]) {
  const unique = dedupeOrderItems(items);
  if (!unique.length) return "";
  return new URLSearchParams({ items: unique.map(orderItemKey).join(",") }).toString();
}

/** Value for <input type="datetime-local" min>, a few minutes from now in the browser's time zone. */
export function getMinScheduleInputValue(leadMinutes = 30) {
  const date = new Date(Date.now() + leadMinutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a datetime-local value to ISO-8601 with time zone; null when empty or invalid. */
export function scheduleInputToIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isFutureScheduleInput(value?: string | null) {
  const iso = scheduleInputToIso(value);
  return !iso || new Date(iso).getTime() > Date.now();
}

export function parseOrderItemsParam(value: string | null | undefined): CaseItemRef[] {
  if (!value) return [];

  const parsed = value
    .split(",")
    .map((chunk) => chunk.trim())
    .map((chunk) => {
      const [type, id] = chunk.split(":");
      if (!type || !id || !isOrderItemType(type) || !UUID_PATTERN.test(id)) return null;
      return { type, id } satisfies CaseItemRef;
    })
    .filter((item): item is CaseItemRef => item !== null);

  return dedupeOrderItems(parsed);
}
