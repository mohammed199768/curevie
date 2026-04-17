import {
  SUPPORT_EMAIL_HREF,
  SUPPORT_INSTAGRAM_URL,
  SUPPORT_LOCATION_LABEL,
  SUPPORT_LOCATION_MAP_URL,
  SUPPORT_PHONE_E164,
  SUPPORT_PHONE_LOCAL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/contact";
import {
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";
import {
  buildAbsoluteUrl,
  buildLocalizedPath,
  getServicePageSeo,
  SITE_URL,
  type SeoLocale,
} from "@/lib/seo";

export type FaqItem = {
  question: string;
  answer: string;
};

export type HomeSeoContent = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  faqTitle: string;
  faqIntro: string;
  faqItems: FaqItem[];
};

export type ServicesHubContent = {
  eyebrow: string;
  title: string;
  intro: string;
  summary: string;
  faqTitle: string;
  faqItems: FaqItem[];
};

export type ServiceCategorySeoContent = {
  shortName: string;
  introTitle: string;
  paragraphs: string[];
  benefits: string[];
  faqTitle: string;
  faqItems: FaqItem[];
  relatedSlugs: PublicServiceCategorySlug[];
};

const ORGANIZATION_NAME: Record<SeoLocale, string> = {
  en: "Curevie",
  ar: "كيورفي",
};

const HOME_CONTENT: Record<SeoLocale, HomeSeoContent> = {
  en: {
    eyebrow: "Search-focused medical coverage",
    title: "Home healthcare pages built for real medical search intent in Jordan",
    paragraphs: [
      "Curevie helps patients in Jordan book home doctor visits, home nursing, home lab tests, portable imaging, and coordinated care programs through a single medical platform.",
      "This page is optimized around the terms patients actually search for in English and Arabic, including home healthcare, nursing at home, home lab, lab tests at home, radiology at home, X-ray at home, and medical services delivered at home in Amman and across Jordan.",
    ],
    faqTitle: "Frequently searched questions",
    faqIntro:
      "These answers reinforce the core topics Google expects around home healthcare, nursing, laboratory diagnostics, and imaging in Jordan.",
    faqItems: [
      {
        question: "What home healthcare services does Curevie provide in Jordan?",
        answer:
          "Curevie coordinates doctor home visits, home nursing, laboratory diagnostics, imaging support, rehabilitation-related services, and integrated home care programs for patients in Jordan.",
      },
      {
        question: "Can patients request lab tests and imaging at home through Curevie?",
        answer:
          "Yes. Patients can browse lab diagnostics and imaging-related service pages, review available options, and submit a guided home-care request through the patient-facing Curevie experience.",
      },
      {
        question: "Does Curevie serve patients searching in Arabic and English?",
        answer:
          "Yes. The public patient experience is available in both Arabic and English with localized service pages, metadata, internal links, and structured information for search engines.",
      },
    ],
  },
  ar: {
    eyebrow: "تغطية طبية مهيأة للبحث",
    title: "صفحات الرعاية المنزلية مهيأة لنية البحث الطبية الحقيقية في الأردن",
    paragraphs: [
      "تساعد كيورفي المرضى في الأردن على طلب زيارة طبيب منزلية، والتمريض المنزلي، والتحاليل المنزلية، وخدمات الأشعة المنزلية، وبرامج الرعاية المنسقة عبر منصة طبية واحدة.",
      "تمت تهيئة هذه الصفحة للكلمات التي يبحث عنها المرضى فعلًا بالعربي والإنجليزي مثل الرعاية المنزلية، التمريض المنزلي، المختبر المنزلي، التحاليل المنزلية، الأشعة المنزلية، الأشعة السينية المنزلية، والخدمات الطبية المنزلية في عمان ومختلف مناطق الأردن.",
    ],
    faqTitle: "أسئلة يبحث عنها المرضى كثيرًا",
    faqIntro:
      "هذه الإجابات تعزز الموضوعات الأساسية التي تتوقعها جوجل حول الرعاية الصحية المنزلية والتمريض والمختبر والأشعة داخل الأردن.",
    faqItems: [
      {
        question: "ما الخدمات الطبية المنزلية التي تقدمها كيورفي في الأردن؟",
        answer:
          "تنظم كيورفي زيارات الأطباء المنزلية، والتمريض المنزلي، وخدمات المختبر، وخدمات الأشعة، وبعض مسارات التأهيل، وبرامج الرعاية المنزلية المتكاملة للمرضى داخل الأردن.",
      },
      {
        question: "هل يمكن طلب التحاليل أو الأشعة المنزلية عبر كيورفي؟",
        answer:
          "نعم. يمكن للمريض تصفح صفحات خدمات المختبر والأشعة، ومراجعة الخيارات المتاحة، ثم إرسال طلب رعاية منزلية موجه من خلال واجهة المريض في كيورفي.",
      },
      {
        question: "هل تدعم كيورفي البحث بالعربي والإنجليزي؟",
        answer:
          "نعم. تجربة المريض العامة متاحة بالعربية والإنجليزية مع صفحات خدمات مترجمة وروابط داخلية وبيانات منظمة تساعد محركات البحث على فهم كل مسار علاجي.",
      },
    ],
  },
};

const SERVICES_HUB_CONTENT: Record<SeoLocale, ServicesHubContent> = {
  en: {
    eyebrow: "Medical service index",
    title: "Browse home healthcare, nursing, laboratory, imaging, and care-program pages",
    intro:
      "This hub organizes the main Curevie service categories for patients searching for home medical care in Jordan, whether they are looking for doctor visits, nursing, lab tests, radiology, rehabilitation, or coordinated care programs.",
    summary:
      "Each category below links to an indexable page with localized metadata, structured data, internal links, and patient-facing service discovery designed for Google Search and real patient needs.",
    faqTitle: "Services SEO FAQ",
    faqItems: [
      {
        question: "What can patients find on the Curevie services page?",
        answer:
          "Patients can explore home doctor visits, home nursing, physical therapy, occupational therapy, lab diagnostics, imaging services, and coordinated care programs from one public medical directory.",
      },
      {
        question: "Why is the services page important for SEO?",
        answer:
          "A dedicated services hub helps search engines crawl all major medical categories from one place, understand topical relevance, and follow stronger internal links toward the detailed service pages.",
      },
    ],
  },
  ar: {
    eyebrow: "فهرس الخدمات الطبية",
    title: "تصفح صفحات الرعاية المنزلية والتمريض والمختبر والأشعة وبرامج الرعاية",
    intro:
      "ينظم هذا الدليل العام فئات خدمات كيورفي الأساسية للمرضى الذين يبحثون عن رعاية طبية منزلية في الأردن، سواء كانوا يبحثون عن طبيب منزلي أو تمريض أو تحاليل أو أشعة أو تأهيل أو برامج رعاية منسقة.",
    summary:
      "كل فئة أدناه تقود إلى صفحة قابلة للفهرسة تحتوي على بيانات وصفية محلية وبيانات منظمة وروابط داخلية وتجربة استكشاف خدمات موجهة لمحركات البحث واحتياج المريض الحقيقي.",
    faqTitle: "أسئلة شائعة حول صفحة الخدمات",
    faqItems: [
      {
        question: "ماذا يجد المريض في صفحة خدمات كيورفي؟",
        answer:
          "يستطيع المريض استعراض زيارات الأطباء المنزلية، والتمريض المنزلي، والعلاج الطبيعي، والعلاج الوظيفي، وخدمات المختبر، وخدمات الأشعة، وبرامج الرعاية المنسقة من دليل طبي عام واحد.",
      },
      {
        question: "لماذا تعتبر صفحة الخدمات مهمة في تحسين SEO؟",
        answer:
          "لأن وجود صفحة خدمات رئيسية يساعد محركات البحث على الزحف إلى الفئات الطبية الأساسية من مكان واحد، وفهم الموضوعات التي يغطيها الموقع، وتتبع روابط داخلية أقوى نحو صفحات الخدمات التفصيلية.",
      },
    ],
  },
};

const SERVICE_CONTENT: Record<
  PublicServiceCategorySlug,
  Record<SeoLocale, ServiceCategorySeoContent>
> = {
  "medical-visits": {
    en: {
      shortName: "Home Doctor Visits",
      introTitle: "Doctor home visits in Jordan with a clearer patient path",
      paragraphs: [
        "The medical visits page targets patients searching for doctor at home, home physician visits, pediatric home visits, internal medicine home visits, and bedside clinical evaluation in Jordan.",
        "Curevie connects the patient-facing search experience to a guided request flow so that users looking for home doctor support in Amman or across Jordan can move from search intent to coordinated care without a generic intake process.",
      ],
      benefits: [
        "Targets doctor at home and home visit keywords in Arabic and English",
        "Supports patients seeking bedside assessment without clinic travel",
        "Links directly into a structured medical request flow",
      ],
      faqTitle: "Home doctor visit questions",
      faqItems: [
        {
          question: "Can I request a doctor home visit through Curevie?",
          answer:
            "Yes. Patients can open the medical visits page, review the available care options, and submit a guided request for home medical support through Curevie.",
        },
        {
          question: "Who is this page built for?",
          answer:
            "It is built for patients and families searching for doctor home visits, pediatric support, internal medicine follow-up, and coordinated bedside medical care in Jordan.",
        },
      ],
      relatedSlugs: ["home-nursing", "lab-diagnostics", "care-programs"],
    },
    ar: {
      shortName: "زيارات الطبيب المنزلية",
      introTitle: "زيارات طبيب منزلية في الأردن بمسار أوضح للمريض",
      paragraphs: [
        "تستهدف صفحة الزيارات الطبية المرضى الذين يبحثون عن طبيب منزلي أو زيارة طبيب منزلية أو طبيب أطفال منزلي أو طبيب باطنية منزلي أو تقييم طبي بجانب السرير داخل الأردن.",
        "تربط كيورفي تجربة البحث العامة بمسار طلب منظم حتى يتمكن المستخدم الذي يبحث عن طبيب منزلي في عمان أو في مختلف مناطق الأردن من الانتقال من نية البحث إلى رعاية منسقة دون نموذج عام مشتت.",
      ],
      benefits: [
        "تستهدف كلمات الطبيب المنزلي وزيارات الطبيب بالعربي والإنجليزي",
        "تخدم المرضى الذين يحتاجون تقييمًا طبيًا دون الذهاب إلى العيادة",
        "تنقل المستخدم مباشرة إلى مسار طلب طبي منظم",
      ],
      faqTitle: "أسئلة شائعة حول الطبيب المنزلي",
      faqItems: [
        {
          question: "هل يمكن طلب زيارة طبيب منزلية عبر كيورفي؟",
          answer:
            "نعم. يستطيع المريض فتح صفحة الزيارات الطبية، ومراجعة الخيارات المتاحة، ثم إرسال طلب موجه للحصول على دعم طبي منزلي عبر كيورفي.",
        },
        {
          question: "لمن صممت هذه الصفحة؟",
          answer:
            "صممت للمرضى والعائلات الذين يبحثون عن طبيب منزلي أو متابعة أطفال أو متابعة باطنية أو رعاية طبية منزلية منظمة في الأردن.",
        },
      ],
      relatedSlugs: ["home-nursing", "lab-diagnostics", "care-programs"],
    },
  },
  "home-nursing": {
    en: {
      shortName: "Home Nursing",
      introTitle: "Professional nursing at home for ongoing clinical support",
      paragraphs: [
        "This page supports searches around home nursing, bedside nursing, wound dressing at home, injections at home, and ongoing nursing follow-up in Jordan.",
        "It is designed to capture nursing-related search demand while giving patients a direct, structured way to request home nursing through Curevie.",
      ],
      benefits: [
        "Matches home nursing and bedside care intent",
        "Supports follow-up care, wound care, and nursing interventions",
        "Keeps patients inside a guided request journey",
      ],
      faqTitle: "Home nursing questions",
      faqItems: [
        {
          question: "Does Curevie offer home nursing in Jordan?",
          answer:
            "Yes. Curevie provides a dedicated home nursing page where patients can review services and begin a guided request for professional nursing care at home.",
        },
        {
          question: "What kinds of needs does home nursing cover?",
          answer:
            "Common examples include injections, wound dressing, bedside monitoring, and ongoing nursing support coordinated through the Curevie platform.",
        },
      ],
      relatedSlugs: ["medical-visits", "physical-therapy", "care-programs"],
    },
    ar: {
      shortName: "التمريض المنزلي",
      introTitle: "تمريض منزلي احترافي للدعم السريري المستمر",
      paragraphs: [
        "تدعم هذه الصفحة عمليات البحث حول التمريض المنزلي، والتمريض بجانب السرير، وتضميد الجروح في المنزل، والحقن المنزلية، والمتابعة التمريضية المستمرة داخل الأردن.",
        "تم تصميمها لالتقاط نية البحث المرتبطة بالتمريض، مع منح المريض طريقة واضحة ومنظمة لطلب التمريض المنزلي عبر كيورفي.",
      ],
      benefits: [
        "تطابق نية البحث الخاصة بالتمريض المنزلي والرعاية بجانب السرير",
        "تخدم احتياجات الحقن وتضميد الجروح والمتابعة التمريضية",
        "تبقي المريض داخل رحلة طلب موجهة وواضحة",
      ],
      faqTitle: "أسئلة شائعة حول التمريض المنزلي",
      faqItems: [
        {
          question: "هل توفر كيورفي خدمة التمريض المنزلي في الأردن؟",
          answer:
            "نعم. توفر كيورفي صفحة مخصصة للتمريض المنزلي تتيح للمريض مراجعة الخدمات وبدء طلب موجه للحصول على رعاية تمريضية احترافية في المنزل.",
        },
        {
          question: "ما نوع الاحتياجات التي يغطيها التمريض المنزلي؟",
          answer:
            "من الأمثلة الشائعة الحقن، وتضميد الجروح، والمتابعة بجانب السرير، والدعم التمريضي المستمر الذي يتم تنسيقه عبر منصة كيورفي.",
        },
      ],
      relatedSlugs: ["medical-visits", "physical-therapy", "care-programs"],
    },
  },
  "physical-therapy": {
    en: {
      shortName: "Physical Therapy at Home",
      introTitle: "Physical therapy sessions built for home recovery",
      paragraphs: [
        "This page is aligned with searches for physical therapy at home, physiotherapy at home, rehabilitation at home, mobility recovery, and home recovery support in Jordan.",
        "Patients who need rehabilitation after injury, surgery, or reduced mobility can use this page to discover relevant services and enter the correct request flow.",
      ],
      benefits: [
        "Targets home physiotherapy and rehabilitation keywords",
        "Supports mobility recovery inside the home environment",
        "Improves topical depth beyond general medical care terms",
      ],
      faqTitle: "Physical therapy questions",
      faqItems: [
        {
          question: "Can I book physical therapy at home?",
          answer:
            "Yes. The physical therapy page is designed for patients who want to explore rehabilitation-related services and submit a coordinated home-care request.",
        },
        {
          question: "Why is a dedicated therapy page useful?",
          answer:
            "It helps patients searching for physiotherapy or rehabilitation land on a page that directly matches their intent instead of a broad medical page.",
        },
      ],
      relatedSlugs: ["occupational-therapy", "home-nursing", "care-programs"],
    },
    ar: {
      shortName: "العلاج الطبيعي المنزلي",
      introTitle: "جلسات علاج طبيعي مهيأة للتعافي داخل المنزل",
      paragraphs: [
        "تتوافق هذه الصفحة مع عمليات البحث عن العلاج الطبيعي المنزلي، والفيزيوثيرابي المنزلي، والتأهيل المنزلي، واستعادة الحركة، ودعم التعافي داخل الأردن.",
        "يستطيع المرضى الذين يحتاجون إلى إعادة تأهيل بعد إصابة أو جراحة أو ضعف في الحركة استخدام هذه الصفحة لاكتشاف الخدمات المناسبة والدخول إلى مسار الطلب الصحيح.",
      ],
      benefits: [
        "تستهدف كلمات العلاج الطبيعي والتأهيل المنزلي",
        "تدعم استعادة الحركة داخل البيئة المنزلية",
        "توسع العمق الموضوعي للموقع خارج المصطلحات الطبية العامة",
      ],
      faqTitle: "أسئلة شائعة حول العلاج الطبيعي",
      faqItems: [
        {
          question: "هل يمكن حجز علاج طبيعي منزلي؟",
          answer:
            "نعم. صممت صفحة العلاج الطبيعي للمرضى الذين يريدون استعراض خدمات التأهيل وإرسال طلب رعاية منزلية منسق.",
        },
        {
          question: "لماذا تفيد صفحة علاج طبيعي مخصصة في SEO؟",
          answer:
            "لأنها تجعل المريض الذي يبحث عن علاج طبيعي أو تأهيل يصل إلى صفحة تطابق نيته مباشرة بدل الهبوط على صفحة طبية عامة.",
        },
      ],
      relatedSlugs: ["occupational-therapy", "home-nursing", "care-programs"],
    },
  },
  "occupational-therapy": {
    en: {
      shortName: "Occupational Therapy at Home",
      introTitle: "Occupational therapy focused on daily independence at home",
      paragraphs: [
        "This page targets occupational therapy at home, functional therapy, daily living support, and independence-focused rehabilitation queries in Jordan.",
        "It helps Curevie build stronger coverage around therapy-related search terms while giving patients a page that explains the purpose of home occupational therapy clearly.",
      ],
      benefits: [
        "Targets occupational and functional therapy keywords",
        "Supports daily activity and independence-related intent",
        "Creates stronger topical breadth across rehabilitation topics",
      ],
      faqTitle: "Occupational therapy questions",
      faqItems: [
        {
          question: "Who should use the occupational therapy page?",
          answer:
            "Patients and families looking for support with daily function, routine independence, and structured occupational therapy at home can use this page as their starting point.",
        },
        {
          question: "How does this page help search visibility?",
          answer:
            "It gives search engines a specific URL and content cluster for occupational therapy instead of burying the topic under broader home-care pages.",
        },
      ],
      relatedSlugs: ["physical-therapy", "home-nursing", "care-programs"],
    },
    ar: {
      shortName: "العلاج الوظيفي المنزلي",
      introTitle: "علاج وظيفي يركز على الاستقلالية اليومية داخل المنزل",
      paragraphs: [
        "تستهدف هذه الصفحة عمليات البحث عن العلاج الوظيفي المنزلي، والعلاج الوظيفي، ودعم الأنشطة اليومية، والتأهيل المرتبط بالاستقلالية داخل الأردن.",
        "كما تساعد كيورفي على بناء تغطية أقوى لمصطلحات العلاج والتأهيل، مع منح المريض صفحة تشرح هدف العلاج الوظيفي المنزلي بشكل واضح.",
      ],
      benefits: [
        "تستهدف كلمات العلاج الوظيفي والدعم الوظيفي اليومي",
        "تخدم نية البحث المرتبطة بالاستقلالية والأنشطة اليومية",
        "تبني اتساعًا موضوعيًا أقوى في مجال التأهيل المنزلي",
      ],
      faqTitle: "أسئلة شائعة حول العلاج الوظيفي",
      faqItems: [
        {
          question: "من الذي يستفيد من صفحة العلاج الوظيفي؟",
          answer:
            "يستفيد منها المرضى والعائلات الذين يبحثون عن دعم للوظائف اليومية والاستقلالية والعودة إلى الروتين الطبيعي من خلال علاج وظيفي منزلي منظم.",
        },
        {
          question: "كيف تساعد هذه الصفحة في الظهور على محركات البحث؟",
          answer:
            "لأنها تمنح محركات البحث رابطًا ومحتوى مخصصًا للعلاج الوظيفي بدل دفن هذا الموضوع داخل صفحات الرعاية العامة.",
        },
      ],
      relatedSlugs: ["physical-therapy", "home-nursing", "care-programs"],
    },
  },
  imaging: {
    en: {
      shortName: "Home Imaging and Radiology",
      introTitle: "Portable imaging and radiology pages aligned with home diagnostics searches",
      paragraphs: [
        "The imaging page is built for searches such as home imaging, portable radiology, radiology at home, X-ray at home, and diagnostic imaging in Jordan.",
        "By giving imaging its own category page, Curevie can compete more directly on medical imaging intent instead of forcing radiology searches into a generic medical-services experience.",
      ],
      benefits: [
        "Targets radiology, imaging, and X-ray terms",
        "Supports patients seeking diagnostics without travel",
        "Strengthens topical coverage around home medical diagnostics",
      ],
      faqTitle: "Imaging questions",
      faqItems: [
        {
          question: "Does Curevie have a page for home imaging and radiology?",
          answer:
            "Yes. Patients can browse the imaging page to review available options and start a guided home-care request for radiology-related support.",
        },
        {
          question: "Why mention X-ray and imaging terms directly?",
          answer:
            "Because patients often search using very specific diagnostic words such as radiology, imaging, and X-ray, and those terms should be represented clearly on the page.",
        },
      ],
      relatedSlugs: ["lab-diagnostics", "medical-visits", "care-programs"],
    },
    ar: {
      shortName: "الأشعة والتصوير المنزلي",
      introTitle: "صفحات الأشعة والتصوير المتنقل المتوافقة مع بحث التشخيص المنزلي",
      paragraphs: [
        "تم بناء صفحة الأشعة لاستهداف عمليات البحث مثل الأشعة المنزلية، والتصوير المتنقل، والأشعة في المنزل، والأشعة السينية المنزلية، والتصوير التشخيصي في الأردن.",
        "ومن خلال منح الأشعة صفحة فئة مستقلة، تستطيع كيورفي المنافسة مباشرة على نية البحث المرتبطة بالتصوير الطبي بدل دفع هذه الزيارات إلى تجربة خدمات طبية عامة.",
      ],
      benefits: [
        "تستهدف مصطلحات الأشعة والتصوير والأشعة السينية",
        "تخدم المرضى الذين يحتاجون تشخيصًا دون عناء التنقل",
        "تعزز التغطية الموضوعية حول التشخيص الطبي المنزلي",
      ],
      faqTitle: "أسئلة شائعة حول الأشعة",
      faqItems: [
        {
          question: "هل لدى كيورفي صفحة مخصصة للأشعة المنزلية؟",
          answer:
            "نعم. يستطيع المرضى تصفح صفحة الأشعة لمراجعة الخيارات المتاحة ثم بدء طلب رعاية منزلية موجه لخدمات التصوير أو الأشعة.",
        },
        {
          question: "لماذا يجب ذكر كلمات الأشعة وX-ray بوضوح؟",
          answer:
            "لأن المرضى كثيرًا ما يبحثون بمصطلحات تشخيصية دقيقة مثل الأشعة وX-ray والتصوير، ومن المهم أن تظهر هذه الكلمات بوضوح على الصفحة.",
        },
      ],
      relatedSlugs: ["lab-diagnostics", "medical-visits", "care-programs"],
    },
  },
  "lab-diagnostics": {
    en: {
      shortName: "Home Lab Tests and Diagnostics",
      introTitle: "Laboratory diagnostics pages tuned for home lab demand",
      paragraphs: [
        "The lab diagnostics page is aligned with searches such as home lab, lab tests at home, blood tests at home, sample collection at home, and diagnostic laboratory services in Jordan.",
        "This page helps Curevie compete on both broad laboratory keywords and more specific test-related terms by connecting service discovery with a structured request path.",
      ],
      benefits: [
        "Targets home lab, lab test, and sample collection queries",
        "Supports patients looking for diagnostics from home",
        "Connects catalog browsing to a booking-oriented request flow",
      ],
      faqTitle: "Laboratory questions",
      faqItems: [
        {
          question: "Can patients request lab diagnostics from home?",
          answer:
            "Yes. Curevie provides a public lab diagnostics page where patients can review available options and initiate a guided request for laboratory support at home.",
        },
        {
          question: "Does this page help for search terms like blood test at home?",
          answer:
            "Yes. The page is structured to cover broad home laboratory demand, including lab tests, blood tests, and home sample collection queries.",
        },
      ],
      relatedSlugs: ["imaging", "medical-visits", "care-programs"],
    },
    ar: {
      shortName: "تحاليل ومختبر منزلي",
      introTitle: "صفحات مختبر وتحاليل مهيأة لطلب المختبر المنزلي",
      paragraphs: [
        "تتوافق صفحة تشخيصات المختبر مع عمليات البحث مثل المختبر المنزلي، والتحاليل المنزلية، وتحاليل الدم في المنزل، وسحب العينات المنزلية، وخدمات المختبر التشخيصي في الأردن.",
        "وتساعد هذه الصفحة كيورفي على المنافسة في الكلمات العامة الخاصة بالمختبر وكذلك المصطلحات الدقيقة المتعلقة بالفحوصات، عبر ربط استكشاف الخدمة بمسار طلب منظم.",
      ],
      benefits: [
        "تستهدف كلمات المختبر المنزلي والتحاليل وسحب العينات",
        "تخدم المرضى الذين يريدون تشخيصًا من المنزل",
        "تربط التصفح داخل الدليل بمسار طلب قابل للتنفيذ",
      ],
      faqTitle: "أسئلة شائعة حول المختبر",
      faqItems: [
        {
          question: "هل يمكن للمريض طلب التحاليل المنزلية عبر كيورفي؟",
          answer:
            "نعم. توفر كيورفي صفحة عامة للمختبر تتيح للمريض مراجعة الخيارات المتاحة وبدء طلب موجه للحصول على دعم مختبري من المنزل.",
        },
        {
          question: "هل تساعد هذه الصفحة في كلمات مثل تحليل دم منزلي؟",
          answer:
            "نعم. تم تنظيم الصفحة لتغطي الطلب العام على المختبر المنزلي، بما يشمل التحاليل وتحاليل الدم وسحب العينات من المنزل.",
        },
      ],
      relatedSlugs: ["imaging", "medical-visits", "care-programs"],
    },
  },
  "care-programs": {
    en: {
      shortName: "Integrated Home Care Programs",
      introTitle: "Coordinated home care programs for complex patient journeys",
      paragraphs: [
        "The care programs page supports searches around home care programs, integrated care, long-term home care coordination, and bundled medical support in Jordan.",
        "It gives Curevie a stronger page for complex-care intent where patients are not searching for a single isolated service, but for a managed and coordinated medical journey at home.",
      ],
      benefits: [
        "Targets broader integrated-care and home care program intent",
        "Supports longer and more complex patient journeys",
        "Improves internal linking across multiple service lines",
      ],
      faqTitle: "Care program questions",
      faqItems: [
        {
          question: "What is a care program on Curevie?",
          answer:
            "A care program combines multiple services under one coordinated patient journey, helping families manage more complex needs through a unified path.",
        },
        {
          question: "Why is this page different from a single service page?",
          answer:
            "Because some patients are searching for coordinated care rather than one isolated appointment, and this page is designed to match that broader intent.",
        },
      ],
      relatedSlugs: ["medical-visits", "home-nursing", "lab-diagnostics"],
    },
    ar: {
      shortName: "برامج الرعاية المنزلية المتكاملة",
      introTitle: "برامج رعاية منزلية منسقة للحالات العلاجية الأكثر تعقيدًا",
      paragraphs: [
        "تدعم صفحة برامج الرعاية عمليات البحث حول برامج الرعاية المنزلية، والرعاية المتكاملة، وتنسيق الرعاية طويلة المدى، والدعم الطبي المجمّع داخل الأردن.",
        "كما تمنح كيورفي صفحة أقوى لنية البحث المرتبطة بالرعاية المعقدة، حين لا يبحث المريض عن خدمة واحدة منفصلة بل عن رحلة طبية منزلية مدارة ومنسقة.",
      ],
      benefits: [
        "تستهدف نية البحث الأوسع المرتبطة بالرعاية المتكاملة",
        "تخدم رحلات المرضى الأطول والأكثر تعقيدًا",
        "تعزز الربط الداخلي بين عدة مسارات خدمية",
      ],
      faqTitle: "أسئلة شائعة حول برامج الرعاية",
      faqItems: [
        {
          question: "ما المقصود ببرنامج الرعاية في كيورفي؟",
          answer:
            "برنامج الرعاية يجمع عدة خدمات ضمن رحلة مريض واحدة ومنسقة، ما يساعد العائلات على إدارة الاحتياجات المعقدة من خلال مسار موحد.",
        },
        {
          question: "لماذا تختلف هذه الصفحة عن صفحة خدمة واحدة؟",
          answer:
            "لأن بعض المرضى يبحثون عن رعاية منسقة وليس مجرد موعد منفرد، وقد صممت هذه الصفحة لتطابق هذه النية الأوسع في البحث.",
        },
      ],
      relatedSlugs: ["medical-visits", "home-nursing", "lab-diagnostics"],
    },
  },
};

export function getOrganizationName(locale: SeoLocale) {
  return ORGANIZATION_NAME[locale];
}

export function getHomeSeoContent(locale: SeoLocale) {
  return HOME_CONTENT[locale];
}

export function getServicesHubSeoContent(locale: SeoLocale) {
  return SERVICES_HUB_CONTENT[locale];
}

export function getServiceCategorySeoContent(
  slug: PublicServiceCategorySlug,
  locale: SeoLocale,
) {
  return SERVICE_CONTENT[slug][locale];
}

export function buildOrganizationSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: getOrganizationName(locale),
    alternateName:
      locale === "ar"
        ? ["Curevie", "كيورفاي", "كيوريفاي"]
        : ["كيورفي", "Curevie Jordan"],
    url: SITE_URL,
    logo: buildAbsoluteUrl("/icon.png"),
    image: buildAbsoluteUrl("/3.png"),
    email: SUPPORT_EMAIL_HREF,
    telephone: SUPPORT_PHONE_LOCAL,
    sameAs: [SUPPORT_INSTAGRAM_URL, SUPPORT_WHATSAPP_URL],
    areaServed: {
      "@type": "Country",
      name: "Jordan",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: SUPPORT_LOCATION_LABEL,
      addressCountry: "JO",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: locale === "ar" ? "دعم المرضى" : "patient support",
        email: SUPPORT_EMAIL_HREF,
        telephone: SUPPORT_PHONE_E164,
        areaServed: "JO",
        availableLanguage: ["ar", "en"],
      },
    ],
  };
}

