import { Region } from './tmdb.models';

/**
 * Time zones that name a country. A time zone is read locally, needs no permission and works
 * offline; an IP lookup would be fooled by VPNs and office proxies. All of Europe, where the
 * audience and its diaspora live, plus the large zones elsewhere. A zone missing here falls back
 * to Romania, and the settings say so.
 */
export const TIME_ZONE_REGIONS: Readonly<Record<string, Region>> = {
  // Romania and its neighbours
  'Europe/Bucharest': 'RO',
  'Europe/Chisinau': 'MD',
  'Europe/Budapest': 'HU',
  'Europe/Sofia': 'BG',
  'Europe/Belgrade': 'RS',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  // Central Europe
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Bratislava': 'SK',
  'Europe/Vienna': 'AT',
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  'Europe/Zurich': 'CH',
  'Europe/Vaduz': 'LI',
  'Europe/Ljubljana': 'SI',
  'Europe/Zagreb': 'HR',
  'Europe/Sarajevo': 'BA',
  'Europe/Podgorica': 'ME',
  'Europe/Skopje': 'MK',
  'Europe/Tirane': 'AL',
  // Western and southern Europe
  'Europe/Rome': 'IT',
  'Europe/Vatican': 'VA',
  'Europe/San_Marino': 'SM',
  'Europe/Malta': 'MT',
  'Europe/Madrid': 'ES',
  'Africa/Ceuta': 'ES',
  'Atlantic/Canary': 'ES',
  'Europe/Lisbon': 'PT',
  'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT',
  'Europe/Andorra': 'AD',
  'Europe/Gibraltar': 'GI',
  'Europe/Paris': 'FR',
  'Europe/Monaco': 'MC',
  'Europe/Brussels': 'BE',
  'Europe/Luxembourg': 'LU',
  'Europe/Amsterdam': 'NL',
  'Europe/London': 'GB',
  'Europe/Jersey': 'GB',
  'Europe/Guernsey': 'GB',
  'Europe/Isle_of_Man': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Athens': 'GR',
  'Asia/Nicosia': 'CY',
  'Asia/Famagusta': 'CY',
  'Europe/Istanbul': 'TR',
  // Northern Europe
  'Europe/Copenhagen': 'DK',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Helsinki': 'FI',
  'Europe/Mariehamn': 'FI',
  'Atlantic/Reykjavik': 'IS',
  'Europe/Tallinn': 'EE',
  'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT',
  // North America
  'America/New_York': 'US',
  'America/Detroit': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Regina': 'CA',
  'America/Mexico_City': 'MX',
  // South America
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  // Middle East, Africa, Asia, Oceania
  'Asia/Jerusalem': 'IL',
  'Asia/Dubai': 'AE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG',
  'Asia/Kolkata': 'IN',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Manila': 'PH',
  'Asia/Jakarta': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Seoul': 'KR',
  'Asia/Tokyo': 'JP',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Pacific/Auckland': 'NZ',
};

/** Romania, the primary market, when the time zone names no country. */
export const FALLBACK_REGION: Region = 'RO';

/** Offered first in the picker: where the audience lives. The detected country joins them. */
export const SUGGESTED_REGIONS: readonly Region[] = ['RO', 'MD', 'HU', 'PL'];

/**
 * The picker's list while TMDB's is unavailable (offline, or a Worker not yet redeployed with the
 * /3/watch/providers/regions route): every country the time zones above can name.
 */
export const FALLBACK_REGIONS: readonly Region[] = [...new Set(Object.values(TIME_ZONE_REGIONS))];

export interface DetectedRegion {
  region: Region;
  /** False when the time zone named no country and the fallback stands in. */
  matched: boolean;
}

export function detectRegion(timeZone: string): DetectedRegion {
  const region = TIME_ZONE_REGIONS[timeZone];
  return region ? { region, matched: true } : { region: FALLBACK_REGION, matched: false };
}

/**
 * The picker's two groups, each sorted by the country's name in the interface language. The
 * suggestions come first, with the detected country among them; the current country is always
 * listed, even if TMDB's list leaves it out.
 */
export function regionGroups(
  available: readonly Region[],
  detected: Region,
  current: Region,
  name: (code: Region) => string,
  locale: string,
): { suggested: Region[]; others: Region[] } {
  const byName = (a: Region, b: Region) => name(a).localeCompare(name(b), locale, { sensitivity: 'base' });
  const suggested = [...new Set([detected, ...SUGGESTED_REGIONS])].sort(byName);
  const others = [...new Set([...available, current])].filter((code) => !suggested.includes(code)).sort(byName);
  return { suggested, others };
}
