# JM3D — Web pro 3D tisk a servis 3D tiskáren

**Datum:** 2026-10-03
**Status:** Schváleno v konverzaci (varianta A, design v chatu)

## Cíl

Wow-looking, animovaný statický web pro firmu JM3D (3D tisk na zakázku, servis 3D tiskáren),
nasaditelný na GitHub Pages, s interaktivní cenovou kalkulačkou včetně STL uploadu.

## Zvolený přístup — Varianta A

Čisté HTML/CSS/JS, žádný build step. Externí knihovny pouze z CDN:
- **GSAP + ScrollTrigger** — scrollové animace, parallax, čísla s počítáním
- **Three.js** — 3D animace v hero sekcí (rotující model na tiskové podložce, reakce na myš)

## Struktura a obsah

Jedna stránka `index.html` se sekcemi:

1. **Hero** — jméno JM3D, hlavní sdělení, CTA („Odhad ceny“ → kalkulačka, „Servis“ → kontakt),
   Three.js 3D animace na pozadí/vedle textu
2. **Služby** — 3 karty: 3D tisk na zakázku, Servis a údržba tiskáren, Konzultace/modelování;
   animace při scrollu, hover efekty
3. **Kalkulačka ceny** — viz níže
4. **Kontakt** — Formspree formulář (endpoint dosud nezaregistrován → placeholder,
   uživatel doplní svůj Formspree ID a skutečné kontaktní údaje)
5. **Paticka** — kontakty, copyright

Galerie, FAQ a O nás — **nejsou ve scope** (uživatel odmítl).

## Kalkulačka ceny

Dva režimy vstupu:
- **STL upload** (primární, wow-faktor): klient-side parsování STL (binární + ASCII),
  výpočet objemu modelu (součet objemů tetrahedrů), rozměry bounding boxu.
  Žádný server — plně běží na GitHub Pages.
- **Ruční zadání** (záložní): rozměry X×Y×Z v mm, přibližná plnost modelu.

Společné parametry: materiál (PLA/PETG/ASA/TPU s hustotami), infill %, počet kusů.
Výstup: odhad hmotnosti, odhad času tisku, cena — s animovanými čísly.

### Cenový vzorec (config.js, snadno upravitelný)

```
gramy = objem_cm3 × hustota_g_cm3 × (infill faktor) × kusy
odhad_hodin = odhad podle výšky a objemu (hrubý)
cena = gramy × cenaZaGram + hodiny × sazbaZaHodinu + postProcessing
minimální objednávka = 150 Kč
```

Výchozí sazby jsou smyšlené, rozumné (cenaZaGram ≈ 1,50 Kč/g, sazbaZaHodinu ≈ 150 Kč/hod) —
uživatel je upraví. Kalkulačka je vždy jen **odhad**; v UI to musí být uvedeno
(„přesnou cenu potvrdíme po prohlídce modelu“).

## Technické poznámky

- Jediná stránka, sémantické HTML, přístupné formuláře a labely
- Dark theme, žádné fotky — grafika čistě CSS/SVG/Three.js
- Vše musí fungovat i s vypnutým JS kromě 3D animace a kalkulačky (obsah zůstane čitelný)
- STL parser: vlastní minimální implementace (binární + ASCII STL), bez závislosti na Three.js loaderu
  kvůli velikosti; Three.js se používá jen pro hero animaci
- Konstanty cen a materiálů v jednom `config.js`

## Vymezení

- Realizace: DOMContentLoaded animace, kalkulačka, formulář. Bez testovacího frameworku —
  ruční ověření v prohlížeči (otevřít index.html, projít scrollem, otestovat kalkulačku oběma režimy).
- Nasazení: GitHub Pages přes jednoduchou složku (žádný CI, žádný build).
- Git: repozitář inicializován, logické commity (init/spec → HTML kostra → CSS/služby →
  kalkulačka → kontakt/footer → animace/polish).

## Placeholder hodnoty (uživatel doplní)

- Kontakty: Jakub Mynar, info@jm3d.cz, Praha (telefon placeholder)
- Formspree endpoint: `https://formspree.io/f/VAS_ID` + komentář v kódu
- Cenové sazby: výchozí, upravitelné
