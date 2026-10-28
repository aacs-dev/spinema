/**
 * TMDB's Romanian data mixes the correct comma-below letters (ș ț) with the legacy
 * cedilla forms (ş ţ). Normalize everything to comma-below.
 */
export function normalizeRo(text: string): string {
  return text.replace(/[şţŞŢ]/g, (ch) => ({ ş: 'ș', ţ: 'ț', Ş: 'Ș', Ţ: 'Ț' })[ch] ?? ch);
}

export function yearOf(date: string | undefined | null): string | null {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? match[1] : null;
}

// Builders for the dictionaries' `format` entries.

/** One decimal in the locale's notation: 7.25 → "7,3" in Romanian, "7.3" in English. */
export function ratingFormatter(locale: string): (rating: number) => string {
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (rating) => format.format(rating);
}

/** Hours and minutes with the given units: 132 → "2 h 12 min", 45 → "45 min", 120 → "2 h". */
export function runtimeFormatter(hour: string, minute: string, glue = ' '): (minutes: number) => string {
  return (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}${glue}${minute}`;
    return m === 0 ? `${h}${glue}${hour}` : `${h}${glue}${hour} ${m}${glue}${minute}`;
  };
}

/** Country names from the browser, in the locale's language: "RO" → "România", "Románia", "Romania". */
export function countryNamer(locale: string): (code: string) => string {
  let names: Intl.DisplayNames | null = null;
  return (code) => {
    try {
      names ??= new Intl.DisplayNames([locale], { type: 'region' });
      return names.of(code) ?? code;
    } catch {
      // A code the browser does not know: show it as it is rather than break the page.
      return code;
    }
  };
}

/** Day, month and year as numbers, in the locale's order: "28.10.2026", "28/10/2026", "2026. 10. 28.". */
export function dateFormatter(locale: string): (ms: number) => string {
  const format = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (ms) => format.format(ms);
}
