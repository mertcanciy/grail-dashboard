import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { SmoothScroll } from "@/components/block/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AutoRefresh } from "@/components/auto-refresh";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  title: { default: "Grail Pulse: live gToken dashboard", template: "%s · Grail Pulse" },
  description:
    "Prices, trading flow, holders and vault backing for every Grail gToken: tokens backed by PSA 10 cards and real-world collectibles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SmoothScroll>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </SmoothScroll>
        <AutoRefresh />
      </body>
    </html>
  );
}
