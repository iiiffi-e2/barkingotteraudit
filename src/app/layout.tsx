import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Barking Otter — Website Performance Analyzer & Speed Optimization",
    template: "%s | Barking Otter",
  },
  description:
    "Find out how your website performs, what's holding it back, and what Barking Otter can do to make it faster. No technical knowledge required.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://barkingotter.com"
  ),
  openGraph: {
    title: "Barking Otter — Website Performance Analyzer",
    description:
      "Your website could be faster. Let's find out what's slowing it down.",
    siteName: "Barking Otter",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-[#fcfcfb] text-slate-900 font-sans selection:bg-amber-200 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
