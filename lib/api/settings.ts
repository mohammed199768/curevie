import { useQuery } from "@tanstack/react-query";
import { publicApiClient } from "./client";
import type { CaseStatus, PaymentStatus } from "./cases";
import type { MoneyValue } from "./types";

/** CliQ instant-transfer details configured by the Curevie admin (GET /settings/public). */
export interface CliqSettings {
  alias: string;
  beneficiary_name: string | null;
  bank_name: string | null;
  note: string | null;
}

export interface PublicSettings {
  /** null while CliQ is switched off (or has no alias). */
  cliq: CliqSettings | null;
}

export const settingsApi = {
  getPublic: async () =>
    (await publicApiClient.get<{ data: PublicSettings }>("/settings/public", { timeout: 10_000 })).data.data,
};

/** Public settings are the same for everyone and rarely change. */
export function usePublicSettings() {
  return useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.getPublic,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export interface CliqInvoiceInput {
  final_amount: MoneyValue | null | undefined;
  payment_status: PaymentStatus | null | undefined;
  /** Only present once the invoice is released (case closed). */
  remaining_amount?: MoneyValue | null;
}

export type CliqDue =
  | { kind: "amount"; amount: number }
  /** Partially paid before close: the patient cannot see the balance yet. */
  | { kind: "balance" };

function toAmount(value: MoneyValue | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * What is still to pay on an order, for the "Pay via CliQ" card. null hides the card:
 * cancelled orders, PAID / CANCELLED invoices, or nothing left to pay.
 */
export function getCliqDue(caseStatus: CaseStatus | null | undefined, invoice: CliqInvoiceInput | null | undefined): CliqDue | null {
  if (!invoice || caseStatus === "CANCELLED") return null;
  const status = invoice.payment_status;
  if (!status || status === "PAID" || status === "CANCELLED") return null;

  const remaining = toAmount(invoice.remaining_amount);
  if (remaining !== null) {
    return remaining > 0 ? { kind: "amount", amount: remaining } : null;
  }

  if (status === "PENDING") {
    const total = toAmount(invoice.final_amount);
    return total !== null && total > 0 ? { kind: "amount", amount: total } : null;
  }

  return { kind: "balance" };
}
