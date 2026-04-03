"use client";

import type { ReactNode } from "react";
import { Cookie } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORT_EMAIL, SUPPORT_PHONE_LOCAL } from "@/lib/contact";

type LegalSection = {
  content: ReactNode;
  title: string;
};

type CookieSubCard = {
  body: string;
  title: string;
};

export function CookiePolicyExperience() {
  const locale = useLocale();
  const t = useTranslations("cookiesPage");
  const isAr = locale === "ar";

  const categoryCards: CookieSubCard[] = isAr
    ? [
        {
          title: "ملفات تعريف الارتباط الضرورية",
          body: "مطلوبة لكي يعمل الموقع بشكل صحيح. تُمكّن تسجيل الدخول الآمن وإدارة الجلسة والميزات الأساسية. لا يمكنك إلغاء الاشتراك فيها لأنها ضرورية للخدمة. أمثلة: رموز التوثيق ومعرفات الجلسة ورموز الأمان.",
        },
        {
          title: "ملفات تعريف الارتباط التحليلية (تتطلب موافقة)",
          body: "ملفات تعريف ارتباط من الطرف الأول تساعدنا على فهم كيفية تفاعل الزوار مع صفحاتنا العامة، وما الخدمات التي يشاهدونها وكيفية تنقلهم. جميع البيانات مجهولة الهوية وتُخزن على خوادمنا الخاصة. تُستخدم فقط لتحسين تجربة الموقع.",
        },
        {
          title: "ملفات تعريف الارتباط التسويقية (تتطلب موافقة)",
          body: "نستخدم Meta Pixel الذي تشغله شركة Meta Platforms, Inc. يساعدنا هذا الملف على فهم كيفية تفاعل الزوار القادمين من إعلانات Meta مع موقعنا، ويتيح لنا تحسين الحملات المستقبلية. قد ينقل Meta Pixel البيانات إلى خوادم Meta خارج الأردن. بقبولك ملفات تعريف الارتباط التسويقية فإنك توافق على هذا النقل وعلى ممارسات Meta المتعلقة بالبيانات.",
        },
      ]
    : [
        {
          title: "Necessary cookies",
          body: "Required for the website to function correctly. They enable secure login, session management, and core features. You cannot opt out as they are essential to the service. Examples: authentication tokens, session identifiers, security tokens.",
        },
        {
          title: "Analytics cookies (requires consent)",
          body: "First-party cookies that help us understand how visitors interact with our public pages — which services they view and how they navigate. All data is anonymized and stored on our own servers. Used only to improve the site experience.",
        },
        {
          title: "Marketing cookies (requires consent)",
          body: "We use Meta Pixel, operated by Meta Platforms, Inc. This cookie helps us understand how visitors from our Meta ads interact with our site and allows us to optimize future campaigns. Meta Pixel may transfer data to Meta servers outside Jordan. By accepting marketing cookies you consent to this transfer and to Meta's data practices.",
        },
      ];

  const sections: LegalSection[] = [
    {
      title: isAr ? "ما هي ملفات تعريف الارتباط" : "What Are Cookies",
      content: (
        <>
          <p>
            {isAr
              ? "ملفات تعريف الارتباط هي ملفات نصية صغيرة تُوضع على جهازك عند زيارة موقع إلكتروني. تساعد الموقع على تذكّر تفضيلاتك والحفاظ على جلسة تسجيل دخولك وفهم كيفية استخدامك له. بعض هذه الملفات ضروري لعمل الموقع وبعضها اختياري يتطلب موافقتك."
              : "Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how you use it. Some cookies are essential for the site to function; others are optional and require your consent."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "كيف نستخدم ملفات تعريف الارتباط" : "How We Use Cookies",
      content: (
        <>
          <p>
            {isAr
              ? "تستخدم كيوري ملفات تعريف الارتباط من أجل: إبقائك مسجّلاً دخولك بأمان خلال جلستك؛ وتذكّر تفضيلات اللغة والعرض؛ وفهم كيفية استخدام الزوار لصفحاتنا العامة (بالموافقة)؛ وقياس فعالية حملاتنا الإعلانية على منصات مثل Meta (بالموافقة)."
              : "Curevie uses cookies to: keep you securely logged in during your session; remember your language and display preferences; understand how visitors use our public pages (with consent); and measure the effectiveness of our advertising campaigns on platforms like Meta (with consent)."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "فئات ملفات تعريف الارتباط" : "Cookie Categories",
      content: (
        <div className="mt-2 space-y-3">
          {categoryCards.map((card, index) => (
            <div key={index} className="space-y-1 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: isAr ? "ملفات تعريف الارتباط الخارجية" : "Third-Party Cookies",
      content: (
        <>
          <p>
            {isAr
              ? "ملف تعريف الارتباط الخارجي الوحيد الذي نستخدمه هو Meta Pixel. ليس لدينا تحكم في سلوك ملفات تعريف الارتباط الخاصة بـ Meta بعد تفعيلها. للمزيد: facebook.com/privacy/policy — لإلغاء الاشتراك في إعلانات Meta: facebook.com/ads/preferences"
              : "The only third-party cookie we use is Meta Pixel. We have no control over Meta's cookie behavior once initialized. Learn more at facebook.com/privacy/policy — opt out of Meta ads at facebook.com/ads/preferences"}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "إدارة تفضيلاتك" : "Managing Your Preferences",
      content: (
        <>
          <p>
            {isAr
              ? "تحكّم في تفضيلات ملفات تعريف الارتباط في أي وقت عبر لافتة الموافقة المتاحة من تذييل كل صفحة عامة. يمكنك قبول الكل أو رفض غير الضروري أو التخصيص لكل فئة. يُحفظ اختيارك ويُراعى في الزيارات المستقبلية. يمكنك أيضاً إدارة ملفات تعريف الارتباط عبر إعدادات متصفحك، وإن كان ذلك قد يؤثر على وظائف الموقع."
              : "Control your cookie preferences at any time using our consent banner, accessible from the footer of every public page. You may accept all, reject non-essential, or customize per category. Your choice is saved and respected on future visits. You may also manage cookies through your browser settings, though this may affect site functionality."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "اتصل بنا" : "Contact Us",
      content: (
        <>
          <p>
            {isAr
              ? `لأسئلة الخصوصية أو طلبات البيانات: البريد الإلكتروني: ${SUPPORT_EMAIL} | الهاتف: ${SUPPORT_PHONE_LOCAL} | العنوان: عمّان، الأردن. سنرد خلال 14 يوم عمل.`
              : `For privacy questions or data requests: Email: ${SUPPORT_EMAIL} | Phone: ${SUPPORT_PHONE_LOCAL} | Address: Amman, Jordan. We will respond within 14 business days.`}
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Cookie className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("lastUpdated")}: {t("lastUpdatedDate")}
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, index) => (
            <section key={index} className="space-y-3 rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">{section.content}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
