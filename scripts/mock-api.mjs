// Local stand-in for the Worker: fake TMDB responses and generated SVG posters.
// Lets you run and demo Spinema without a TMDB token:  npm run start:mock
// Dev only. Never deployed.
import { createServer } from 'node:http';

// Not `PORT`: preview tools set that for the Angular dev server.
const PORT = Number(process.env.MOCK_API_PORT ?? 8787);

// Some names use the legacy cedilla forms on purpose, as TMDB sometimes does; the app must normalize them.
const GENRES = [
  [28, 'Acţiune'], [12, 'Aventuri'], [16, 'Animație'], [35, 'Comedie'], [80, 'Crimă'],
  [99, 'Documentar'], [18, 'Dramă'], [10751, 'Familie'], [14, 'Fantastic'], [36, 'Istoric'],
  [27, 'Horror'], [10402, 'Muzică'], [9648, 'Mister'], [10749, 'Romantic'], [878, 'SF'],
  [10770, 'Film TV'], [53, 'Thriller'], [10752, 'Război'], [37, 'Western'],
].map(([id, name]) => ({ id, name }));

const WORDS_A = ['Noaptea', 'Vara', 'Umbra', 'Ultima țigară', 'Iarna', 'Strada', 'Vânătoarea', 'Liniștea', 'Trenul', 'Casa'];
const WORDS_B = ['din Ploiești', 'lui Ștefan', 'de la mare', 'fără sfârșit', 'de sticlă', 'din țară', 'cu tei', 'de pe Dâmbovița', 'cea mare', 'pierdută'];
const ORIGINAL = ['The Long Night', 'Summer of Glass', 'Last Light', 'Winter Road', 'Quiet House', 'Night Train', 'The Hunt', 'Northern Lights'];

const PROVIDERS = [
  { provider_id: 8, provider_name: 'Netflix', color: '#b20710' },
  { provider_id: 1899, provider_name: 'Max', color: '#002be7' },
  { provider_id: 337, provider_name: 'Disney Plus', color: '#0b2a6b' },
  { provider_id: 119, provider_name: 'Amazon Prime Video', color: '#00a8e1' },
  { provider_id: 2, provider_name: 'Apple TV', color: '#333333' },
  { provider_id: 3, provider_name: 'Google Play Movies', color: '#0f9d58' },
  { provider_id: 1773, provider_name: 'SkyShowtime', color: '#2f1a6b' },
];

