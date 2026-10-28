import { InjectionToken } from '@angular/core';
import { StorageService } from '../core/storage.service';
import type { Region } from '../core/tmdb.models';
import { Language, resolveLanguage } from './language';
import { ro } from './ro';

/**
 * Every user-facing string, per language: Romanian (`ro.ts`), English (`en.ts`), Hungarian (`hu.ts`).
 * TypeScript makes sure each dictionary has every entry. Tests enforce the orthography: comma-below
 * ș/ț in Romanian, never the cedilla forms; ő/ű in Hungarian, never õ/û or ô.
 */
export interface Dictionary {
  /** BCP 47 code: `<html lang>`, and the language TMDB texts are compared against. */
  lang: Language;
  /** Asked of TMDB for titles, overviews and genre names. */
  tmdbLanguage: string;
  appName: string;
  locale: string;
  /** A country's name in this language, from its ISO code: "RO" → "România". */
  country: (code: Region) => string;

  meta: {
    /** The browser tab and the name under the home-screen icon. */
    title: string;
  };

  format: {
    /** 7.25 → "7,3" or "7.3": one decimal, in the language's notation. */
    rating: (rating: number) => string;
    /** 132 → "2 h 12 min". */
    runtime: (minutes: number) => string;
    date: (ms: number) => string;
  };

  header: {
    openHistory: string;
    openSettings: string;
    tokens: (left: number, total: number) => string;
  };

  hero: {
    title: string;
    subtitle: string;
  };

  schedule: {
    title: string;
    /** The platform row when none is ticked: the country is in the title. */
    allPlatforms: string;
    /** The period row when neither a decade nor a minimum rating is set. */
    anyPeriod: string;
    /** Shown instead of the region line once the user has picked their platforms. */
    myPlatforms: (count: number) => string;
    change: string;
  };

  wheel: {
    spin: string;
    /** Read after "Învârte" by screen readers: "Învârte roata genurilor". */
    labelSuffix: string;
    hint: string;
    loading: string;
    spinning: string;
    costHint: string;
    noTokens: string;
    seeTonightsMovie: string;
  };

  veto: {
    open: string;
    intro: string;
    howMany: string;
    start: string;
    cancel: string;
    turn: (person: number, people: number) => string;
    /** Before a genre's name on its button: "Scoate Horror". */
    removeLabel: string;
    removed: (genre: string) => string;
    /** `genres` is already a formatted list: "Horror, Western și Dramă". */
    done: (genres: string) => string;
    clear: string;
    wheelWaiting: string;
  };

  runtime: {
    any: string;
    option: (minutes: number) => string;
  };

  years: {
    any: string;
    /** `start` is the decade's first year: 1990 → "Anii ’90". */
    decade: (start: number) => string;
  };

  rating: {
    any: string;
    /** In settings: "Cel puțin 7". */
    option: (min: number) => string;
    /** On the letterboard: "Nota 7+". */
    short: (min: number) => string;
  };

  reel: {
    loading: string;
    rolling: string;
    genreOfTheNight: string;
  };

  card: {
    loading: string;
    cinema: string;
    hall: string;
    series: string;
    number: (id: number) => string;
    rowLabel: string;
    seatLabel: string;
    dateLabel: string;
    validTonight: string;
    stamp: string;
    originalTitle: string;
    ratingLabel: string;
    runtimeLabel: string;
    yearLabel: string;
    unknown: string;
    genresLabel: string;
    overviewEnglish: string;
    noOverview: string;
    readMore: string;
    readLess: string;
    trailer: string;
    posterAlt: (title: string) => string;
    whereToWatch: (region: Region) => string;
    providerKinds: { flatrate: string; free: string; rent: string; buy: string };
    noProviders: (region: Region) => string;
    /** Screen-reader note on a logo the user has ticked in settings. */
    yourPlatform: string;
    justWatch: string;
    allOptions: string;
    accept: string;
    accepted: string;
    respin: string;
    respinCost: string;
    respinMovie: string;
    respinGenre: string;
    noTokens: string;
    save: string;
    saved: string;
    alreadySeen: string;
    alreadySeenOn: string;
    share: string;
    sharedIntro: string;
    spinYourself: string;
    backToWheel: string;
  };

  announce: {
    genre: (name: string) => string;
    movie: (title: string, year: string | null) => string;
    tokenSpent: (left: number) => string;
    linkCopied: string;
    shareFailed: string;
    saved: string;
    unsaved: string;
    alreadySeen: string;
    notAlreadySeen: string;
    accepted: string;
    newNight: string;
  };

  settings: {
    title: string;
    runtime: string;
    years: string;
    rating: string;
    ratingHint: string;
    region: string;
    /** Under the country choice, while it follows the time zone. */
    regionAuto: string;
    /** The same, when the time zone names no country on the list. */
    regionFallback: string;
    regionManual: string;
    /** The picker's first option, which follows the time zone; `country` is the one it points to. */
    regionAutoOption: (country: string) => string;
    regionSuggested: string;
    regionAll: string;
    platforms: string;
    platformsHint: (region: Region) => string;
    platformsLoading: string;
    platformsError: string;
    morePlatforms: (count: number) => string;
    clearPlatforms: string;
    language: string;
    /** Changing the language reloads the page. */
    languageHint: string;
    sound: string;
    soundHint: string;
    newNight: string;
    newNightHint: string;
    about: string;
  };

  pwa: {
    offline: string;
    updateReady: string;
    reload: string;
  };

  library: {
    title: string;
    history: string;
    watchlist: string;
    alreadySeen: string;
    historyEmpty: string;
    watchlistEmpty: string;
    alreadySeenEmpty: string;
    chosenOn: (date: string) => string;
    markedOn: (date: string) => string;
    remove: (title: string) => string;
    removeAlreadySeen: (title: string) => string;
    removeShort: string;
  };

  about: {
    title: string;
    body: string;
    /** TMDB's required notice, always in English. */
    tmdbNotice: string;
    /** The same notice translated; empty in English, where it would repeat. */
    tmdbNoticeLocal: string;
    justWatch: string;
    nonCommercial: string;
    tmdbLogoAlt: string;
  };

  trailer: {
    title: (movie: string) => string;
  };

  errors: {
    genres: string;
    movies: string;
    details: string;
    notFound: string;
    retry: string;
  };

  empty: {
    title: string;
    body: string;
    otherGenre: string;
    openFilters: string;
  };

  close: string;
}

/**
 * Loads a dictionary. Romanian, the default, is in the main bundle; English and Hungarian are
 * fetched only by whoever uses them, before the app starts (see `main.ts`).
 */
export async function loadDictionary(language: Language): Promise<Dictionary> {
  if (language === 'en') return (await import('./en')).en;
  if (language === 'hu') return (await import('./hu')).hu;
  return ro;
}

/** The language picked in settings, else the browser's. Read once, before the app starts. */
export function startupLanguage(browserLanguages: readonly string[]): Language {
  return resolveLanguage(new StorageService().read('settings')?.language ?? null, browserLanguages);
}

/**
 * The interface texts, fixed for the page's lifetime: `main.ts` provides the dictionary of the
 * start-up language, and changing the language in settings reloads the page.
 */
export const STRINGS = new InjectionToken<Dictionary>('STRINGS', { providedIn: 'root', factory: () => ro });
