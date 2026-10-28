import { countryNamer, dateFormatter, ratingFormatter, runtimeFormatter } from '../core/text';
import type { Dictionary } from './strings';

/** Romanian puts "de" between a number from 20 up and its noun: "3 platforme", "20 de platforme". */
const de = (n: number) => (n >= 20 && (n % 100 === 0 || n % 100 >= 20) ? ' de' : '');

export const ro: Dictionary = {
  lang: 'ro',
  tmdbLanguage: 'ro-RO',
  appName: 'Spinema',
  locale: 'ro-RO',
  country: countryNamer('ro'),

  meta: {
    title: 'Spinema – ce vedem diseară?',
  },

  format: {
    rating: ratingFormatter('ro-RO'),
    runtime: runtimeFormatter('h', 'min'),
    date: dateFormatter('ro-RO'),
  },

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
    anyPeriod: 'Orice an, orice notă',
    allPlatforms: 'Toate platformele',
    myPlatforms: (count) => (count === 1 ? 'Pe platforma ta' : `Pe ${count}${de(count)} platforme ale tale`),
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

  veto: {
    open: 'Veto de grup',
    intro: 'Fiecare scoate de pe roată un gen pe care nu vrea să-l vadă.',
    howMany: 'Câți sunteți?',
    start: 'Începe vetoul',
    cancel: 'Renunță',
    turn: (person, people) => `Persoana ${person} din ${people}: ce gen nu vreți diseară?`,
    removeLabel: 'Scoate',
    removed: (genre) => `${genre} a ieșit de pe roată.`,
    done: (genres) => `Diseară fără ${genres}.`,
    clear: 'Anulează vetoul',
    wheelWaiting: 'Terminați vetoul, apoi învârtiți roata.',
  },

  runtime: {
    any: 'Orice durată',
    option: (m) => `Până la ${m} min`,
  },

  years: {
    any: 'Orice an',
    decade: (start) => (start >= 2000 ? `Anii ${start}` : `Anii ’${String(start).slice(2)}`),
  },

  rating: {
    any: 'Orice notă',
    option: (min) => `Cel puțin ${min}`,
    short: (min) => `Nota ${min}+`,
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
    whereToWatch: (region) => `Unde îl vezi în ${ro.country(region)}`,
    providerKinds: { flatrate: 'Abonament', free: 'Gratuit', rent: 'Închiriere', buy: 'Cumpărare' },
    noProviders: (region) => `Nu apare pe nicio platformă de streaming în ${ro.country(region)}.`,
    yourPlatform: 'platforma ta',
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
    alreadySeen: 'Am văzut deja',
    alreadySeenOn: 'Văzut deja',
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
    alreadySeen: 'Notat ca văzut. Nu mai iese la tragere.',
    notAlreadySeen: 'Scos din Deja văzute. Poate ieși din nou la tragere.',
    accepted: 'Notat în istoric. Vizionare plăcută!',
    newNight: 'Seară nouă. Ai din nou 3 jetoane.',
  },

  settings: {
    title: 'Setări',
    runtime: 'Durata maximă',
    years: 'Perioada',
    rating: 'Nota TMDB minimă',
    ratingHint: 'Media voturilor de pe TMDB. Roata alege oricum doar filme cu cel puțin 300 de voturi.',
    region: 'Unde te uiți',
    regionAuto: 'Aleasă automat, după fusul orar al telefonului.',
    regionFallback: 'Fusul orar al telefonului nu indică o țară anume, așa că am pus România.',
    regionManual: 'Aleasă de tine.',
    regionAutoOption: (country) => `Automat, după fusul orar: ${country}`,
    regionSuggested: 'Recomandate',
    regionAll: 'Toate țările',
    platforms: 'Platformele mele',
    platformsHint: (region) =>
      `Bifează ce abonamente ai în ${ro.country(region)}. Roata alege doar filme incluse în abonament sau gratuite pe ele. Fără nicio bifă, caută pe toate.`,
    platformsLoading: 'Se încarcă platformele…',
    platformsError: 'Nu am putut încărca platformele. Verifică conexiunea și încearcă din nou.',
    morePlatforms: (count) => `Alte platforme (${count})`,
    clearPlatforms: 'Debifează toate',
    language: 'Limba',
    languageHint: 'Pagina se reîncarcă în limba aleasă.',
    sound: 'Sunete',
    soundHint: 'Clicuri scurte când se învârte roata.',
    newNight: 'Seară nouă',
    newNightHint: 'Primești din nou 3 jetoane, filmele de diseară pot ieși din nou, iar vetoul se anulează.',
    about: 'Despre Spinema',
  },

  pwa: {
    offline: 'Ești offline. Istoricul și biletele deschise deja merg în continuare; roata are nevoie de internet.',
    updateReady: 'Spinema are o versiune nouă.',
    reload: 'Reîncarcă',
  },

  library: {
    title: 'Filmele tale',
    history: 'Istoric',
    watchlist: 'De văzut',
    alreadySeen: 'Deja văzute',
    historyEmpty: 'Încă n-ai ales niciun film. Apasă „Îl vedem!” pe un bilet ca să apară aici.',
    watchlistEmpty: 'Nimic salvat. Apasă „Salvează pentru altă dată” pe un bilet.',
    alreadySeenEmpty: 'Nimic aici. Apasă „Am văzut deja” pe un bilet și filmul nu mai iese la tragere.',
    chosenOn: (date) => `Ales pe ${date}`,
    markedOn: (date) => `Marcat pe ${date}`,
    remove: (title) => `Scoate ${title} din lista De văzut`,
    removeAlreadySeen: (title) => `Scoate ${title} din Deja văzute`,
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
    body: 'Niciun film nu se potrivește cu filtrele tale. Lărgește durata, perioada, nota sau platformele, ori învârte pentru alt gen.',
    otherGenre: 'Alt gen',
    openFilters: 'Schimbă filtrele',
  },

  close: 'Închide',
};
