import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cairo, cormorantGaramond, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curevie Patient Portal",
  description: "Curevie medical home-services platform for patients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} ${cormorantGaramond.variable}`}>
        {children}
      </body>
    </html>
  );
}

