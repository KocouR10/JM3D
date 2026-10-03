# JM3D — custom web pro 3D tisk a servis 3D tiskáren

Vlastní postavená jednostránková (plus podstránky) prezentace pro firmu JM3D —
3D tisk na zakázku, servis a úpravy tiskáren, wiki o 3D tisku, cenová kalkulačka
s nahráním STL modelu a virtuální tiskárna v duchu Pronterface.

Žádný framework, žádný build step — čisté HTML/CSS/JS (ES moduly), stačí
nahrát na GitHub Pages. Vzhled vychází z estetiky LazyVim (tmavé midnight
téma, mono detaily, vim klávesy `j`/`k` scrolují po sekcích).

## Co web obsahuje

| Stránka | Co je na ní |
|---------|-------------|
| `index.html` | Hero s animovaným tiskem 3D Benchyho (reálný STL, vrstvy + infill + tryska), služby, O nás, cenová kalkulačka s 3D náhledem modelu, kontakt |
| `tiskarna.html` | Wiki — FDM/SLA/SLS, výklad G-kódu, simulátor tiskárny (Pronterface demo s G-kód konzolí a demo tiskem) |
| `vybaveni.html` | Tiskový park — specifikace strojů s technickými schématy, materiálová tabulka |
| `obrazky.html` | Galerie výtvorů (lightbox) + živý Facebook feed přes oficiální Page Plugin |

Kalkulačka umí nahrát STL (parsuje ho vlastním `js/stl-parser.js` — binární i
ASCII), spočítá objem z tetrahedrů, odhadne hmotnost a cenu a rovnou vykreslí
interaktivní 3D náhled modelu (zoom kolečkem, natáčení tažením).

## Spuštění lokálně

```bash
python3 -m http.server 8123
# → http://localhost:8123
```

## Testy (cenová logika, STL parser)

```bash
npm test
```

## Nasazení na GitHub Pages

1. Vložte repozitář na GitHub.
2. Settings → Pages → Source: Deploy from branch → branch `main`, složka `/ (root)`.

## Co si přizpůsobit

| Co | Kde |
|----|-----|
| Cenové sazby (Kč/g, Kč/hod, minimum…) | `js/config.js` |
| Formspree endpoint (kontaktní formulář) | `js/contact.js` — `FORMSPREE_ENDPOINT` |
| Kontaktní údaje | `index.html` (patička) a `js/contact.js` (chybové zprávy) |
| Texty a obsah sekcí | `index.html`, `tiskarna.html`, `vybaveni.html` |
| Barvy tématu | `styles.css` — tokeny na začátku (`:root`) |
| Obrázky do galerie | `assets/gallery/` + `assets/gallery/gallery.json` (1 položka = 1 obrázek) |
| FB stránka (widget na stránce Obrázky) | `obrazky.html` — nahraď `TVUJ_FB_PROFIL` v odkazu i v URL iframe |
| Hero 3D model | `assets/3DBenchy.stl` — vyměň za jiný STL, vše (silueta trysky, vrstvy) se přepočítá samo |