import { InjectionToken } from '@angular/core';
import type { Region } from '../core/tmdb.models';

/**
 * Every user-facing string lives here. To add English or Polish, write another object that
 * satisfies `Dictionary` and provide it through `STRINGS`.
 * Romanian text uses comma-below ș/ț (U+0219/U+021B), never the cedilla forms; a test enforces it.
 */
export interface Dictionary {
  appName: string;
  locale: string;
  regionNames: Record<Region, string>;
  regionIn: Record<Region, string>;

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
    region: (region: Region) => string;
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

  runtime: {
    any: string;
    option: (minutes: number) => string;
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
    accepted: string;
    newNight: string;
  };

  settings: {
    title: string;
    runtime: string;
    region: string;
    sound: string;
    soundHint: string;
    newNight: string;
    newNightHint: string;
    about: string;
  };

  library: {
    title: string;
    history: string;
    watchlist: string;
    historyEmpty: string;
    watchlistEmpty: string;
    chosenOn: (date: string) => string;
    remove: (title: string) => string;
    removeShort: string;
  };

  about: {
    title: string;
    body: string;
    tmdbNotice: string;
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
    openSettings: string;
  };

  close: string;
}

export const ro: Dictionary = {
  appName: 'Spinema',
  locale: 'ro-RO',
  regionNames: { RO: 'România', PL: 'Polonia' },
  regionIn: { RO: 'în România', PL: 'în Polonia' },

  header: {
    openHistory: 'Istoric și filme salvate',
    openSettings: 'Setări',
    tokens: (left, total) => `Jetoane: ${left} din ${total}`,
  },

  hero: {
    title: 'Ce vedem diseară?',
    subtitle: 'Roata alege genul. Bobina alege filmul.',
  },

  schedule: {
    title: 'Programul serii',
    region: (region) => `Platforme din ${ro.regionNames[region]}`,
    change: 'Schimbă',
  },

  wheel: {
    spin: 'Învârte',
    labelSuffix: 'roata genurilor',
    hint: 'Apasă „Învârte” și lasă roata să aleagă.',
    loading: 'Se încarcă genurile…',
    spinning: 'Se învârte…',
    costHint: 'O tură nouă costă un jeton.',
    noTokens: 'Fără jetoane. Rămâne filmul ăsta.',
    seeTonightsMovie: 'Vezi filmul serii',
  },

  runtime: {
    any: 'Orice durată',
    option: (m) => `Până la ${m} min`,
  },

  reel: {
    loading: 'Se încarcă bobina…',
    rolling: 'Se derulează bobina…',
    genreOfTheNight: 'Genul serii',
  },

  card: {
    loading: 'Se încarcă biletul…',
    cinema: 'Cinematograf Spinema',
    hall: 'Sala 1',
    series: 'Seria SP',
    number: (id) => `Nr. ${String(id).padStart(7, '0')}`,
    rowLabel: 'Rândul',
    seatLabel: 'Locul',
    dateLabel: 'Data',
    validTonight: 'Valabil numai în seara emiterii.',
    stamp: 'Controlat',
    originalTitle: 'Titlu original',
    ratingLabel: 'Nota TMDB',
    runtimeLabel: 'Durata',
    yearLabel: 'Anul',
    unknown: '–',
    genresLabel: 'Genuri',
    overviewEnglish: 'Rezumat în engleză',
    noOverview: 'Filmul nu are încă un rezumat.',
    readMore: 'Citește tot',
    readLess: 'Mai puțin',
    trailer: 'Vezi trailerul',
    posterAlt: (title) => `Afișul filmului ${title}`,
    whereToWatch: (region) => `Unde îl vezi ${ro.regionIn[region]}`,
    providerKinds: { flatrate: 'Abonament', free: 'Gratuit', rent: 'Închiriere', buy: 'Cumpărare' },
    noProviders: (region) => `Nu apare pe nicio platformă de streaming ${ro.regionIn[region]}.`,
    justWatch: 'Date de disponibilitate: JustWatch',
    allOptions: 'Toate opțiunile pe TMDB',
    accept: 'Îl vedem!',
    accepted: 'Vizionare plăcută!',
    respin: 'Altă tură',
    respinCost: '1 jeton',
    respinMovie: 'Alt film, același gen',
    respinGenre: 'Alt gen',
    noTokens: 'Fără jetoane. Rămâne filmul ăsta.',
    save: 'Salvează pentru altă dată',
    saved: 'Salvat pentru altă dată',
    share: 'Trimite',
    sharedIntro: 'Cineva ți-a trimis biletul ăsta.',
    spinYourself: 'Învârte și tu',
    backToWheel: 'Înapoi la roată',
  },

  announce: {
    genre: (name) => `Genul serii: ${name}.`,
    movie: (title, year) => `Filmul serii: ${title}${year ? `, ${year}` : ''}.`,
    tokenSpent: (left) =>
      left === 0 ? 'Ai folosit ultimul jeton.' : `Ai folosit un jeton. Mai ai ${left === 1 ? 'unul' : left}.`,
    linkCopied: 'Link copiat. Trimite-l cui vrei.',
    shareFailed: 'Nu am putut copia linkul. Copiază-l din bara de adrese.',
    saved: 'Salvat pentru altă dată.',
    unsaved: 'Scos din lista De văzut.',
    accepted: 'Notat în istoric. Vizionare plăcută!',
    newNight: 'Seară nouă. Ai din nou 3 jetoane.',
  },

  settings: {
    title: 'Setări',
    runtime: 'Durata maximă',
    region: 'Unde te uiți',
    sound: 'Sunete',
    soundHint: 'Clicuri scurte când se învârte roata.',
    newNight: 'Seară nouă',
    newNightHint: 'Primești din nou 3 jetoane, iar filmele de diseară pot ieși din nou.',
    about: 'Despre Spinema',
  },

  library: {
    title: 'Filmele tale',
    history: 'Istoric',
    watchlist: 'De văzut',
    historyEmpty: 'Încă n-ai ales niciun film. Apasă „Îl vedem!” pe un bilet ca să apară aici.',
    watchlistEmpty: 'Nimic salvat. Apasă „Salvează pentru altă dată” pe un bilet.',
    chosenOn: (date) => `Ales pe ${date}`,
    remove: (title) => `Scoate ${title} din lista De văzut`,
    removeShort: 'Scoate',
  },

  about: {
    title: 'Despre Spinema',
    body: 'Spinema transformă întrebarea „ce vedem diseară?” într-un joc scurt: roata alege genul, bobina alege filmul, iar biletul îți spune unde îl găsești.',
    tmdbNotice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    tmdbNoticeLocal: 'Produsul folosește API-ul TMDB, dar nu este aprobat sau certificat de TMDB.',
    justWatch: 'Datele despre platformele de streaming vin de la JustWatch, prin TMDB.',
    nonCommercial: 'Spinema este necomercial: fără reclame și fără scripturi de urmărire.',
    tmdbLogoAlt: 'The Movie Database (TMDB)',
  },

  trailer: {
    title: (movie) => `Trailer: ${movie}`,
  },

  errors: {
    genres: 'Nu am putut încărca genurile. Verifică conexiunea și încearcă din nou.',
    movies: 'Nu am putut încărca filmele. Verifică conexiunea și încearcă din nou.',
    details: 'Nu am putut încărca biletul. Verifică conexiunea și încearcă din nou.',
    notFound: 'Filmul din link nu mai există pe TMDB. Învârte roata pentru altul.',
    retry: 'Încearcă din nou',
  },

  empty: {
    title: 'Bobina e goală',
    body: 'Niciun film nu se potrivește cu filtrele tale. Alege o durată mai lungă sau învârte pentru alt gen.',
    otherGenre: 'Alt gen',
    openSettings: 'Schimbă durata',
  },

  close: 'Închide',
};

export const STRINGS = new InjectionToken<Dictionary>('STRINGS', { providedIn: 'root', factory: () => ro });
