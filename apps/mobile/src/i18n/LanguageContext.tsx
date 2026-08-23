import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  domainKey,
  translate,
  type Locale,
  type TranslationKey,
} from "./translations";

const LOCALE_KEY = "@nivaran/locale";

type TFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
  domainLabel: (domain: string) => string;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_KEY);
        if (!cancelled && (stored === "en" || stored === "hi")) {
          setLocaleState(stored);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(LOCALE_KEY, next);
  }, []);

  const t = useCallback<TFunction>(
    (key, params) => translate(locale, key, params),
    [locale],
  );

  const domainLabel = useCallback(
    (domain: string) => {
      const key = domainKey(domain);
      if (key) return t(key);
      return domain
        .toLowerCase()
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    },
    [t],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, domainLabel, ready }),
    [locale, setLocale, t, domainLabel, ready],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
