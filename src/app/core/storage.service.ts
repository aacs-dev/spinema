import { Injectable } from '@angular/core';
import { LANGUAGES, Language } from '../i18n/language';
import { MAX_PLATFORMS } from './platforms';
import {
  DECADE_OPTIONS,
  Decade,
  MaxRuntime,
  MinRating,
  MovieRef,
  RATING_OPTIONS,
  RUNTIME_OPTIONS,
  Region,
  isRegionCode,
} from './tmdb.models';

export const SCHEMA_VERSION = 1;
const PREFIX = 'spinema:';

export interface Settings {
  /** Interface language; null follows the browser. */
  language: Language | null;
  maxRuntime: MaxRuntime;
  decade: Decade;
  minRating: MinRating;
  /** Streaming country; null follows the device's time zone. */
  region: Region | null;
  sound: boolean;
  /** The user's streaming platforms (TMDB provider ids) per region. Empty: any platform. */
  platforms: Record<Region, readonly number[]>;
}

export const DEFAULT_SETTINGS: Settings = {
  language: null,
  maxRuntime: null,
  decade: null,
  minRating: null,
  region: null,
  sound: false,
  platforms: {},
};

/** Countries with saved platforms; a generous cap, since each one is a few numbers. */
const MAX_PLATFORM_COUNTRIES = 30;

export interface HistoryEntry extends MovieRef {
  /** When "Îl vedem!" (or, in the already-seen list, "Am văzut deja") was pressed, in ms. */
  at: number;
}

export interface Night {
  tokens: number;
  startedAt: number;
  /** Movies already shown as results tonight; excluded from new picks. */
  seenIds: number[];
  /** Genres the group took off the wheel tonight, in the order they were vetoed. */
  vetoedGenreIds: number[];
}

export interface StoredData {
  settings: Settings;
  history: HistoryEntry[];
  watchlist: MovieRef[];
  /** "Am văzut deja": movies that never come up in a pick again. */
  alreadySeen: HistoryEntry[];
  night: Night;
}

type Parser<T> = (raw: unknown) => T | null;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isId = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x > 0;
const isNullableString = (x: unknown): x is string | null => x === null || typeof x === 'string';

function parseMovieRef(raw: unknown): MovieRef | null {
  if (!isRecord(raw) || !isId(raw['id']) || typeof raw['title'] !== 'string') return null;
  if (!isNullableString(raw['year']) || !isNullableString(raw['posterPath'])) return null;
  return { id: raw['id'], title: raw['title'], year: raw['year'], posterPath: raw['posterPath'] };
}

/** Settings saved before the platform filter existed have no `platforms`: they get none selected. */
function parsePlatforms(raw: unknown): Settings['platforms'] {
  const platforms: Record<Region, number[]> = {};
  if (!isRecord(raw)) return platforms;
  for (const [region, ids] of Object.entries(raw).slice(0, MAX_PLATFORM_COUNTRIES)) {
    if (isRegionCode(region) && Array.isArray(ids)) platforms[region] = [...new Set(ids.filter(isId))].slice(0, MAX_PLATFORMS);
  }
  return platforms;
}

/** Keeps the valid items of a list instead of throwing everything away for one bad entry. */
function parseList<T>(item: Parser<T>): Parser<T[]> {
  return (raw) => (Array.isArray(raw) ? raw.map(item).filter((x): x is T => x !== null) : null);
}

const parseHistoryEntry: Parser<HistoryEntry> = (raw) => {
  const ref = parseMovieRef(raw);
  return ref && isRecord(raw) && typeof raw['at'] === 'number' ? { ...ref, at: raw['at'] } : null;
};

const parsers: { [K in keyof StoredData]: Parser<StoredData[K]> } = {
  settings: (raw) => {
    if (!isRecord(raw)) return null;
    // Fields missing from settings saved by an older version fall back to their defaults.
    const option = <T>(options: readonly T[], value: unknown, fallback: T): T =>
      options.includes(value as T) ? (value as T) : fallback;
    return {
      language: option<Language | null>(LANGUAGES, raw['language'], DEFAULT_SETTINGS.language),
      maxRuntime: option(RUNTIME_OPTIONS, raw['maxRuntime'], DEFAULT_SETTINGS.maxRuntime),
      decade: option(DECADE_OPTIONS, raw['decade'], DEFAULT_SETTINGS.decade),
      minRating: option(RATING_OPTIONS, raw['minRating'], DEFAULT_SETTINGS.minRating),
      region: isRegionCode(raw['region']) ? raw['region'] : DEFAULT_SETTINGS.region,
      sound: typeof raw['sound'] === 'boolean' ? raw['sound'] : DEFAULT_SETTINGS.sound,
      platforms: parsePlatforms(raw['platforms']),
    };
  },
  history: parseList(parseHistoryEntry),
  watchlist: parseList(parseMovieRef),
  alreadySeen: parseList(parseHistoryEntry),
  night: (raw) => {
    if (!isRecord(raw) || typeof raw['tokens'] !== 'number' || typeof raw['startedAt'] !== 'number') return null;
    const seenIds = Array.isArray(raw['seenIds']) ? raw['seenIds'].filter(isId) : [];
    // Nights saved before the group veto existed have none.
    const vetoedGenreIds = Array.isArray(raw['vetoedGenreIds']) ? [...new Set(raw['vetoedGenreIds'].filter(isId))] : [];
    return { tokens: Math.max(0, Math.floor(raw['tokens'])), startedAt: raw['startedAt'], seenIds, vetoedGenreIds };
  },
};

/**
 * Typed `localStorage` access. Every value is stored as `{ v, data }`; anything unreadable,
 * from another schema version, or with the wrong shape comes back as `null`.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  read<K extends keyof StoredData>(key: K): StoredData[K] | null {
    try {
      const text = localStorage.getItem(PREFIX + key);
      if (text === null) return null;
      const envelope: unknown = JSON.parse(text);
      if (!isRecord(envelope) || envelope['v'] !== SCHEMA_VERSION) return null;
      return parsers[key](envelope['data']) as StoredData[K] | null;
    } catch {
      return null;
    }
  }

  write<K extends keyof StoredData>(key: K, data: StoredData[K]): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ v: SCHEMA_VERSION, data }));
    } catch {
      // Storage full or disabled (private mode): the app keeps working for this session.
    }
  }
}
