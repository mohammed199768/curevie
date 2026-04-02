export function formatCurrency(
  amount: number | string | null | undefined,
  locale: string = "en",
): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return "0.000 JOD";
  return locale === "ar" ? `${n.toFixed(3)} د.أ` : `${n.toFixed(3)} JOD`;
}
