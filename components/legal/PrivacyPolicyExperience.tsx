"use client";

import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORT_EMAIL, SUPPORT_PHONE_LOCAL } from "@/lib/contact";

type LegalSection = {
  content: ReactNode;
  title: string;
};

export function PrivacyPolicyExperience() {
  const locale = useLocale();
  const t = useTranslations("privacy");
  const isAr = locale === "ar";

  const sections: LegalSection[] = [
    {
      title: isAr ? "مقدمة" : "Introduction",
      content: (
        <>
          <p>
            {isAr
              ? "كيوري هي منصة أردنية لخدمات الرعاية الصحية المنزلية تربط المرضى بمقدمي رعاية صحية مؤهلين لزيارات طبية منزلية وفحوصات مختبرية وأشعة وخدمات تمريضية. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك الشخصية والطبية واستخدامها وحمايتها. باستخدامك لكيوري فإنك توافق على الممارسات الموضحة هنا."
              : "Curevie is a Jordanian medical home-services platform that connects patients with qualified healthcare providers for home medical visits, laboratory tests, imaging, and nursing services. This Privacy Policy explains how we collect, use, and protect your personal and medical information. By using Curevie you agree to the practices described here."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "المعلومات التي نجمعها" : "Information We Collect",
      content: (
        <>
          <p>
            {isAr
              ? "نجمع المعلومات التي تقدمها مباشرة، بما في ذلك: الاسم الكامل ورقم الهاتف والبريد الإلكتروني وتاريخ الميلاد والجنس والعنوان المنزلي لتقديم الخدمة؛ والمعلومات الطبية كطلبات الخدمة وأوامر الفحوصات وطلبات الأشعة وتقارير مقدمي الرعاية؛ وطرق الدفع (لا نحتفظ بتفاصيل البطاقة كاملة)؛ وللطلبات غير المسجلة: الاسم والهاتف والعنوان ونوع الخدمة. كما نجمع بيانات الاستخدام بموافقتك ومعلومات الجهاز لأغراض أمنية."
              : "We collect information you provide directly, including: full name, phone number, email address, date of birth, gender, and home address for service delivery; medical information such as service requests, lab orders, imaging requests, and provider reports; payment methods (we do not store full card details); and for guest requests, name, phone, address, and service type. We also collect usage data with your consent and device information for security purposes."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "كيف نستخدم معلوماتك" : "How We Use Your Information",
      content: (
        <>
          <p>
            {isAr
              ? "نستخدم معلوماتك لمعالجة طلبات الخدمة الطبية وتنفيذها؛ وتوصيلك بمقدمي رعاية صحية مؤهلين؛ وإرسال التأكيدات والتحديثات والنتائج؛ وإنشاء التقارير الطبية والفواتير بعد إتمام الخدمة؛ وتحسين منصتنا؛ والامتثال للوائح الصحة الأردنية؛ وإرسال إشعارات الخدمة ذات الصلة (يمكنك إلغاء الاشتراك في أي وقت)."
              : "We use your information to process and fulfill medical service requests; connect you with qualified healthcare providers; communicate confirmations, updates, and results; generate medical reports and invoices after completion; improve our platform; comply with Jordanian health regulations; and send relevant service notifications (you may opt out at any time)."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "المعلومات الطبية والسرية" : "Medical Information & Confidentiality",
      content: (
        <>
          <p>
            {isAr
              ? "تُعامَل معلوماتك الطبية بأعلى مستويات السرية. لا تظهر التقارير الطبية ونتائج الفحوصات إلا بعد إتمام الخدمة ونشرها من قِبل فريقنا الطبي. لا يمكن الوصول إلى سجلاتك إلا لمقدمي الرعاية الصحية المعينين وموظفي كيوري المخولين. لا نبيع معلوماتك الطبية ولا نشاركها لأغراض تجارية. تُحتفظ البيانات الطبية للمدة القانونية المطلوبة وفق أنظمة المعلومات الصحية الأردنية."
              : "Your medical information is treated with the highest level of confidentiality. Medical reports and lab results are visible to you only after your service is marked complete and published by our medical team. Only assigned healthcare providers and authorized Curevie staff can access your records. We do not sell or share your medical information for commercial purposes. Medical data is retained for the legally required period under Jordanian health regulations."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "مشاركة المعلومات" : "Information Sharing",
      content: (
        <>
          <p>
            {isAr
              ? "نشارك معلوماتك فقط مع مقدمي الرعاية الصحية المعينين لتنفيذ طلبك؛ ومع معالجي الدفع لإتمام المعاملات؛ وعند الاقتضاء بموجب القانون الأردني أو أمر قضائي أو جهة تنظيمية؛ أو بموافقتك الصريحة. لا نبيع معلوماتك الشخصية لأي طرف ثالث."
              : "We share your information only with assigned healthcare providers to fulfill your service request; with payment processors to complete transactions; when required by Jordanian law, court order, or regulatory authority; or with your explicit consent. We do not sell your personal information to any third party."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "أمان البيانات" : "Data Security",
      content: (
        <>
          <p>
            {isAr
              ? "نطبّق تدابير تقنية وتنظيمية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو الفقدان أو الإفصاح، بما في ذلك تشفير نقل البيانات وضوابط الوصول ومراجعات الأمان الدورية. لا يوجد نقل عبر الإنترنت آمن تماماً؛ يُرجى حماية بيانات اعتماد حسابك."
              : "We implement appropriate technical and organizational measures to protect your information against unauthorized access, loss, or disclosure — including encrypted data transmission, access controls, and regular security reviews. No internet transmission is completely secure; please protect your account credentials."}
          </p>
        </>
      ),
    },
    {
      title: isAr ? "حقوقك" : "Your Rights",
      content: (
        <>
          <p>
            {isAr
              ? "يحق لك الاطلاع على معلوماتك الشخصية لدينا؛ وطلب تصحيح المعلومات غير الدقيقة؛ وطلب حذف حسابك وبياناتك (مع مراعاة متطلبات الاحتفاظ القانونية)؛ وسحب موافقتك على معالجة البيانات غير الضرورية في أي وقت؛ واستلام بياناتك بصيغة قابلة للنقل حيثما أمكن. تواصل معنا لممارسة هذه الحقوق."
              : "You have the right to access the personal information we hold about you; request correction of inaccurate information; request deletion of your account and data (subject to legal retention requirements); withdraw consent for non-essential data processing at any time; and receive your data in a portable format where feasible. Contact us to exercise these rights."}
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
            <ShieldCheck className="h-3.5 w-3.5" />
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
