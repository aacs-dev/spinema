# Spinema — plan de design

Direcția: foaierul unui cinematograf românesc cu o singură sală, anii '60–'70.
Lambriu de nuc, catifea roșie la scaune și cortină, alamă la balustrade,
terrazzo pe jos, bilete mici tipărite pe hârtie verde-pal. Un singur element
îndrăzneț: roata, încadrată ca o marchiză cu becuri care „aleargă”. Restul
rămâne liniștit, ca un foaier înainte de film.

## Culori

Șase culori cu nume, fiecare cu valoare pentru tema deschisă și pentru tema
întunecată. Toate trăiesc ca variabile CSS în `src/styles.css` și se schimbă
prin `prefers-color-scheme`.

| Nume | Rol | Deschis | Întunecat |
|---|---|---|---|
| **Terrazzo / Sala** | fundalul paginii | `#E2E1DA` (gri rece de terrazzo, nu crem) | `#1C0B0E` (sala cu luminile stinse, catifea în umbră) |
| **Catifea** | acțiunea principală pe tema deschisă, segmente pe roată | `#8A1B2A` | `#9E2A38` |
| **Alamă** | inelul marchizei, săgeata, inelul de focus, acțiunea principală pe tema întunecată | `#7A5612` (text/focus), `#C59A3E` (decor) | `#D8B05A` |
| **Lambriu** | al treilea segment pe roată, rama porții proiectorului | `#4B2C1E` | `#4B2C1E` |
| **Bilet** | hârtia biletului (cardul filmului) | `#D3E5CB` | `#BFD5B6` (hârtie sub lumină slabă) |
| **Tuș / Ecran** | textul | `#1A2321` (tuș de tipar) | `#F1EBE0` (alb de ecran) |

Culoare de efect, aceeași în ambele teme: **Bec** `#FFE3A1` pentru becurile aprinse.

Contraste verificate (WCAG AA, calculate cu formula de luminanță relativă):
text pe sală 12,3 / 16,0; text pe bilet 12,1 / 10,3; text secundar pe bilet
7,0 / 5,9; buton catifea 8,2; buton alamă 9,3; text pe segmentele roții ≥ 6,2;
inel de focus alamă pe sală 5,1 / 9,3.

## Fonturi

Toate trei sunt self-hosted prin Fontsource (fără cereri la Google Fonts, fără tracking).

| Font | Rol | De ce |
|---|---|---|
| **Big Shoulders** (variabil, condensat) | nume de genuri pe roată, titluri de film, logo, butonul din butucul roții | literă înaltă și îngustă de firmă luminoasă; încape pe segmentele înguste ale roții; are minuscule, deci respectă sentence case |
| **Atkinson Hyperlegible Next** (variabil) | tot textul de interfață, rezumate, butoane | proiectat pentru lizibilitate maximă; contează seara, pe telefon, cu lumina stinsă |
| **Atkinson Hyperlegible Mono** | „imprimeul” de pe bilet: an, durată, notă, serie, rând și loc, jetoane | cifre tabulare, aspect de ștampilă de casă de bilete |

**Diacritice verificate explicit.** Am deschis fișierele woff2 (subsetul
latin-ext) cu fontTools: toate trei au glife proprii pentru U+0218/U+0219
(Ș/ș) și U+021A/U+021B (Ț/ț), distincte de glifele cu sedilă (U+015E/U+015F,
U+0162/U+0163). Ă/ă sunt în latin-ext, Â/â și Î/î în latin. În plus:
- dicționarul de texte e testat să nu conțină caractere cu sedilă;
- textele venite de la TMDB în `ro-RO` sunt normalizate (ş→ș, ţ→ț), pentru că
  baza lor de date conține ambele forme.

## Wireframe-uri la 375 px

### Ecranul de start

