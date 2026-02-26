"use client";

import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { LocaleProvider, useLocale, type Locale } from "@/i18n/context";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "en", label: "EN" },
];

function NavWithSwitcher() {
  const { t, locale, setLocale } = useLocale();
  return (
    <nav className="mb-8 flex flex-wrap items-center gap-4 text-body">
      <Link href="/" className="text-ink-primary hover:text-accent">
        {t("nav.home")}
      </Link>
      <Link href="/download" className="text-ink-secondary hover:text-accent">
        {t("nav.download")}
      </Link>
      <span className="text-ink-tertiary text-caption">|</span>
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`text-caption px-1.5 py-0.5 rounded ${
            locale === code
              ? "bg-accent text-white"
              : "text-ink-secondary hover:text-accent"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function Inner({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <div className="min-h-screen max-w-7xl mx-auto px-6 py-8">
        <NavWithSwitcher />
        {children}
      </div>
    </LocaleProvider>
  );
}

export function LayoutClient({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Suspense
        fallback={
          <div className="min-h-screen max-w-7xl mx-auto px-6 py-8">
            <nav className="mb-8 flex gap-4 text-body">
              <Link href="/" className="text-ink-primary">Home</Link>
              <Link href="/download" className="text-ink-secondary">Download</Link>
            </nav>
            {children}
          </div>
        }
      >
        <Inner>{children}</Inner>
      </Suspense>
    </ThemeProvider>
  );
}
