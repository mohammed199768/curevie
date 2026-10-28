import { isAxiosError } from "axios";
import { getApiError } from "@/lib/utils/apiError";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const KNOWN_ORDER_ERROR_CODES = new Set([
  "ITEM_INACTIVE",
  "ITEM_NOT_FOUND",
  "VIP_ONLY",
  "INVALID_AREA",
  "ADDRESS_REQUIRED",
  "VALIDATION_ERROR",
  "CASE_IN_PROGRESS",
  "INVALID_CASE_STATUS",
  "REFUND_REQUIRED",
  "ALREADY_RATED",
  "ALREADY_CLAIMED",
  "INVALID_SERVICE_STATUS",
  "NOT_FOUND",
  "CHAT_CLOSED",
  "EMPTY_MESSAGE",
]);

const NAMED_ERROR_CODES = new Set(["ITEM_INACTIVE", "VIP_ONLY"]);

/**
 * Turns a backend error ({ message, code }) from the ordering / case endpoints into a translated message.
 * `t` must be bound to the "orders" namespace (keys live under orders.errors.*).
 */
export function getOrderErrorMessage(error: unknown, t: Translate) {
  if (isAxiosError(error) && error.response?.status === 429) {
    return t("errors.RATE_LIMITED");
  }

  const { code, error: message } = getApiError(error);

  if (KNOWN_ORDER_ERROR_CODES.has(code)) {
    // ITEM_INACTIVE / VIP_ONLY messages quote the item name: "Name" is not available.
    const item = /"([^"]+)"/.exec(message)?.[1];
    if (item && NAMED_ERROR_CODES.has(code)) {
      return t(`errors.${code}_NAMED`, { item });
    }
    return t(`errors.${code}`);
  }

  return t("errors.GENERIC");
}