```
┌───────────────────────────────────┐
│ Spinema            ◉ ◉ ◉  [▤] [⚙] │  logo · trei jetoane · istoric · setări
│                                   │
│                 ▼                 │  săgeată de alamă
│          · · · · · · · ·          │
│       ·  ╱ Dramă │Comedie╲  ·     │  inel de marchiză cu 32 de becuri
│     ·  ╱ Crimă ╲ │ ╱ Acțiune╲  ·  │
│    ·  │──────╲ ╭─────╮ ╱──────│ · │  roata ≈ 340 px, genuri radiale
│    ·  │Horror ─│Învârte│─ Animație│ │  butucul de alamă = acțiunea principală
│    ·  │──────╱ ╰─────╯ ╲──────│ · │
│     ·  ╲ Mister╱ │ ╲Familie╱  ·   │
│       ·  ╲  SF   │ Western╱  ·    │
│          · · · · · · · ·          │
│                                   │
│     Învârte roata. Filmul de      │  o singură frază de ajutor
│     diseară îl alege ea.          │
│                                   │
│     Orice durată · România        │  filtrele active, apăsabil → setări
│                                   │
│ Despre                            │
└───────────────────────────────────┘
```

### Rola cu afișe

```
┌───────────────────────────────────┐
│ Spinema            ◉ ◉ ○  [▤] [⚙] │
│                                   │
│             Comedie               │  genul ales, font de marchiză
│        ╲                 ╱        │  fasciculul proiectorului (formă
│         ╲               ╱         │  translucidă plată, fără gradient)
│       ┌─┬───────────────┬─┐       │
│       │▯│  afiș (margine)│▯│      │  perforații de peliculă pe ambele părți
│       │▯├───────────────┤▯│       │
│       │▯│               │▯│       │
│       │▯│  afișul din   │▯│       │  fereastra porții: un afiș întreg
│       │▯│  fereastră    │▯│       │  200 × 300, vecinii abia se văd
│       │▯│   200 × 300   │▯│       │
│       │▯├───────────────┤▯│       │
│       │▯│  afiș (margine)│▯│      │
│       └─┴───────────────┴─┘       │
│                                   │
│        Se derulează bobina…       │
└───────────────────────────────────┘
```

### Cardul filmului (bilet)

