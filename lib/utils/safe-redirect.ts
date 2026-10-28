/**
 * Accepts only same-site relative paths ("/en/requests"). Protocol-relative ("//evil.com"),
 * absolute ("https://..."), backslash tricks and anything containing "://" are rejected.
 */
export function getSafeRedirectPath(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const candidate = value.trim();

  if (
    !candidate.startsWith("/")
    || candidate.startsWith("//")
    || candidate.startsWith("/\\")
    || candidate.includes("://")
    || candidate.includes("\\")
    || /[\u0000-\u001f]/.test(candidate)
  ) {
    return undefined;
  }

  return candidate;
}
