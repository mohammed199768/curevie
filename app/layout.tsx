import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cairo, cormorantGaramond, inter } from "@/lib/fonts";
import {
  BASE_SEO_KEYWORDS,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  INDEXABLE_ROBOTS,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Curevie",
  title: DEFAULT_SITE_TITLE,
  description: DEFAULT_SITE_DESCRIPTION,
  keywords: [...BASE_SEO_KEYWORDS],
  manifest: "/manifest.json",
  robots: INDEXABLE_ROBOTS,
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d4440" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="كيورفي" />
      </head>
      <body className={`${cairo.variable} ${inter.variable} ${cormorantGaramond.variable}`}>
        {children}
      </body>
    </html>
  );
}

