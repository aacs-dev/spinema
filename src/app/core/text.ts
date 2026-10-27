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

const ratingFormat = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 7.25 → "7,3" (Romanian decimal comma, one decimal). */
export function formatRating(rating: number): string {
  return ratingFormat.format(rating);
}

/** 132 → "2 h 12 min", 45 → "45 min". */
export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const dateFormat = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatDate(ms: number): string {
  return dateFormat.format(ms);
}
