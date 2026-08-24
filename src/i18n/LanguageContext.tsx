import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setFormatLocale } from '@/utils/format';
import { es } from './translations/es';
import { en } from './translations/en';
import { pt } from './translations/pt';

/* ─── Tipos ─── */
export type Language = 'es' | 'en' | 'pt';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

export type TranslationDict = typeof es;

const DICTS: Record<Language, TranslationDict> = { es, en, pt };

const STORAGE_KEY = '@beautyapp/language';
const DEFAULT_LANGUAGE: Language = 'es';

/** Locale para formateo de fechas según idioma. */
export const LOCALES: Record<Language, string> = {
  es: 'es-AR',
  en: 'en-US',
  pt: 'pt-BR',
};

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/* ─── Lookup por ruta con puntos: t('auth.login.titulo') ─── */
function resolveKey(dict: TranslationDict, key: string): string | undefined {
  let node: any = dict;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

/* ─── Provider ─── */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'es' || stored === 'en' || stored === 'pt') {
          setLanguageState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  // Mantiene las utilidades de formato (fechas, métodos de pago) en sintonía con el idioma.
  useEffect(() => {
    const dict = DICTS[language];
    setFormatLocale(LOCALES[language], {
      efectivo: dict.comun.metodosPago.efectivo,
      transferencia: dict.comun.metodosPago.transferencia,
      mercado_pago: dict.comun.metodosPago.mercadoPago,
      mixto: dict.comun.metodosPago.mixto,
      sin_registrar: dict.comun.metodosPago.sinRegistrar,
    });
  }, [language]);

  const t = useCallback<TranslateFn>(
    (key, params) => {
      const text = resolveKey(DICTS[language], key) ?? resolveKey(DICTS.es, key) ?? key;
      return interpolate(text, params);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, locale: LOCALES[language], setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/* ─── Hooks ─── */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <LanguageProvider>');
  return ctx;
}

export function useTranslation() {
  const { t, language, locale } = useI18n();
  return { t, language, locale };
}
