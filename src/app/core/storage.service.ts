import { Injectable } from '@angular/core';
import { MaxRuntime, MovieRef, RUNTIME_OPTIONS, Region, REGIONS } from './tmdb.models';

export const SCHEMA_VERSION = 1;
const PREFIX = 'spinema:';

export interface Settings {
  maxRuntime: MaxRuntime;
  region: Region;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { maxRuntime: null, region: 'RO', sound: false };

export interface HistoryEntry extends MovieRef {
  /** When "Îl vedem!" was pressed, in ms. */
  at: number;
}

export interface Night {
  tokens: number;
  startedAt: number;
  /** Movies already shown as results tonight; excluded from new picks. */
  seenIds: number[];
}

export interface StoredData {
  settings: Settings;
  history: HistoryEntry[];
  watchlist: MovieRef[];
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

/** Keeps the valid items of a list instead of throwing everything away for one bad entry. */
function parseList<T>(item: Parser<T>): Parser<T[]> {
  return (raw) => (Array.isArray(raw) ? raw.map(item).filter((x): x is T => x !== null) : null);
}

const parsers: { [K in keyof StoredData]: Parser<StoredData[K]> } = {
  settings: (raw) => {
    if (!isRecord(raw)) return null;
    const maxRuntime = RUNTIME_OPTIONS.includes(raw['maxRuntime'] as MaxRuntime)
      ? (raw['maxRuntime'] as MaxRuntime)
      : DEFAULT_SETTINGS.maxRuntime;
    const region = REGIONS.includes(raw['region'] as Region) ? (raw['region'] as Region) : DEFAULT_SETTINGS.region;
    const sound = typeof raw['sound'] === 'boolean' ? raw['sound'] : DEFAULT_SETTINGS.sound;
    return { maxRuntime, region, sound };
  },
  history: parseList((raw) => {
    const ref = parseMovieRef(raw);
    return ref && isRecord(raw) && typeof raw['at'] === 'number' ? { ...ref, at: raw['at'] } : null;
  }),
  watchlist: parseList(parseMovieRef),
  night: (raw) => {
    if (!isRecord(raw) || typeof raw['tokens'] !== 'number' || typeof raw['startedAt'] !== 'number') return null;
    const seenIds = Array.isArray(raw['seenIds']) ? raw['seenIds'].filter(isId) : [];
    return { tokens: Math.max(0, Math.floor(raw['tokens'])), startedAt: raw['startedAt'], seenIds };
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
