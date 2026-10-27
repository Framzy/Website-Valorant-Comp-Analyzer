import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { ModeTabs } from "@/components/layout/mode-tabs";
import { SiteFooter } from "@/components/layout/site-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const siteUrl = "https://framzy-valorant-comp-analyzer.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Valorant Agent Comp Analyzer",
  description:
    "Valorant Agent Comp Analyzer untuk analisis komposisi agent dan prediksi performa tim berdasarkan data historis.",
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    title: "Valorant Agent Comp Analyze",
    description:
      "Valorant Agent Comp Analyzer untuk analisis komposisi agent dan prediksi performa tim berdasarkan data historis.",
    url: siteUrl,
    images: ["/favicon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Valorant Agent Comp Analyze",
    description:
      "Valorant Agent Comp Analyzer untuk analisis komposisi agent dan prediksi performa tim berdasarkan data historis.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable + " " + rajdhani.variable}>
      <body>
        <div className="mx-auto flex min-h-screen w-[95vw] max-w-[1400px] flex-col gap-5 px-1 py-5 sm:px-2 md:gap-6 lg:gap-7">
          <SiteHeader />
          <ModeTabs />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
