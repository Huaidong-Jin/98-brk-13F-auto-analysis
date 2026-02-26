import type { Metadata } from "next";
import { LayoutClient } from "@/components/LayoutClient";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRK 13F Tracker",
  description: "Berkshire Hathaway 13F holdings — track quarterly changes at a glance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
