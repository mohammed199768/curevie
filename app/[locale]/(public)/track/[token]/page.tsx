import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrackOrderView } from "@/components/orders/TrackOrderView";

interface TrackOrderPageProps {
  params: {
    locale: string;
    token: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TrackOrderPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "trackPage" });

  return {
    title: t("metaTitle"),
    // The URL contains a secret token: keep it out of search engines and referrer headers.
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

export default function TrackOrderPage({ params }: TrackOrderPageProps) {
  return <TrackOrderView token={params.token} />;
}
