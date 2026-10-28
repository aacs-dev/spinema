# Spinema

Ruleta pentru „ce vedem diseară?”. Învârți roata genurilor, o bobină de afișe alege filmul,
iar biletul îți arată tot ce trebuie ca să începi: notă, durată, rezumat, trailer și unde îl
găsești pe streaming în România sau Polonia.

- Aplicație Angular statică, publicată pe GitHub Pages: `https://aacs-dev.github.io/spinema/`
- Un Cloudflare Worker mic ține tokenul TMDB și face proxy către API. Tokenul nu ajunge niciodată în frontend.
- Direcția vizuală și deciziile de design: [DESIGN.md](DESIGN.md).

## Configurația actuală

| Ce | Valoare | Unde |
|---|---|---|
| Contul GitHub | `aacs-dev` | `ALLOWED_ORIGINS` în `worker/wrangler.toml` |
| Worker-ul publicat | `https://spinema-proxy.cinequest-app.workers.dev` | `workerUrl` în `src/environments/environment.ts` |

Repository-ul trebuie să se numească `spinema`, pentru că build-ul folosește `--base-href /spinema/`.

## Rulare locală

Ai nevoie de Node.js 24 (LTS).

```bash
npm ci
```

### Fără token TMDB (date mock)

`scripts/mock-api.mjs` imită Worker-ul cu filme inventate și afișe generate, ca să poți vedea și
testa tot fluxul fără cont TMDB:

```bash
npm run start:mock
```

Deschide `http://localhost:4200`. Mock-ul are intenționat și cazuri limită: genul „Film TV” nu
are filme (starea „Bobina e goală”), unele filme n-au afiș, rezumat în română, trailer sau
platforme de streaming.

### Cu date reale

1. Pune tokenul în `worker/.dev.vars` (fișierul e ignorat de git):
   ```
   TMDB_READ_TOKEN=eyJhbGciOi...
   ```
2. Instalează o dată dependențele Worker-ului:
   ```bash
   cd worker && npm ci && cd ..
   ```
3. Pornește Worker-ul local (portul 8787) și aplicația, cu o singură comandă:
   ```bash
   npm run dev
   ```
   Sau separat, în două terminale: `npm run dev` în `worker/` și `npm start` în rădăcină.

Configurația `development` (`ng serve`) folosește `src/environments/environment.development.ts`,
care trimite cererile la `http://localhost:8787`.

### Probleme frecvente

- **„Nu am putut încărca filmele” într-o rețea de firmă.** Unele proxy-uri (de exemplu Zscaler)
  redirecționează cererile spre `api.themoviedb.org` către o pagină de autentificare. Browserul trece
  de ea, dar Worker-ul local nu. În cazul ăsta, Worker-ul răspunde cu
  `{"error":"upstream_redirected", …}` și numele proxy-ului. Ai trei variante: `npm run start:mock`,
  altă rețea, sau Worker-ul publicat pe Cloudflare, care apelează TMDB din rețeaua Cloudflare.
- **„Port 4200 is already in use”.** Mai rulează un `ng serve`. Oprește-l. Dacă aplicația pornește pe
  alt port, Worker-ul o refuză cu 403, pentru că permite doar `http://localhost:4200`.

## Tokenul TMDB

