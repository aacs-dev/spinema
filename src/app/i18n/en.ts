import { countryNamer, dateFormatter, ratingFormatter, runtimeFormatter } from '../core/text';
import type { Dictionary } from './strings';

/** "in Romania", but "in the United Kingdom": English wants an article before some country names. */
const inCountry = (name: string) =>
  /^(United |Netherlands|Philippines|Czech Republic|Dominican Republic|Bahamas|Maldives|Seychelles|Gambia|Central African|Marshall|Solomon|Cayman|Faroe|Falkland|British|Turks|Cook|US )/.test(name)
    ? `in the ${name}`
    : `in ${name}`;

export const en: Dictionary = {
  lang: 'en',
  tmdbLanguage: 'en-US',
  appName: 'Spinema',
  // British conventions for a European audience: 28/10/2026, 7.3.
  locale: 'en-GB',
  country: countryNamer('en-GB'),

  meta: {
    title: 'Spinema – what’s on tonight?',
  },

  format: {
    rating: ratingFormatter('en-GB'),
    runtime: runtimeFormatter('h', 'm', ''),
    date: dateFormatter('en-GB'),
  },

  header: {
    openHistory: 'History and saved films',
    openSettings: 'Settings',
    tokens: (left, total) => `Tokens: ${left} of ${total}`,
  },

  hero: {
    title: 'What’s on tonight?',
    subtitle: 'The wheel picks the genre. The reel picks the film.',
  },

  schedule: {
    title: 'Tonight’s line-up',
    anyPeriod: 'Any year, any rating',
    allPlatforms: 'All platforms',
    myPlatforms: (count) => (count === 1 ? 'On your platform' : `On your ${count} platforms`),
    change: 'Change',
  },

  wheel: {
    spin: 'Spin',
    labelSuffix: 'the genre wheel',
    hint: 'Press “Spin” and let the wheel decide.',
    loading: 'Loading genres…',
    spinning: 'Spinning…',
    costHint: 'Another round costs a token.',
    noTokens: 'Out of tokens. This film stays.',
    seeTonightsMovie: 'See tonight’s film',
  },

  veto: {
    open: 'Group veto',
    intro: 'Everyone takes one genre they don’t want off the wheel.',
    howMany: 'How many of you?',
    start: 'Start the veto',
    cancel: 'Cancel',
    turn: (person, people) => `Person ${person} of ${people}: which genre is out tonight?`,
    removeLabel: 'Remove',
    removed: (genre) => `${genre} is off the wheel.`,
    done: (genres) => `Off the wheel tonight: ${genres}.`,
    clear: 'Undo the veto',
    wheelWaiting: 'Finish the veto, then spin.',
  },

  runtime: {
    any: 'Any length',
    option: (m) => `Up to ${m} min`,
  },

  years: {
    any: 'Any year',
    decade: (start) => (start >= 2000 ? `The ${start}s` : `The ’${String(start).slice(2)}s`),
  },

  rating: {
    any: 'Any rating',
    option: (min) => `At least ${min}`,
    short: (min) => `Rated ${min}+`,
  },

  reel: {
    loading: 'Loading the reel…',
    rolling: 'The reel is rolling…',
    genreOfTheNight: 'Tonight’s genre',
  },

  card: {
    loading: 'Printing your ticket…',
    cinema: 'Spinema Cinema',
    hall: 'Screen 1',
    series: 'Series SP',
    number: (id) => `No. ${String(id).padStart(7, '0')}`,
    rowLabel: 'Row',
    seatLabel: 'Seat',
    dateLabel: 'Date',
    validTonight: 'Valid on the night of issue only.',
    stamp: 'Checked',
    originalTitle: 'Original title',
    ratingLabel: 'TMDB rating',
    runtimeLabel: 'Length',
    yearLabel: 'Year',
    unknown: '–',
    genresLabel: 'Genres',
    overviewEnglish: 'Overview in English',
    noOverview: 'This film has no overview yet.',
    readMore: 'Read more',
    readLess: 'Show less',
    trailer: 'Watch the trailer',
    posterAlt: (title) => `Poster for ${title}`,
    whereToWatch: (region) => `Where to watch ${inCountry(en.country(region))}`,
    providerKinds: { flatrate: 'Subscription', free: 'Free', rent: 'Rent', buy: 'Buy' },
    noProviders: (region) => `Not on any streaming platform ${inCountry(en.country(region))}.`,
    yourPlatform: 'your platform',
    justWatch: 'Availability data: JustWatch',
    allOptions: 'All options on TMDB',
    accept: 'Let’s watch it!',
    accepted: 'Enjoy the film!',
    respin: 'Another round',
    respinCost: '1 token',
    respinMovie: 'Another film, same genre',
    respinGenre: 'Another genre',
    noTokens: 'Out of tokens. This film stays.',
    save: 'Save for another time',
    saved: 'Saved for another time',
    alreadySeen: 'Seen it already',
    alreadySeenOn: 'Already seen',
    share: 'Share',
    sharedIntro: 'Someone sent you this ticket.',
    spinYourself: 'Spin for yourself',
    backToWheel: 'Back to the wheel',
  },

  announce: {
    genre: (name) => `Tonight’s genre: ${name}.`,
    movie: (title, year) => `Tonight’s film: ${title}${year ? `, ${year}` : ''}.`,
    tokenSpent: (left) => (left === 0 ? 'You used your last token.' : `You used a token. ${left} left.`),
    linkCopied: 'Link copied. Send it to anyone.',
    shareFailed: 'Couldn’t copy the link. Copy it from the address bar.',
    saved: 'Saved for another time.',
    unsaved: 'Removed from your watchlist.',
    alreadySeen: 'Marked as seen. It won’t come up again.',
    notAlreadySeen: 'Removed from Already seen. It can come up again.',
    accepted: 'Added to your history. Enjoy the film!',
    newNight: 'New night. You have 3 tokens again.',
  },

  settings: {
    title: 'Settings',
    runtime: 'Maximum length',
    years: 'Period',
    rating: 'Minimum TMDB rating',
    ratingHint: 'The average of TMDB votes. The wheel only picks films with at least 300 votes anyway.',
    region: 'Where you watch',
    regionAuto: 'Picked automatically from your phone’s time zone.',
    regionFallback: 'Your phone’s time zone doesn’t point to a particular country, so it’s set to Romania.',
    regionManual: 'Picked by you.',
    regionAutoOption: (country) => `Automatic, from the time zone: ${country}`,
    regionSuggested: 'Suggested',
    regionAll: 'All countries',
    platforms: 'My platforms',
    platformsHint: (region) =>
      `Tick the subscriptions you have ${inCountry(en.country(region))}. The wheel then only picks films included in a subscription, or free, on them. With nothing ticked, it searches them all.`,
    platformsLoading: 'Loading platforms…',
    platformsError: 'Couldn’t load the platforms. Check your connection and try again.',
    morePlatforms: (count) => `Other platforms (${count})`,
    clearPlatforms: 'Untick all',
    language: 'Language',
    languageHint: 'The page reloads in the language you pick.',
    sound: 'Sounds',
    soundHint: 'Short clicks while the wheel spins.',
    newNight: 'New night',
    newNightHint: 'You get 3 tokens again, tonight’s films can come up again, and the veto is cleared.',
    about: 'About Spinema',
  },

  pwa: {
    offline: 'You’re offline. Your history and the tickets you’ve opened still work; the wheel needs the internet.',
    updateReady: 'A new version of Spinema is ready.',
    reload: 'Reload',
  },

  library: {
    title: 'Your films',
    history: 'History',
    watchlist: 'Watchlist',
    alreadySeen: 'Already seen',
    historyEmpty: 'No films chosen yet. Press “Let’s watch it!” on a ticket and it shows up here.',
    watchlistEmpty: 'Nothing saved. Press “Save for another time” on a ticket.',
    alreadySeenEmpty: 'Nothing here. Press “Seen it already” on a ticket and that film won’t come up again.',
    chosenOn: (date) => `Chosen on ${date}`,
    markedOn: (date) => `Marked on ${date}`,
    remove: (title) => `Remove ${title} from your watchlist`,
    removeAlreadySeen: (title) => `Remove ${title} from Already seen`,
    removeShort: 'Remove',
  },

  about: {
    title: 'About Spinema',
    body: 'Spinema turns “what’s on tonight?” into a short game: the wheel picks the genre, the reel picks the film, and the ticket tells you where to find it.',
    tmdbNotice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    tmdbNoticeLocal: '',
    justWatch: 'Streaming availability comes from JustWatch, via TMDB.',
    nonCommercial: 'Spinema is non-commercial: no ads and no tracking scripts.',
    tmdbLogoAlt: 'The Movie Database (TMDB)',
  },

  trailer: {
    title: (movie) => `Trailer: ${movie}`,
  },

  errors: {
    genres: 'Couldn’t load the genres. Check your connection and try again.',
    movies: 'Couldn’t load the films. Check your connection and try again.',
    details: 'Couldn’t load the ticket. Check your connection and try again.',
    notFound: 'The film in this link is no longer on TMDB. Spin the wheel for another one.',
    retry: 'Try again',
  },

  empty: {
    title: 'The reel is empty',
    body: 'No film matches your filters. Widen the length, period, rating or platforms, or spin for another genre.',
    otherGenre: 'Another genre',
    openFilters: 'Change filters',
  },

  close: 'Close',
};
