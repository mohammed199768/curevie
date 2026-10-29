/** Routing helpers shared by the patient app shell (header, tab bar). */

type HeaderRoute = { titleKey: string; parent: string | null };

/** Title and "back" target for each patient screen (path without the locale prefix). */
export function resolveHeaderRoute(path: string): HeaderRoute {
  if (path.startsWith("/requests/new")) return { titleKey: "newRequest", parent: "/requests" };
  if (path.startsWith("/requests/")) return { titleKey: "requestDetails", parent: "/requests" };
  if (path.startsWith("/requests")) return { titleKey: "requests", parent: null };
  if (path.startsWith("/invoices/")) return { titleKey: "invoices", parent: "/invoices" };
  if (path.startsWith("/invoices")) return { titleKey: "invoices", parent: null };
  if (path.startsWith("/reports")) return { titleKey: "reports", parent: "/profile" };
  if (path.startsWith("/chat")) return { titleKey: "chat", parent: "/dashboard" };
  if (path.startsWith("/notifications")) return { titleKey: "notifications", parent: "/dashboard" };
  if (path.startsWith("/profile")) return { titleKey: "profile", parent: null };
  return { titleKey: "dashboard", parent: null };
}

export function stripLocale(pathname: string, locale: string) {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

/** Avatar letters: two initials for Latin names, the first letter for Arabic names (joined initials are hard to read). */
export function initialsOf(name?: string | null) {
  const parts = name?.split(" ").filter(Boolean) || [];
  if (!parts.length) return "PT";
  if (/[\u0600-\u06FF]/.test(parts[0])) return parts[0].charAt(0);
  return parts
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
