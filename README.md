# JM3D — web

Statický web pro firmu JM3D: 3D tisk na zakázku a servis 3D tiskáren.
Bez build stepu — stačí nahrát na GitHub Pages. Vzhled vychází z estetiky
LazyVim (tmavé midnight téma, mono detaily, vim klávesy j/k scrolují).

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
| Texty a obsah sekcí | `index.html` |
| Barvy tématu | `styles.css` — tokeny na začátku (`:root`) |
