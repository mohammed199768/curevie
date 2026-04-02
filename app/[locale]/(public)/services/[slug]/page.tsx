import { notFound } from "next/navigation";
import { PublicServiceCategoryExplorer } from "@/components/services/PublicServiceCategoryExplorer";
import {
  getPublicServiceCategory,
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";

export const revalidate = 3600;
export const dynamic = "force-static";

interface PublicServiceCategoryPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return PUBLIC_SERVICE_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export default function PublicServiceCategoryPage({ params }: PublicServiceCategoryPageProps) {
  if (!getPublicServiceCategory(params.slug)) {
    notFound();
  }

  return <PublicServiceCategoryExplorer slug={params.slug as PublicServiceCategorySlug} />;
}