const rand = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function movieFor(genreId, page, slot) {
  const id = genreId * 1000 + page * 20 + slot;
  const r = rand(id);
  const title = `${WORDS_A[Math.floor(r() * WORDS_A.length)]} ${WORDS_B[Math.floor(r() * WORDS_B.length)]}`;
  return {
    id,
    title,
    original_title: r() < 0.5 ? title : ORIGINAL[Math.floor(r() * ORIGINAL.length)],
    original_language: 'en',
    // About one in nine has no poster, to exercise the filter.
    poster_path: slot % 9 === 4 ? null : `/mock/${id}.svg`,
    release_date: `${1965 + Math.floor(r() * 60)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
    vote_average: Math.round((5 + r() * 4) * 1000) / 1000,
    runtime: 80 + Math.floor(r() * 90),
    genre_ids: [genreId],
  };
}

function discover(params) {
  const genreId = Number(params.get('with_genres'));
  const page = Number(params.get('page') ?? 1);
  const maxRuntime = params.get('with_runtime.lte');
  // "Film TV" has nothing with 300+ votes, and the documentary pool vanishes under 90 minutes.
  const empty = genreId === 10770 || (genreId === 99 && maxRuntime === '90');
  if (empty) return { page, results: [], total_pages: 0, total_results: 0 };
  const results = [];
  for (let slot = 0; slot < 20; slot++) {
    const movie = movieFor(genreId, page, slot);
    if (!maxRuntime || movie.runtime <= Number(maxRuntime)) results.push(movie);
  }
  return { page, results, total_pages: 37, total_results: 37 * 20 };
}

function providersFor(id) {
  const r = rand(id + 7);
  const pick = (n) => [...PROVIDERS].sort(() => r() - 0.5).slice(0, n).map((p, i) => ({
    provider_id: p.provider_id,
    provider_name: p.provider_name,
    logo_path: `/mock/logo-${p.provider_id}.svg`,
    display_priority: i,
  }));
  const region = (code) =>
    id % 6 === 0
      ? undefined
      : { link: `https://www.themoviedb.org/movie/${id}/watch?locale=${code}`, flatrate: pick(1 + (id % 3)), rent: pick(2), buy: pick(2) };
  return { RO: region('RO'), PL: id % 4 === 0 ? undefined : region('PL') };
}

function details(id, params) {
  const genreId = Math.floor(id / 1000);
  const page = Math.floor((id % 1000) / 20);
  const movie = movieFor(genreId, page, id % 20);
  const english = params.get('language') === 'en-US';
  const genre = GENRES.find((g) => g.id === genreId);
  const overview = english
    ? 'A quiet town, a missing reel of film and one long night that changes everything for the people of a small cinema.'
    : id % 7 === 0
      ? ''
      : 'Într-un oraș mic, proiecționistul cinematografului descoperă o bobină care nu figurează în niciun catalog. Pe măsură ce o derulează, întâmplările de pe ecran încep să semene cu viața spectatorilor din sală.';
  if (english) return { id, title: movie.original_title, original_title: movie.original_title, overview };
  return {
    ...movie,
    overview,
    genres: [genre, GENRES[(GENRES.indexOf(genre) + 3) % GENRES.length]].filter(Boolean),
    videos: {
      results: id % 5 === 0 ? [] : [{ key: 'aqz-KE-bpKQ', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' }],
    },
    'watch/providers': { results: providersFor(id) },
  };
}

function poster(id) {
  const r = rand(id);
  const hue = Math.floor(r() * 360);
  const movie = movieFor(Math.floor(id / 1000), Math.floor((id % 1000) / 20), id % 20);
  const lines = movie.title.split(' ');
  const half = Math.ceil(lines.length / 2);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513">
  <rect width="342" height="513" fill="hsl(${hue} 45% 28%)"/>
  <circle cx="${80 + r() * 180}" cy="${120 + r() * 160}" r="${60 + r() * 80}" fill="hsl(${(hue + 40) % 360} 60% 55%)" opacity="0.8"/>
  <rect x="0" y="360" width="342" height="153" fill="hsl(${hue} 40% 14%)"/>
  <text x="24" y="410" fill="#f1ebe0" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="30">${esc(lines.slice(0, half).join(' '))}</text>
  <text x="24" y="448" fill="#f1ebe0" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="30">${esc(lines.slice(half).join(' '))}</text>
  <text x="24" y="488" fill="#c8b8af" font-family="Arial, sans-serif" font-size="16">mock #${id}</text>
</svg>`;
}

function logo(providerId) {
  const p = PROVIDERS.find((x) => x.provider_id === providerId) ?? { provider_name: '?', color: '#555' };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="92" viewBox="0 0 92 92">
  <rect width="92" height="92" fill="${p.color}"/>
  <text x="46" y="60" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-weight="700" font-size="40">${p.provider_name[0]}</text>
</svg>`;
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const delay = 120 + Math.random() * 280;

  setTimeout(() => {
    let match;
    if ((match = /^\/img\/w\d+\/mock\/logo-(\d+)\.svg$/.exec(path))) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' });
      return res.end(logo(Number(match[1])));
    }
    if ((match = /^\/img\/w\d+\/mock\/(\d+)\.svg$/.exec(path))) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' });
      return res.end(poster(Number(match[1])));
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
    if (path === '/3/genre/movie/list') return json(res, 200, { genres: GENRES });
    if (path === '/3/discover/movie') return json(res, 200, discover(url.searchParams));
    if ((match = /^\/3\/movie\/(\d+)$/.exec(path))) {
      const id = Number(match[1]);
      if (id < 1000) return json(res, 404, { error: 'tmdb_error', status: 404, message: 'The resource you requested could not be found.' });
      return json(res, 200, details(id, url.searchParams));
    }
    return json(res, 404, { error: 'not_found', message: 'Unknown path.' });
  }, path.startsWith('/img/') ? 30 : delay);
}).listen(PORT, () => console.log(`Spinema mock API on http://localhost:${PORT}`));
