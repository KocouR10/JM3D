# JM3D – web pro 3D tisk na zakázku

Web [jm3d.cz](https://jm3d.cz): 3D tisk z modelu zákazníka, náhradní díly podle
předlohy, prototypy, poradenství a firmware tiskáren, wiki o 3D tisku a simulátor
tiskárny ve stylu Pronterface.

Čisté HTML, CSS a JavaScript (ES moduly), bez frameworku a bez build kroku.
Nasazuje se přes GitHub Pages z větve `main`.

## Stránky

| Soubor | Obsah |
|---|---|
| `index.html` | Úvod, služby, Z dílny (fotky), postup, O mně, časté dotazy, kontakt, strukturovaná data `LocalBusiness` |
| `tiskarna.html` | Wiki: FDM, SLA, SLS, G-kód, simulátor tiskárny (demo) |
| `vybaveni.html` | Tiskárny a materiály |
| `obrazky.html` | Galerie fotek + odkaz na Facebook |
| `kalkulacka.html` | Orientační kalkulačka ceny se 3D náhledem STL, **ve vývoji** (`noindex`, není v menu) |
| `obchodni-podminky.html` | Obchodní podmínky, reklamační řád, odstoupení, mimosoudní řešení sporů |
| `soukromi.html` | Zásady ochrany osobních údajů |
| `404.html` | Stránka „nenalezeno“ |

## Technika

- **Bez cizích serverů:** Three.js (`js/vendor/`) i fonty Barlow, Barlow Condensed
  a JetBrains Mono (`assets/fonts/`) jsou uložené lokálně. Web nepoužívá cookies.
- **CSP** je v `<meta http-equiv>` na každé stránce. Při přidání externího zdroje ji uprav.
- **STL** se zpracuje jen v prohlížeči (`js/stl-parser.js`), s limity velikosti a kontrolou dat.
- **Vzhled „technický výkres“:** tokeny barev a písma jsou na začátku `styles.css`.

## Spuštění a testy

```bash
python3 -m http.server 8123   # → http://localhost:8123
npm test                      # cenová logika a parser STL
```

## Kde co upravit

| Co | Kde |
|---|---|
| Cenové sazby kalkulačky | `js/config.js` |
| Kontaktní formulář (Formspree) | `js/contact.js` → `FORMSPREE_ENDPOINT` |
| Údaje o provozovateli | `index.html` (sekce `#udaje`, JSON-LD), patička všech stránek, `obchodni-podminky.html`, `soukromi.html` |
| Fotky v galerii | `assets/gallery/` + `assets/gallery/gallery.json` |
| Odkaz na Facebook | `obrazky.html`, JSON-LD v `index.html` |

## Mezipaměť stylů

Cloudflare drží `styles.css` v prohlížečích 4 hodiny. Po každé změně stylů zvyš verzi
v odkazu na všech stránkách (`styles.css?v=RRRRMMDDHHMM`), jinak návštěvníci uvidí
nový HTML se starými styly.

## Licence

Všechna práva vyhrazena, viz [LICENSE](LICENSE). Knihovny v `js/vendor/`
a fonty v `assets/fonts/` mají vlastní licence.
