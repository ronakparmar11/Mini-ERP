import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/locales/en.json";
import gu from "@/i18n/locales/gu.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "gu", label: "ગુજરાતી" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "mini_erp_language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      gu: { translation: gu },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "gu"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
