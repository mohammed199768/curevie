import type { CaseServiceStatus, CaseStatus } from "@/lib/api/cases";

/** Patient-facing order journey: Received → Provider assigned → Accepted / on the way → In progress → Completed → Closed. */
export const ORDER_STAGES = ["RECEIVED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

export type OrderIllustration =
  | "welcome"
  | "nurse-arrival"
  | "on-the-way"
  | "lab-sample"
  | "order-placed"
  | "empty-orders"
  | "payment-cliq"
  | "no-notifications";

const REACHED: Record<OrderStage, CaseServiceStatus[]> = {
  RECEIVED: ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
  ASSIGNED: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
  ACCEPTED: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: ["COMPLETED"],
  CLOSED: [],
};

/**
 * Current stage index derived from the case status (which the backend derives from its line items).
 * The case is ACCEPTED as soon as one item is assigned; it is "on the way" once a provider accepted.
 * Returns -1 for cancelled orders.
 */
export function getOrderStageIndex(status: CaseStatus, serviceStatuses: CaseServiceStatus[] = []): number {
  switch (status) {
    case "CANCELLED":
      return -1;
    case "PENDING":
      return 0;
    case "ACCEPTED": {
      const active = serviceStatuses.filter((value) => value !== "CANCELLED");
      return active.some((value) => REACHED.ACCEPTED.includes(value)) ? 2 : 1;
    }
    case "IN_PROGRESS":
      return 3;
    case "COMPLETED":
      return 4;
    case "CLOSED":
      return 5;
    default:
      return 0;
  }
}

/** How many active line items reached each stage (shown for multi-item orders). */
export function countItemsReached(stage: OrderStage, status: CaseStatus, serviceStatuses: CaseServiceStatus[]) {
  const active = serviceStatuses.filter((value) => value !== "CANCELLED");
  if (stage === "CLOSED") return status === "CLOSED" ? active.length : 0;
  return active.filter((value) => REACHED[stage].includes(value)).length;
}

export function getStageIllustration(stageIndex: number, hasLab: boolean): OrderIllustration | null {
  switch (stageIndex) {
    case 0:
      return "order-placed";
    case 1:
      return "nurse-arrival";
    case 2:
      return "on-the-way";
    case 3:
      return hasLab ? "lab-sample" : "welcome";
    case 4:
    case 5:
      return "welcome";
    default:
      return null;
  }
}

/** Short case reference shown everywhere in the app, e.g. #1A2B3C4D. */
export function getCaseReference(caseId: string) {
  return `#${caseId.slice(0, 8).toUpperCase()}`;
}

export const ACTIVE_CASE_STATUSES: CaseStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

/** Wraps a left-to-right token (e.g. "#1A2B3C4D") so it keeps its shape inside Arabic sentences. */
export function isolateLtr(value: string) {
  return `⁦${value}⁩`;
}
