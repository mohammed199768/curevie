import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cairo, cormorantGaramond, inter } from "@/lib/fonts";
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  title: DEFAULT_SITE_TITLE,
  description: DEFAULT_SITE_DESCRIPTION,
  icons: {
    icon: "/1.png",
    apple: "/1.png",
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

