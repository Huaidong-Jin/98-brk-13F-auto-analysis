"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import en from "@/i18n/locales/en.json";
import zh from "@/i18n/locales/zh.json";
import ja from "@/i18n/locales/ja.json";

export type Locale = "en" | "zh" | "ja";

const LOCALE_STORAGE_KEY = "brk13f-lang";

function parseLocale(value: string | null): Locale {
  if (value === "zh" || value === "ja" || value === "en") return value;
  if (value?.startsWith("zh")) return "zh";
  if (value?.startsWith("ja")) return "ja";
  return "en";
}

const messages: Record<Locale, Record<string, string>> = { en, zh, ja };

function interpolate(text: string, params: Record<string, string | number>): string {
  let out = text;
  for (const [key, val] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }
  return out;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const defaultLocaleValue: LocaleContextValue = {
  locale: "en",
  setLocale: () => {},
  t: (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    let out = key;
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
    return out;
  },
};

const LocaleContext = createContext<LocaleContextValue>(defaultLocaleValue);

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const urlLang = searchParams.get("lang");
  const [locale, setLocaleState] = useState<Locale>(() =>
    urlLang ? parseLocale(urlLang) : "en"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const fromUrl = urlLang ? parseLocale(urlLang) : null;
    const fromStorage =
      typeof window !== "undefined"
        ? parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
        : "en";
    const next = fromUrl ?? fromStorage ?? "en";
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, [mounted, urlLang]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      }
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("lang", next);
      router.push(`${pathname ?? "/"}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const str = messages[locale][key] ?? messages.en[key] ?? key;
      return params ? interpolate(str, params) : str;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
