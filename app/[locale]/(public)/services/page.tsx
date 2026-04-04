import { redirect } from "next/navigation";
import type { AppLocale } from "@/i18n";

interface PublicServicesIndexPageProps {
  params: {
    locale: AppLocale;
  };
}

export default function PublicServicesIndexPage({ params }: PublicServicesIndexPageProps) {
  redirect(`/${params.locale}/services/medical-visits`);
}
