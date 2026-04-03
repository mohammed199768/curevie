import type { Metadata } from "next";
import { PublicContactExperience } from "@/components/contact/PublicContactExperience";
import { CONTACT_PAGE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Curevie | تواصل مع كيورفي",
  description: "Contact Curevie for home healthcare support, medical service guidance, and request follow-up in Jordan.",
  keywords: [...CONTACT_PAGE_KEYWORDS],
};

export default function ContactPage() {
  return <PublicContactExperience />;
}
