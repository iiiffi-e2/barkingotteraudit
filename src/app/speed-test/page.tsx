import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyzerHero } from "@/components/AnalyzerHero";

export const metadata: Metadata = {
  title: "Website Speed Test & Performance Analyzer",
  description:
    "Find out what's slowing your website down, what it means for your visitors, and how to make it faster. Free performance analysis with no signup required.",
};

export default function SpeedTestPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AnalyzerHero
          headline="How Fast Is Your Website?"
          subheadline="Find out what's slowing your website down, what it means for your visitors, and how to make it faster."
          source="PUBLIC_WEB"
        />
      </main>
      <SiteFooter />
    </>
  );
}
