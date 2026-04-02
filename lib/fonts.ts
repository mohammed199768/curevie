import { Cairo, Inter, Cormorant_Garamond } from "next/font/google";

export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
  variable: "--font-cairo",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-cormorant",
});