1. Fă-ți cont pe [themoviedb.org](https://www.themoviedb.org/signup).
2. Mergi la **Settings → API** și cere o cheie pentru uz personal/necomercial.
3. Copiază **API Read Access Token** (cel lung, care începe cu `eyJ`), nu „API Key”.
   Worker-ul îl trimite ca `Authorization: Bearer …`.

## Deploy pentru Worker

```bash
cd worker
npm ci
npx wrangler login
npx wrangler secret put TMDB_READ_TOKEN
npx wrangler deploy
```

`wrangler deploy` afișează URL-ul Worker-ului. Pune-l în `src/environments/environment.ts` la
`workerUrl`. Nu e un secret: Worker-ul acceptă doar `GET` pe cinci căi TMDB și doar de la originile
din `ALLOWED_ORIGINS`.

Ce face proxy-ul (`worker/src/index.ts`):

- permite doar `/3/genre/movie/list`, `/3/discover/movie`, `/3/movie/{id}`, `/3/watch/providers/movie` și `/3/watch/providers/regions` (lista de țări); restul primește 404;
- elimină orice parametru `api_key` venit din browser;
- CORS doar pentru `https://aacs-dev.github.io` și `http://localhost:4200`; alte origini primesc 403;
- cache cu Cache API: genuri 24 h, discover 1 h, detalii film 6 h, platforme și țări 24 h; trimite și `Cache-Control`, deci și browserul păstrează răspunsurile;
- erorile TMDB se întorc cu același cod HTTP și un JSON scurt: `{ "error": "tmdb_error", "status": 404, "message": "…" }`.

> Documentația Cloudflare garantează Cache API doar pentru Worker-ele legate de un domeniu propriu.
> Pe Worker-ul publicat pe `workers.dev` cache-ul funcționează: a doua cerere identică primește
> `X-Spinema-Cache: HIT`. Dacă Cloudflare schimbă asta, răspunsurile rămân corecte, doar că fiecare
> cerere ajunge la TMDB.

Testele Worker-ului: `cd worker && npm test`.

### Deploy automat (opțional)

`.github/workflows/worker.yml` publică Worker-ul la fiecare push pe `main` care atinge `worker/`.
Adaugă în repository secretele `CLOUDFLARE_API_TOKEN` (șablonul „Edit Cloudflare Workers”) și
`CLOUDFLARE_ACCOUNT_ID`. Tokenul TMDB rămâne setat doar cu `wrangler secret put`.

## GitHub Pages

1. Urcă proiectul într-un repository numit `spinema`, pe branch-ul `main`.
2. În repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Fără setarea asta, workflow-ul nu are unde publica.
3. La fiecare push pe `main`, `.github/workflows/deploy.yml`:
   1. rulează `npm ci`;
   2. rulează testele headless (`ng test --watch=false`);
   3. face build cu `ng build --base-href /spinema/`;
   4. copiază `index.html` în `404.html` și adaugă `.nojekyll`;
   5. verifică că în `dist/` nu există nimic care seamănă cu un token TMDB;
   6. urcă `dist/spinema/browser` cu `actions/upload-pages-artifact` și publică cu `actions/deploy-pages`.

Linkurile de share sunt de forma `https://aacs-dev.github.io/spinema/?film=550`. Folosesc
parametri de query, nu rute, așa că totul rămâne pe `index.html` și Pages nu întoarce 404.

## Aplicație instalabilă (PWA)

- **Instalare.** Pe Android, Chrome oferă „Instalează aplicația” sau „Adaugă pe ecranul de pornire”.
  Pe iPhone: Safari → butonul Partajează → „Adaugă pe ecranul principal”. Aplicația se deschide
  apoi pe tot ecranul, cu iconița roții.
- **Fișiere.** `public/manifest.webmanifest` (nume, culori, iconițe) și `public/icons/`:
  `icon.svg` și `icon-maskable.svg` sunt sursa, PNG-urile (192, 512, maskable 512, apple-touch 180)
  sunt randate din ele. Varianta „maskable” ține roata în cercul central de 80 %, pe care Android îl
  poate decupa.
- **Service worker.** `@angular/service-worker`, configurat în `ngsw-config.json`, doar în build-ul
  de producție (`ng serve` nu îl folosește). Aplicația (JS, CSS, fonturi, cele trei limbi) se descarcă
  la instalare. Răspunsurile Worker-ului se păstrează 7 zile (rețeaua întâi, cache-ul după 6 s sau
  offline), afișele TMDB 30 de zile. Așa merg offline istoricul, listele și biletele deschise
  înainte; roata are nevoie de internet pentru filme noi. Când rețeaua cade, sub antet apare un
  mesaj.
- **Actualizări.** După un deploy, service worker-ul descarcă versiunea nouă în fundal, iar sub antet
  apare „Spinema are o versiune nouă” cu butonul „Reîncarcă”. Fără clic, versiunea nouă pornește la
  următoarea deschidere.
- **Dacă schimbi Worker-ul**, schimbă URL-ul și în `ngsw-config.json` (`dataGroups → tmdb-api`), nu
  doar în `src/environments/environment.ts`; altfel răspunsurile lui nu mai sunt păstrate offline.

## Limbi

Română (implicit), engleză și maghiară. Limba se alege în setări („Limba / Language / Nyelv”); până
atunci, aplicația o ia pe prima pe care o cunoaște din limbile browserului, altfel română.

- **Texte.** `src/app/i18n/ro.ts`, `en.ts`, `hu.ts`, toate de tipul `Dictionary` din `strings.ts`, deci
  TypeScript nu lasă să lipsească nimic. Româna e în bundle-ul principal; engleza și maghiara (câte
  ~7 kB) se încarcă doar pentru cine le folosește, înainte de pornirea aplicației (`src/main.ts`).
- **Schimbarea limbii reîncarcă pagina.** Textele se citesc o dată, la pornire; setările, jetoanele și
  listele rămân, fiind în localStorage.
- **Date TMDB.** Titlurile, rezumatele și genurile vin în limba aleasă (`ro-RO`, `en-US`, `hu-HU`).
  Dacă un film n-are rezumat în română sau maghiară, se arată cel englezesc, cu mențiunea „Rezumat
  în engleză”. Trailerele în limba aleasă au prioritate.
- **Formate.** Note și date după limbă: „7,3” și „28.10.2026” în română, „7.3” și „28/10/2026” în
  engleză, „7,3” și „2026. 10. 28.” în maghiară. Durata: „2 h 12 min”, „2h 12m”, „2 ó 12 p”.
- **Gramatică.** Româna pune „de” de la 20 în sus („20 de platforme”). Maghiara alege articolul după
  primul sunet („a Horror”, „az Akció”) și sufixul deceniului după pronunție („60-as”, „70-es évek”).
- **Testele** verifică ortografia: ș/ț cu virgulă în română, ő/ű (nu õ/û/ô) în maghiară, plus notița
  TMDB, care rămâne în engleză în toate limbile.
- **Mock-ul** (`npm run start:mock`) întoarce genurile și titlurile tot în română, oricare ar fi limba.

## Atribuiri obligatorii

- **TMDB.** Dialogul „Despre Spinema” are logo-ul oficial TMDB, mai mic decât logo-ul Spinema,
  și textul: *This product uses the TMDB API but is not endorsed or certified by TMDB.*
  Logo-ul se încarcă de pe themoviedb.org (constanta `TMDB_LOGO_URL` din `src/app/ui/about-dialog.ts`).
  Dacă preferi să-l găzduiești tu, descarcă-l de pe [pagina de logo-uri TMDB](https://www.themoviedb.org/about/logos-attribution),
  salvează-l ca `public/tmdb-logo.svg` și schimbă constanta în `'tmdb-logo.svg'`.
- **JustWatch.** Datele despre platformele de streaming vin de la JustWatch prin TMDB; secțiunea
  „Unde îl vezi” are atribuirea „Date de disponibilitate: JustWatch”.
- Aplicația e necomercială: fără reclame, fără analytics, fără scripturi de urmărire. Fonturile
  sunt găzduite local, nu prin Google Fonts.

## Scripturi

| Comandă | Ce face |
|---|---|
| `npm run dev` | Worker-ul local (`wrangler dev`, 8787) + `ng serve`, cu date reale |
| `npm run start:live` | `ng serve` legat de Worker-ul publicat pe Cloudflare, cu date reale, fără Worker local |
| `npm start` | doar `ng serve`, cu Worker-ul pornit separat pe 8787 |
| `npm run start:mock` | mock API + `ng serve`, fără token |
| `npm run build` | build de producție în `dist/spinema/browser` |
| `npm run build:pages` | build cu `--base-href /spinema/` |
| `npm test` | teste în mod watch |
| `npm run test:ci` | teste o singură dată, headless |

## Structura

```
src/app/
  core/        TmdbService, PickerService, NightService, StorageService, ShareService,
               SettingsService, LibraryService, SoundService, modele și utilitare
  game/        mașina de stări (spin-machine.ts) și store-ul cu semnale (game.store.ts)
  wheel/       GenreWheel (SVG) și matematica rotirii
  reel/        PosterReel (bobina verticală)
  card/        MovieCard (biletul)
  ui/          TokenCounter, SettingsPanel, HistoryDrawer, AboutDialog, TrailerModal, iconuri
  i18n/        strings.ts (tipul Dictionary și încărcarea), ro.ts, en.ts, hu.ts, language.ts
worker/        proxy-ul Cloudflare și wrangler.toml
scripts/       mock API pentru dezvoltare
```

## Decizii și presupuneri

- **Stări.** `idle → spinningGenre → genreChosen → loadingMovies → spinningReel → result`, plus
  `error` și `empty`. Tranzițiile permise sunt în `src/app/game/spin-machine.ts`; orice altă tranziție
  aruncă o eroare. `loadingMovies → result` (fără bobină) e folosit pentru linkuri trimise, filme din
  listă și reduced motion.
- **Jetoane.** Prima tură a serii e gratuită. După ce a apărut un rezultat, orice tură nouă costă un
  jeton: alt film din același gen sau alt gen. Reîncărcarea paginii nu dă o tură gratuită. Din starea
  „Bobina e goală” sau după o eroare, încercarea din nou nu mai costă. Seara (`{ tokens, startedAt, seenIds }`)
  se resetează în fiecare dimineață la 06:00, după ora telefonului, sau din „Seară nouă”. Brief-ul cerea
  6 ore de la deschiderea aplicației; resetarea la 06:00 nu cade niciodată în mijlocul unei seri de film,
  iar o sesiune care trece de miezul nopții rămâne în seara ei.
- **Excluderi.** Filmele arătate ca rezultat în seara asta (`seenIds`) nu mai ies până la seara
  următoare. Filmele alese cu „Îl vedem!” (oricând, din istoricul de 50) și cele marcate „Am văzut
  deja” nu mai ies niciodată. Lista „Deja văzute” ține cel mult 500 de filme și se poate edita din
  „Filmele tale”. „Am văzut deja” doar marchează filmul: biletul rămâne, fără tură gratuită.
- **Formula roții.** Formula din brief presupune că roata pornește de la un multiplu de 360°. După
  prima rotire nu mai e așa, deci unghiul de aterizare e calculat față de poziția curentă. Pentru
  poziții multiple de 360° rezultatul e identic (testat).
- **Trailere.** Cererea de detalii adaugă `include_video_language=ro,en,null`; altfel TMDB întoarce
  doar videoclipurile în română și aproape niciun film n-ar avea trailer.
- **Platforme gratuite.** Pe lângă abonament, închiriere și cumpărare, biletul arată și „Gratuit”
  (`free` și `ads` din TMDB), după abonament.
- **Platformele mele.** În setări bifezi abonamentele pe care le ai, separat pentru România și
  Polonia. Căutarea trimite atunci `watch_region`, `with_watch_providers` (separate prin `|`, adică
  „oricare”) și `with_watch_monetization_types=flatrate|free|ads`: doar filme pe care le poți porni
  pe loc, nu de închiriat sau cumpărat. Lista vine din `/3/watch/providers/movie`, deja permis în
  Worker, deci Worker-ul nu trebuie republicat. Ordinea TMDB pune servicii de nișă înaintea
  HBO Max, așa că primele arătate sunt platformele cunoscute (`src/app/core/platforms.ts`), iar
  restul stau sub „Alte platforme”. Pe bilet, logourile platformelor tale au o bifă.
- **Țara („Unde te uiți”).** Orice țară pentru care TMDB are date de streaming. Lista vine din
  `/3/watch/providers/regions` (prin Worker), iar numele țărilor le dă browserul în limba interfeței
  (`Intl.DisplayNames`: „Republica Moldova”, „Olaszország”, „United Kingdom”). Alegerea e un singur
  `<select>` nativ în setări: prima opțiune e „Automat, după fusul orar: România”, apoi „Recomandate”
  (România, Moldova, Ungaria, Polonia și țara detectată), apoi „Toate țările”, în ordine alfabetică.
  Dacă lista TMDB nu se poate încărca (offline sau un Worker mai vechi), selectorul folosește lista
  locală din `src/app/core/region.ts`.
  - **Automat, după fusul orar** (`TIME_ZONE_REGIONS`): toată Europa, plus fusurile mari din SUA,
    Canada, America Latină, Asia și Oceania. Un fus orar se citește local, fără permisiuni și fără
    rețea; o localizare după IP ar fi păcălită de VPN-uri și de proxy-uri ca Zscaler. Un fus care nu
    indică o țară (de exemplu `UTC`) duce la România, iar setările spun asta.
  - **Se vede mereu:** în titlul „Programul serii · România”, pe bilet („Unde îl vezi în România”) și
    în setări, cu „Aleasă automat…” sau „Aleasă de tine.”.
  - În setări, `region: null` înseamnă automat; o țară salvată de o versiune mai veche rămâne aleasă.
    Bifele de la „Platformele mele” se păstrează pe țară.
  - **După actualizare, republică Worker-ul**, ca să permită calea nouă:
    `cd worker`, apoi `npx wrangler deploy`. Până atunci, aplicația merge cu lista locală de țări.
- **Perioada și nota minimă.** În setări, lângă durată: deceniul (anii ’60 … anii 2020), trimis ca
  `primary_release_date.gte/lte`, și nota TMDB minimă (6, 7 sau 8), trimisă ca `vote_average.gte`.
  Nota e media voturilor, de încredere pentru că roata cere oricum cel puțin 300 de voturi. Pe
  „Programul serii” apar pe un singur rând: „Anii ’90 · Nota 7+”. Ecranul „Bobina e goală”
  sugerează acum lărgirea oricărui filtru.
- **Veto de grup.** Pe ecranul de start, 2–6 persoane scot pe rând câte un gen de pe roată
  (`src/app/game/group-veto.ts`). Genurile se aleg din butoane, nu atingând felia, ca să meargă și
  cu tastatura sau cu cititorul de ecran. Vetoul face parte din seară (`vetoedGenreIds`): ține și
  pentru „Alt gen”, supraviețuiește reîncărcării și se șterge la 06:00, din „Seară nouă” sau din
  „Anulează vetoul”. Un veto nou îl înlocuiește pe cel vechi. Pe roată rămân mereu cel puțin 3
  genuri, iar vetoul nu se poate schimba cât timp roata sau bobina se mișcă. Nu costă jetoane.
- **Diacritice.** Textele de la TMDB sunt normalizate de la ş/ţ (sedilă) la ș/ț (virgulă).

## Dependențe

Runtime: Angular (inclusiv `@angular/service-worker`), `canvas-confetti` (cerut de brief, încărcat la
nevoie), trei pachete Fontsource (fișiere de font self-hosted, fără JavaScript). Nimic altceva.

Fontul de firmă (`public/fonts/spinema-marquee-*.woff2`) e un subset de 24 kB din Big Shoulders Inline
(OFL 1.1, licența e în `public/fonts/`), cu o singură grosime și doar literele românești, maghiare și
englezești, cifrele și punctuația. E declarat și preîncărcat în `src/index.html`, unde e descrisă și comanda de regenerare.
