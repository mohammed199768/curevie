import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { NOINDEX_ROBOTS } from "@/lib/seo";

// Patient-only pages: kept out of the index (and out of the sitemap) so Search Console
// does not report them as duplicates of the home page.
export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
