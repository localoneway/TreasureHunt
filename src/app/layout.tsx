import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "TreasureHunt — Vintage Watch Tracker",
  description: "Track vintage watch listings, watchlists, and price history.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f9f9f7] text-[#0b0b0b] dark:bg-[#0d0d0d] dark:text-[#ffffff]">
        <Nav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
