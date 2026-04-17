import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicServiceCategoryExplorer } from "@/components/services/PublicServiceCategoryExplorer";
import type { AppLocale } from "@/i18n";
import {
  getPublicServiceCategory,
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";
import {
  buildAbsoluteUrl,
  buildPublicPageMetadata,
  getServicePageSeo,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildServiceSchema,
  getServiceCategorySeoContent,
} from "@/lib/seo-content";

export const revalidate = 3600;
export const dynamic = "force-static";

interface PublicServiceCategoryPageProps {
  params: {
    locale: AppLocale;
    slug: string;
  };
}

export function generateStaticParams() {
  return PUBLIC_SERVICE_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export function generateMetadata({ params }: PublicServiceCategoryPageProps): Metadata {
  const category = getPublicServiceCategory(params.slug);

  if (!category) {
    return {};
  }

  const seo = getServicePageSeo(category.slug, params.locale);

  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: `/services/${category.slug}`,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function PublicServiceCategoryPage({ params }: PublicServiceCategoryPageProps) {
  const category = getPublicServiceCategory(params.slug);

  if (!category) {
    notFound();
  }

  const seoContent = getServiceCategorySeoContent(
    category.slug as PublicServiceCategorySlug,
    params.locale,
  );

  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildServiceSchema(category.slug as PublicServiceCategorySlug, params.locale),
          buildFaqSchema(seoContent.faqItems),
          buildBreadcrumbSchema([
            {
              name: params.locale === "ar" ? "الرئيسية" : "Home",
              url: buildAbsoluteUrl(`/${params.locale}`),
            },
            {
              name: seoContent.shortName,
              url: buildAbsoluteUrl(`/${params.locale}/services/${category.slug}`),
            },
          ]),
        ]}
      />
      <PublicServiceCategoryExplorer slug={category.slug} />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5a7a50]">
                Curevie SEO
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-[#104d49] sm:text-4xl">
                {seoContent.introTitle}
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#304a43]">
                {seoContent.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.8rem] border border-[#dbe6e0] bg-[#f7fbf8] p-6">
              <h2 className="text-2xl font-semibold text-[#104d49]">
                {params.locale === "ar" ? "لماذا هذه الصفحة مهمة" : "Why this page matters"}
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#304a43]">
                {seoContent.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            </aside>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {seoContent.faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-[1.6rem] border border-[#dbe6e0] bg-[#fbfcfa] p-6"
              >
                <h3 className="text-xl font-semibold text-[#104d49]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#304a43]">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-[1.8rem] border border-[#dbe6e0] bg-[#104d49] p-6 text-white">
            <h2 className="text-2xl font-semibold">
              {params.locale === "ar" ? "استكشف مسارات مرتبطة" : "Explore related care paths"}
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {seoContent.relatedSlugs.map((relatedSlug) => {
                const relatedContent = getServiceCategorySeoContent(
                  relatedSlug,
                  params.locale,
                );

                return (
                  <Link
                    key={relatedSlug}
                    href={`/${params.locale}/services/${relatedSlug}`}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {relatedContent.shortName}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