export function buildWebSiteSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: getOrganizationName(locale),
    publisher: {
      "@id": `${SITE_URL}#organization`,
    },
    inLanguage: locale,
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFaqSchema(faqItems: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildServicesItemListSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: PUBLIC_SERVICE_CATEGORIES.map((category, index) => {
      const content = getServiceCategorySeoContent(category.slug, locale);
      const url = buildAbsoluteUrl(buildLocalizedPath(locale, `/services/${category.slug}`));

      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        name: content.shortName,
        description: content.paragraphs[0],
      };
    }),
  };
}

export function buildContactPageSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: locale === "ar" ? "تواصل مع كيورفي" : "Contact Curevie",
    url: buildAbsoluteUrl(buildLocalizedPath(locale, "/contact")),
    mainEntity: {
      "@id": `${SITE_URL}#organization`,
    },
  };
}

export function buildAboutPageSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: locale === "ar" ? "عن كيورفي" : "About Curevie",
    url: buildAbsoluteUrl(buildLocalizedPath(locale, "/about")),
    about: {
      "@id": `${SITE_URL}#organization`,
    },
  };
}

export function buildServiceSchema(
  slug: PublicServiceCategorySlug,
  locale: SeoLocale,
) {
  const content = getServiceCategorySeoContent(slug, locale);
  const seo = getServicePageSeo(slug, locale);
  const serviceUrl = buildAbsoluteUrl(buildLocalizedPath(locale, `/services/${slug}`));

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: content.shortName,
    description: seo.description,
    serviceType: content.shortName,
    areaServed: {
      "@type": "Country",
      name: "Jordan",
    },
    provider: {
      "@id": `${SITE_URL}#organization`,
    },
    url: serviceUrl,
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl,
      availableLanguage: ["ar", "en"],
    },
  };
}

export function buildServicesHubSchema(locale: SeoLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name:
      locale === "ar"
        ? "خدمات كيورفي الطبية المنزلية"
        : "Curevie Home Healthcare Services",
    url: buildAbsoluteUrl(buildLocalizedPath(locale, "/services")),
    about: {
      "@id": `${SITE_URL}#organization`,
    },
  };
}

export function buildLocationMapSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: SUPPORT_LOCATION_LABEL,
    url: SUPPORT_LOCATION_MAP_URL,
  };
}
