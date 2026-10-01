import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AutoRefresh } from "@/components/auto-refresh";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz", "wdth"] });


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  twitter: { card: "summary_large_image" },
  title: { default: "Grail Dashboard: live gToken prices, trades and vault", template: "%s · Grail Dashboard" },
  description:
    "Prices, trading flow, holders and vault backing for every Grail gToken: tokens backed by PSA 10 cards and real-world collectibles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <AutoRefresh />
      </body>
    </html>
  );
}
