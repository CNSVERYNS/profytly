import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Profytly — Know your real Shopify profit",
  description:
    "Shopify shows you sales. Profytly shows you what you actually keep after ad spend, cost of goods, and shipping. Live, automatic, no spreadsheets.",
  openGraph: {
    title: "Profytly — Know your real Shopify profit",
    description:
      "See your true net profit, live. No more spreadsheets. Join the early access waitlist.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
