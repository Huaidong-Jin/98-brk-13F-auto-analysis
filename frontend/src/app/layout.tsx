import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen max-w-7xl mx-auto px-6 py-8">
            <nav className="mb-8 flex gap-4 text-body">
              <Link href="/" className="text-ink-primary hover:text-accent">Home</Link>
              <Link href="/download" className="text-ink-secondary hover:text-accent">Download</Link>
            </nav>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
