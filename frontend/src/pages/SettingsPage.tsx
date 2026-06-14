import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

/**
 * Settings page — Phase 1 scope: Language Preferences only.
 * Additional settings sections will be added in future phases.
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value as SupportedLanguage;
    i18n.changeLanguage(code);
    // Persistence is handled automatically by i18next-browser-languagedetector
    // (caches to localStorage under mini_erp_language).
    localStorage.setItem("mini_erp_language", code);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-display-sm font-bold text-on-surface">{t("settings.title")}</h1>
      </div>

      {/* Language Preferences section */}
      <section
        className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
        aria-labelledby="lang-section-title"
      >
        {/* Section header */}
        <div className="flex items-center gap-3 border-b border-outline-variant/40 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Languages className="h-5 w-5" />
          </div>
          <h2 id="lang-section-title" className="text-title-md font-semibold text-on-surface">
            {t("settings.languagePreferences")}
          </h2>
        </div>

        {/* Section body */}
        <div className="px-6 py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <label
                htmlFor="language-select"
                className="block text-body-md font-medium text-on-surface"
              >
                {t("settings.language")}
              </label>
              <p className="text-body-sm text-on-surface-variant">
                {t("settings.currentLanguage")}:{" "}
                <span className="font-semibold text-on-surface">
                  {currentLanguage?.label ?? "English"}
                </span>
              </p>
            </div>

            <select
              id="language-select"
              value={i18n.language}
              onChange={handleLanguageChange}
              className="h-10 min-w-[180px] rounded-lg border border-outline-variant bg-surface-container-low px-3 text-body-md text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
