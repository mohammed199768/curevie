import Link from "next/link";
import {
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";
import type { SeoLocale } from "@/lib/seo";
import {
  getServiceCategorySeoContent,
  getServicesHubSeoContent,
} from "@/lib/seo-content";

type PublicServicesHubProps = {
  locale: SeoLocale;
};

export function PublicServicesHub({ locale }: PublicServicesHubProps) {
  const content = getServicesHubSeoContent(locale);

  return (
    <div className="bg-brand-surface text-brand-ink">
      <section className="border-b border-brand-border bg-[linear-gradient(180deg,#f7fbf8_0%,#f2f7f4_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <p className="type-eyebrow text-brand-olive">
              {content.eyebrow}
            </p>
            <h1 className="type-section-title mt-4 text-brand-primary">
              {content.title}
            </h1>
            <p className="type-body-lead mt-6 text-brand-secondary sm:text-lg">
              {content.intro}
            </p>
            <p className="type-body-lead mt-4 text-brand-secondary sm:text-lg">
              {content.summary}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PUBLIC_SERVICE_CATEGORIES.map((category) => {
            const seoContent = getServiceCategorySeoContent(
              category.slug as PublicServiceCategorySlug,
              locale,
            );

            return (
              <Link
                key={category.slug}
                href={`/${locale}/services/${category.slug}`}
                className="group rounded-[1.8rem] border border-[#dbe6e0] bg-white p-6 shadow-[0_28px_70px_-58px_rgba(16,77,73,0.22)] transition hover:-translate-y-1 hover:shadow-[0_32px_85px_-52px_rgba(16,77,73,0.3)]"
              >
                <p className="type-eyebrow text-brand-olive">
                  Curevie
                </p>
                <h2 className="type-card-title mt-3 text-brand-primary">
                  {seoContent.shortName}
                </h2>
                <p className="mt-4 text-sm leading-7 text-brand-secondary">
                  {seoContent.paragraphs[0]}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#45615a]">
                  {seoContent.benefits.slice(0, 2).map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex text-sm font-semibold text-brand-primary">
                  {locale === "ar" ? "افتح الصفحة" : "Open page"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[#dce8e2] bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h2 className="type-section-title text-brand-primary">{content.faqTitle}</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {content.faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-[1.6rem] border border-[#dbe6e0] bg-[#f9fcfa] p-6"
              >
                <h3 className="type-card-title text-brand-primary">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-secondary">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
