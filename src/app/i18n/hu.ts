import { countryNamer, dateFormatter, ratingFormatter, runtimeFormatter } from '../core/text';
import type { Dictionary } from './strings';

/** "a" or "az", by the first sound of the next word: "a Horror", "az Akció". Capitalised, for a sentence start. */
const article = (word: string) => (/^[aáeéiíoóöőuúüű]/i.test(word) ? 'Az' : 'A');

/** Decade suffixes follow how the number is said: hatvan-as, hetven-es, kétezer-es, kétezer-húsz-as. */
const DECADE_SUFFIX: Record<number, string> = { 1960: 'as', 1970: 'es', 1980: 'as', 1990: 'es', 2000: 'es', 2010: 'es', 2020: 'as' };

export const hu: Dictionary = {
  lang: 'hu',
  tmdbLanguage: 'hu-HU',
  appName: 'Spinema',
  locale: 'hu-HU',
  // Names stay in the nominative: Hungarian case endings ("Romániában") cannot be built from Intl.
  country: countryNamer('hu'),

  meta: {
    title: 'Spinema – mit nézzünk ma este?',
  },

  format: {
    rating: ratingFormatter('hu-HU'),
    // The standard Hungarian abbreviations: ó (óra), p (perc).
    runtime: runtimeFormatter('ó', 'p'),
    date: dateFormatter('hu-HU'),
  },

  header: {
    openHistory: 'Előzmények és mentett filmek',
    openSettings: 'Beállítások',
    tokens: (left, total) => `Zsetonok: ${left} / ${total}`,
  },

  hero: {
    title: 'Mit nézzünk ma este?',
    subtitle: 'A kerék a műfajt választja ki, a tekercs a filmet.',
  },

  schedule: {
    title: 'Az esti program',
    anyPeriod: 'Bármely év és értékelés',
    allPlatforms: 'Minden platform',
    myPlatforms: (count) => (count === 1 ? 'Csak a saját platformodon' : `Csak a saját platformjaidon (${count})`),
    change: 'Módosítás',
  },

  wheel: {
    spin: 'Pörgesd',
    labelSuffix: 'meg a műfajkereket',
    hint: 'Nyomd meg a „Pörgesd” gombot, és hagyd, hogy a kerék döntsön.',
    loading: 'A műfajok betöltése…',
    spinning: 'Pörög…',
    costHint: 'Egy újabb kör egy zsetonba kerül.',
    noTokens: 'Elfogytak a zsetonok. Marad ez a film.',
    seeTonightsMovie: 'Az esti film',
  },

  veto: {
    open: 'Csoportos vétó',
    intro: 'Mindenki levesz a kerékről egy műfajt, amelyet nem szeretne látni.',
    howMany: 'Hányan vagytok?',
    start: 'Vétó indítása',
    cancel: 'Mégse',
    turn: (person, people) => `${person}. személy (összesen ${people}): melyik műfaj maradjon ki ma este?`,
    removeLabel: 'Vétó:',
    removed: (genre) => `${article(genre)} ${genre} lekerült a kerékről.`,
    done: (genres) => `Ma este nélkülük: ${genres}.`,
    clear: 'Vétó visszavonása',
    wheelWaiting: 'Fejezzétek be a vétót, aztán pörgessetek.',
  },

  runtime: {
    any: 'Bármilyen hosszú',
    option: (m) => `Legfeljebb ${m} perc`,
  },

  years: {
    any: 'Bármelyik év',
    decade: (start) => `${start >= 2000 ? start : String(start).slice(2)}-${DECADE_SUFFIX[start] ?? 'es'} évek`,
  },

  rating: {
    any: 'Bármilyen értékelés',
    option: (min) => `Legalább ${min}`,
    short: (min) => `Értékelés ${min}+`,
  },

  reel: {
    loading: 'A tekercs betöltése…',
    rolling: 'Pörög a filmtekercs…',
    genreOfTheNight: 'Az est műfaja',
  },

  card: {
    loading: 'A jegy nyomtatása…',
    cinema: 'Spinema Mozi',
    hall: '1-es terem',
    series: 'SP sorozat',
    number: (id) => `Ssz. ${String(id).padStart(7, '0')}`,
    rowLabel: 'Sor',
    seatLabel: 'Szék',
    dateLabel: 'Dátum',
    validTonight: 'Csak a kiállítás estéjén érvényes.',
    stamp: 'Ellenőrizve',
    originalTitle: 'Eredeti cím',
    ratingLabel: 'TMDB-értékelés',
    runtimeLabel: 'Játékidő',
    yearLabel: 'Év',
    unknown: '–',
    genresLabel: 'Műfajok',
    overviewEnglish: 'Angol nyelvű összefoglaló',
    noOverview: 'A filmnek még nincs összefoglalója.',
    readMore: 'Tovább olvasom',
    readLess: 'Kevesebb',
    trailer: 'Előzetes megtekintése',
    posterAlt: (title) => `${title} – plakát`,
    whereToWatch: (region) => `Hol nézheted – ${hu.country(region)}`,
    providerKinds: { flatrate: 'Előfizetés', free: 'Ingyenes', rent: 'Kölcsönzés', buy: 'Vásárlás' },
    noProviders: (region) => `Ebben az országban (${hu.country(region)}) egyik streamingplatformon sem érhető el.`,
    yourPlatform: 'a te platformod',
    justWatch: 'Elérhetőségi adatok: JustWatch',
    allOptions: 'Minden lehetőség a TMDB-n',
    accept: 'Ezt nézzük!',
    accepted: 'Jó szórakozást!',
    respin: 'Új kör',
    respinCost: '1 zseton',
    respinMovie: 'Másik film, ugyanaz a műfaj',
    respinGenre: 'Másik műfaj',
    noTokens: 'Elfogytak a zsetonok. Marad ez a film.',
    save: 'Mentés máskorra',
    saved: 'Elmentve máskorra',
    alreadySeen: 'Már láttam',
    alreadySeenOn: 'Megjelölve: láttam',
    share: 'Küldés',
    sharedIntro: 'Valaki elküldte neked ezt a jegyet.',
    spinYourself: 'Pörgess te is',
    backToWheel: 'Vissza a kerékhez',
  },

  announce: {
    genre: (name) => `Az est műfaja: ${name}.`,
    movie: (title, year) => `Az est filmje: ${title}${year ? `, ${year}` : ''}.`,
    tokenSpent: (left) =>
      left === 0 ? 'Elhasználtad az utolsó zsetont.' : `Elhasználtál egy zsetont. Még ${left} maradt.`,
    linkCopied: 'A link a vágólapon. Küldd el bárkinek.',
    shareFailed: 'Nem sikerült kimásolni a linket. Másold ki a címsorból.',
    saved: 'Elmentve máskorra.',
    unsaved: 'Kivéve a Megnézendők közül.',
    alreadySeen: 'Megjelölve, hogy láttad. Többé nem kerül sorra.',
    notAlreadySeen: 'Kivéve a Már látottak közül. Újra sorra kerülhet.',
    accepted: 'Bekerült az előzmények közé. Jó szórakozást!',
    newNight: 'Új este. Újra 3 zsetonod van.',
  },

  settings: {
    title: 'Beállítások',
    runtime: 'Maximális játékidő',
    years: 'Időszak',
    rating: 'Minimális TMDB-értékelés',
    ratingHint: 'A TMDB-szavazatok átlaga. A kerék amúgy is csak legalább 300 szavazatot kapott filmeket választ.',
    region: 'Hol nézed',
    regionAuto: 'Automatikusan, a telefon időzónája alapján.',
    regionFallback: 'A telefon időzónája nem utal konkrét országra, ezért Románia lett beállítva.',
    regionManual: 'Te választottad.',
    regionAutoOption: (country) => `Automatikus, időzóna szerint: ${country}`,
    regionSuggested: 'Javasolt',
    regionAll: 'Minden ország',
    platforms: 'Platformjaim',
    platformsHint: (region) =>
      `Jelöld be, milyen előfizetéseid vannak ebben az országban (${hu.country(region)}). A kerék ekkor csak olyan filmeket választ, amelyek ezeken előfizetéssel vagy ingyen elérhetők. Ha semmit sem jelölsz be, mindenhol keres.`,
    platformsLoading: 'A platformok betöltése…',
    platformsError: 'Nem sikerült betölteni a platformokat. Ellenőrizd a kapcsolatot, és próbáld újra.',
    morePlatforms: (count) => `További platformok (${count})`,
    clearPlatforms: 'Minden jelölés törlése',
    language: 'Nyelv',
    languageHint: 'Az oldal a választott nyelven töltődik újra.',
    sound: 'Hangok',
    soundHint: 'Rövid kattanások, amíg a kerék pörög.',
    newNight: 'Új este',
    newNightHint: 'Újra 3 zsetonod lesz, a ma esti filmek ismét sorra kerülhetnek, és a vétó törlődik.',
    about: 'A Spinemáról',
  },

  pwa: {
    offline: 'Nincs internetkapcsolat. Az előzmények és a már megnyitott jegyek működnek; a kerékhez internet kell.',
    updateReady: 'Elérhető a Spinema új verziója.',
    reload: 'Újratöltés',
  },

  library: {
    title: 'Filmjeid',
    history: 'Előzmények',
    watchlist: 'Megnézendők',
    alreadySeen: 'Már látott',
    historyEmpty: 'Még nem választottál filmet. Nyomd meg az „Ezt nézzük!” gombot egy jegyen, és itt megjelenik.',
    watchlistEmpty: 'Nincs mentett film. Nyomd meg a „Mentés máskorra” gombot egy jegyen.',
    alreadySeenEmpty: 'Itt még nincs semmi. Nyomd meg a „Már láttam” gombot egy jegyen, és az a film többé nem kerül sorra.',
    chosenOn: (date) => `Kiválasztva: ${date}`,
    markedOn: (date) => `Megjelölve: ${date}`,
    remove: (title) => `${title} – eltávolítás a Megnézendők közül`,
    removeAlreadySeen: (title) => `${title} – eltávolítás a Már látottak közül`,
    removeShort: 'Eltávolítás',
  },

  about: {
    title: 'A Spinemáról',
    body: 'A Spinema a „mit nézzünk ma este?” kérdésből rövid játékot csinál: a kerék kiválasztja a műfajt, a tekercs a filmet, a jegy pedig megmondja, hol találod.',
    tmdbNotice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    tmdbNoticeLocal: 'Ez a termék a TMDB API-t használja, de a TMDB nem támogatja és nem tanúsítja.',
    justWatch: 'A streamingadatok a JustWatch-tól származnak, a TMDB-n keresztül.',
    nonCommercial: 'A Spinema nem kereskedelmi célú: nincs benne reklám, sem követőszkript.',
    tmdbLogoAlt: 'The Movie Database (TMDB)',
  },

  trailer: {
    title: (movie) => `Előzetes: ${movie}`,
  },

  errors: {
    genres: 'Nem sikerült betölteni a műfajokat. Ellenőrizd a kapcsolatot, és próbáld újra.',
    movies: 'Nem sikerült betölteni a filmeket. Ellenőrizd a kapcsolatot, és próbáld újra.',
    details: 'Nem sikerült betölteni a jegyet. Ellenőrizd a kapcsolatot, és próbáld újra.',
    notFound: 'A linkben szereplő film már nincs meg a TMDB-n. Pörgess egy másikért.',
    retry: 'Újrapróbálom',
  },

  empty: {
    title: 'Üres a tekercs',
    body: 'Egy film sem felel meg a szűrőknek. Bővítsd a játékidőt, az időszakot, az értékelést vagy a platformokat, vagy pörgess másik műfajért.',
    otherGenre: 'Másik műfaj',
    openFilters: 'Szűrők módosítása',
  },

  close: 'Bezárás',
};
