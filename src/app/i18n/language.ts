export type Language = 'ro' | 'en' | 'hu';
export const LANGUAGES: readonly Language[] = ['ro', 'en', 'hu'];

/** Each language's name in itself, the way language pickers show them. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = { ro: 'Română', en: 'English', hu: 'Magyar' };

/**
 * The language picked in settings; otherwise the first of the browser's languages that Spinema
 * speaks; otherwise Romanian, the primary market.
 */
export function resolveLanguage(chosen: Language | null, browserLanguages: readonly string[]): Language {
  if (chosen) return chosen;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if ((LANGUAGES as readonly string[]).includes(base)) return base as Language;
  }
  return 'ro';
}
