import type { Metadata } from "next";
import { PublicAboutExperience } from "@/components/about/PublicAboutExperience";
import { ABOUT_PAGE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Curevie | عن كيورفي",
  description: "Learn about Curevie's home healthcare model, care coordination approach, and mission in Jordan.",
  keywords: [...ABOUT_PAGE_KEYWORDS],
};

export default function AboutPage() {
  return <PublicAboutExperience />;
}