```
┌───────────────────────────────────┐
│ Spinema            ◉ ◉ ○  [▤] [⚙] │
│ ┌───────────────────────────────┐ │  hârtie verde-pal, colțuri drepte,
│ │ Spinema · Sala 1   Seria 27205│ │  fără umbră
│ │ ┌───────┐ Titlul românesc     │ │  titlu: Big Shoulders
│ │ │       │ Original title      │ │
│ │ │ afiș  │ 2019 · 7,3 · 2 h 4 m│ │  imprimeu mono
│ │ │ 112 px│ Comedie, Dramă      │ │
│ │ └───────┘                     │ │
│ │ Rezumatul filmului, trei-patru│ │
│ │ rânduri, lizibil...           │ │
│ │ [▶ Vezi trailerul]            │ │
│ │ Unde îl vezi în România       │ │
│ │ Abonament  [N] [H] [D]        │ │  logo-uri w92
│ │ Închiriere [A] [G]            │ │
│ │ Date de disponibilitate:      │ │
│ │ JustWatch                     │ │
│ ◖ - - - - - - - - - - - - - - - ◗ │  perforație cu crestături
│ │ Rând 7 · Loc 12    26.10.2026 │ │  cotorul biletului
│ │ [        Îl vedem!          ] │ │  acțiunea principală
│ │ [ Altă tură · 1 jeton ]       │ │
│ │ [ Salvează pentru altă dată ] │ │
│ │ [ Trimite ]                   │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

## Trei principii Spinema

1. **Un singur moment de spectacol.** Marchiza și rotirea sunt spectacolul.
   Restul e foaier: suprafețe plate, fără animații de intrare, fără hover pe
   orice. Dacă un element nou cere atenție, concurează cu roata și pierde.
2. **Biletul e decizia.** Rezultatul arată ca un bilet tipărit pentru seara
   asta: data, rând și loc, cotor. Jetoanele sunt puține și vizibile ca monede.
   Interfața spune „asta e filmul”, nu „mai caută”.
3. **Lizibil în sala întunecată.** Telefonul trece din mână în mână, seara,
   cu lumina stinsă: tema întunecată e la fel de lucrată ca cea deschisă,
   ținte de cel puțin 44 px, text de cel puțin 16 px, nimic care se citește
   doar la lumină.

## Revizuire: ce arăta generic și ce am schimbat

| Prima variantă | De ce era generică | Ce am ales în loc |
|---|---|---|
| Fundal cărbune cu accent auriu | „premium dark” de orice aplicație | sala întunecată ca o catifea în umbră, plus trei materiale: alamă, catifea, hârtie de bilet |
| A treia culoare pe roată: verdele biletului | roșu + auriu + verde = Crăciun | lambriu de nuc, materialul pereților de foaier |
| Cardul rezultatului cu colțuri rotunjite și umbră moale | cardul identic al oricărui dashboard | bilet plat cu colțuri drepte, crestături semicirculare și linie de perforație; cotorul are rând, loc și data serii |
| Genuri afișate ca „chips” rotunjite | componentă de UI kit | genurile sunt tipărite pe bilet ca text simplu, separate prin virgulă |
| Contor „2/3” pentru re-spinuri | numărătoare abstractă | trei jetoane rotunde de alamă; cele cheltuite rămân doar contur |
| Spinner circular la încărcare | pattern implicit | fereastra goală a proiectorului cu textul „Se încarcă bobina…” |
| Etichetă mică cu majuscule „REZULTATUL TĂU” deasupra titlului | eyebrow label, explicit de evitat | antetul biletului în imprimeu mono, sentence case: „Spinema · Sala 1” |
| Butoane cu „→” | explicit de evitat | verbe active, fără săgeți: „Învârte”, „Îl vedem!” |
| Rola ca un carusel orizontal cu fade pe margini | carusel generic | peliculă verticală cu perforații care trece prin poarta proiectorului, sub un fascicul de lumină plat |

---

# Versiunea 2: de la corect la memorabil

## Ce era slab în prima versiune

1. **Ecranul de start nu avea ierarhie.** Roata plutea într-un câmp gol, fără titlu; pe un telefon înalt, jumătatea de jos rămânea goală. Indiciul era un rând mic, gri, iar filtrele arătau ca un link rătăcit.
2. **Roata era plată.** Culorile stăteau toate în același plan, becurile erau simple puncte fără lumină, iar butucul nu arăta a buton.
3. **Logo-ul era doar text bold în culoarea alamei.**
4. **Cardul arăta ca o fișă verde cu conținut, nu ca un bilet.** Nu avea chenar tipărit, datele stăteau pe un rând lejer, iar rândul și locul erau mici.
5. **Pe desktop totul era o coloană îngustă într-o pagină goală.**

## Ce schimb

| Zonă | Decizie |
|---|---|
| Tipografie | Un al patrulea nivel, **Spinema Marquee** (Big Shoulders Inline, cu linia interioară a literelor de firmă luminoasă), doar pentru momentele de brand: logo, titlul „Ce vedem diseară?” și genul ales. E un subset de 23 kB, cu literele românești și o singură grosime. |
| Ecranul de start | Titlu mare plus o frază scurtă, roata, apoi **Programul serii**: un panou de foaier cu litere albe pe fetru negru, cu șanțuri. Panoul arată filtrele și deschide setările. Înlocuiește linkul. |
| Roata | Becuri în dulie, cu halou când sunt aprinse; inele de alamă cu relief; nituri pe margine; un butuc ridicat, care se apasă; umbră pe podea. |
| Fundal | Granulație de peliculă, statică și foarte slabă, sub conținut. Dă textură fără să fie un gradient. |
| Bilet | Chenar dublu tipărit, antet cu serie și număr, câmpuri etichetate (an, durată, notă), rând și loc mari pe cotor, „Valabil numai în seara emiterii.” După „Îl vedem!” apare o ștampilă roșie „Controlat”, ca la controlorul de bilete. |
| Desktop | Biletul devine orizontal, cu cotorul în dreapta și perforația verticală; roata crește până la 460 px. |

## Revizuire

- **Panoul cu litere și ștampila** vin direct din foaierele românești de cinema și nu există în niciun UI kit. Rămân.
- **Granulația** e un efect frecvent în designul „retro”. O păstrez doar la opacitate de 4–6%, ca material, nu ca stil.
- **Fontul inline** riscă să pară parc de distracții dacă apare peste tot. Îl limitez la trei locuri; tot restul rămâne Big Shoulders simplu.
- **Ce n-am adăugat:** cortină pe marginea de sus, spoturi de lumină sau neoane. Ar fi concurat cu roata, iar principiul 1 rămâne: un singur moment de spectacol.
