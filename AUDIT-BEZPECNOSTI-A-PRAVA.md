# Bezpečnostní, technický a právní audit — JM3D

> **Účel:** pracovní audit zdrojového kódu pro kontrolu před případným nasazením. Tento dokument není bezpečnostní certifikace, penetrační test ani právní stanovisko. Zjištění je nutné ověřit proti skutečně nasazenému webu a konkrétnímu způsobu podnikání.
>
> **Rozsah kontroly:** statické soubory a JavaScript v repozitáři `KocouR10/JM3D`, zejména hlavní stránky, skripty kalkulačky, parser STL, kontaktní formulář, galerie, simulátor tiskárny, testy a soubory pro GitHub Pages/SEO. Kontrola vychází ze zdrojového snapshotu `790d5f0d2d8ebef8ce055975d1344db68fb7284e` (větev `main`).
>
> **Omezení:** nebyl proveden dynamický penetrační test, spuštění testů, sken nasazené domény, kontrola DNS/TLS/HTTP hlaviček ani formální právní posouzení. Závěry proto popisují pouze zkontrolovaný zdrojový kód, nikoli nutně současné chování produkčního webu.

## Shrnutí

Projekt je statický web bez zjevného backendu nebo databáze. STL soubory se podle kódu zpracovávají v prohlížeči a galerie vkládá textové údaje přes `textContent`, což omezuje některá běžná rizika. V prohlédnutém kódu nebyla zjištěna zjevná kritická serverová zranitelnost.

Projekt však **není připravený k bezstarostnému komerčnímu nasazení**. Před spuštěním je potřeba zejména vyřešit práva k použití, nahradit placeholdery, nakonfigurovat formulář, prověřit ochranu soukromí, zpřísnit zpracování STL a opravit výpočet v ručním režimu kalkulačky.

## Zjištění podle priority

### Kritické pro právo k použití / blokující komerční převzetí

#### 1. Repozitář nemá deklarovanou licenci

- Metadata repozitáře uvádějí `license: null`; v kořenovém seznamu souborů není soubor `LICENSE`.
- Veřejná dostupnost repozitáře sama o sobě neuděluje právo k použití, úpravám ani komerčnímu nasazení.
- Před převzetím kódu si vyžádejte od držitele práv výslovné svolení nebo licenci. Samostatně ověřte práva ke každému obrázku, modelu, logu, diagramu, textu a fontu. Licence ke kódu nemusí pokrývat všechny vložené materiály.

#### 2. Obsah a identita jsou nedokončené / specifické pro JM3D

Zkontrolované příklady:

- `CNAME` obsahuje `jm3d.cz`.
- HTML obsahuje značku JM3D, jméno, e-mail a lokalitu Praha.
- `obrazky.html` používá placeholder `TVUJ_FB_PROFIL` v odkazu i Facebook embedu.
- `assets/gallery/gallery.json` popisuje galerijní položky jako placeholdery.
- `js/contact.js` obsahuje nefunkční Formspree endpoint `https://formspree.io/f/VAS_ID`.
- Hlavní stránka sama říká, že kalkulačka je ve vývoji a výsledek je orientační.

Pokud web není provozován právě pro JM3D, odstraňte/nahraďte identitu, kontakty, doménu, obsah i metadata. Placeholdery buď nahraďte ověřeným obsahem, nebo danou funkci dočasně vypněte.

### Vysoká priorita — technika a soukromí

#### 3. Ruční režim kalkulačky pravděpodobně započítává výplň dvakrát

- `js/calculator-ui.js`, funkce `manualVolume()`, násobí kvádr rozměrů zadaným procentem výplně a vrací tento výsledek jako `volumeCm3`.
- `js/calculator.js`, funkce `estimateGrams()`, potom použije další korekci výplně přes `infillFactor(infillPct, config)`.
- Při ručním režimu se tedy procento výplně z pole `dim-fill` promítne do objemu a zároveň se znovu uplatní procento z kalkulačního posuvníku. Výsledný odhad hmotnosti/ceny může být podhodnocený. Je třeba rozhodnout, který vstup má představovat skutečnou výplň, upravit datový model a doplnit regresní test pro ruční režim.

Kalkulačka je současně označena jako orientační. Toto upozornění ponechte, dokud výpočty a cenové sazby nebudou ověřeny v reálném provozu.

#### 4. Parser STL potřebuje přísnější validaci a limity

Relevantní soubory: `js/calculator-ui.js`, `js/stl-parser.js`, `test/stl-parser.test.mjs`.

Pozitivní zjištění:

- UI omezuje velikost souboru na 50 MB.
- Binární STL kontroluje minimální i očekávanou délku a počet trojúhelníků.
- Parser má testy pro některé chybné/degenerované soubory.
- Nahrání je zpracováno přes `file.arrayBuffer()` v prohlížeči; podle kontrolovaného kódu se samotný STL neposílá na server.

Rizika a mezery:

- Soubor do 50 MB může obsahovat mnoho trojúhelníků. Parser vytváří další pole a Three.js následně vytváří geometrii náhledu; velký vstup může spotřebovat hodně RAM/CPU a zpomalit či zaseknout zařízení návštěvníka.
- Souřadnice ASCII jsou odmítnuty při `NaN`, ale kontrola nevyžaduje `Number.isFinite`; je třeba explicitně odmítnout `Infinity` a ne-konečné hodnoty. U binárního STL se také musí ověřit konečnost každé souřadnice.
- `meshStats()` ověřuje nulovou tloušťku a nulový objem, ale to není plná kontrola uzavřenosti/watertight geometrie. U otevřených či neorientovaných sítí může být objem nesprávný.
- ASCII parser používá regex a vytváří pole všech nalezených vrcholů, což u velkých souborů zvyšuje nároky na paměť.

Doporučení:

1. Ověřit `Number.isFinite()` pro všechny souřadnice.
2. Nastavit bezpečný limit trojúhelníků nezávislý na velikosti souboru.
3. Otestovat velmi velké, poškozené, extrémně rozměrné a ne-konečné vstupy.
4. Zajistit, že chyba zpracování nepoloží celou stránku a uživateli zobrazí srozumitelnou zprávu.
5. Uvést, že cena je pouze orientační a výsledkem není závazná nabídka, pokud to odpovídá zamýšlenému použití.

#### 5. Externí poskytovatelé a ochrana soukromí

Kód odkazuje/načítá externí zdroje, mimo jiné:

- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`),
- GSAP a ScrollTrigger z cdnjs,
- Three.js z jsDelivr,
- Facebook Page Plugin v `obrazky.html`,
- po konfiguraci také Formspree z `js/contact.js`.

Tyto služby mohou při načtení obdržet technické údaje návštěvníka (např. IP adresu a informace o prohlížeči); Facebook a další embedované služby mohou mít další ukládání/čtení informací podle svého aktuálního nastavení a kontextu. Samotný zdrojový audit neurčí, zda se používají cookies nebo zda je pro konkrétní konfiguraci nutný souhlas. To je třeba ověřit v reálném prohlížeči a posoudit podle konkrétního provozu.

Doporučení:

- Zvažte lokální hostování fontů a knihoven, pokud to dovolují jejich licence.
- Facebook iframe nenačítejte automaticky před rozhodnutím návštěvníka, pokud posouzení soukromí/consentu vyžaduje předchozí volbu.
- Připravte pravdivé informace o skutečných příjemcích dat, účelech, právním základu, době uchování a právech osob.
- Po zapojení formuláře ověřte podmínky zpracování u poskytovatele a popište, že zpráva a kontaktní údaje jsou zpracovány přes něj.
- Nezobrazujte univerzální cookie lištu jen „pro jistotu“ bez znalosti skutečných cookies; nejprve inventarizujte skutečné technologie a jejich účel.

#### 6. Formulář je nyní placeholder; po zapojení jde o zpracování osobních údajů

`index.html` sbírá jméno, e-mail a zprávu. `js/contact.js` formulář při platném endpointu odešle na Formspree přes `fetch()`.

- V aktuálním snapshotu je endpoint placeholder, takže formulář není připraven k produkčnímu odesílání.
- Po doplnění endpointu budou odesílané osobní údaje zpracovávány také zvolenou externí službou.
- Ověřte antispam, omezení zneužití, dobu uchování a chování při výpadku poskytovatele.
- Doplňte odpovídající informaci o zpracování údajů poblíž formuláře nebo snadno dostupným odkazem.
- Do veřejného JavaScriptu nevkládejte tajné API klíče; vše v klientském kódu je dostupné návštěvníkům.

### Střední priorita — obrana, dodavatelský řetězec a nasazení

#### 7. CDN a integrita skriptů

- Externí skripty GSAP/ScrollTrigger v HTML nemají atributy SRI `integrity`.
- Three.js se načítá jako vzdálený ES modul z jsDelivr, včetně dynamického importu při použití kalkulačky.
- Verze Three.js je připnuta, což je lepší než načítání neurčité verze, ale neodstraňuje závislost na dostupnosti a integritě CDN.

Doporučení: pokud je to vhodné, hostujte ověřené verze lokálně; jinak používejte pevné verze, kontrolujte původ balíčků a nastavte omezenou CSP, která povolí jen nutné zdroje. SRI použijte u zdrojů, kde je podporováno a provozně udržitelné.

#### 8. Bezpečnostní HTTP hlavičky nejsou doložené zdrojovým repozitářem

Ve statických souborech není možné potvrdit, zda nasazení skutečně posílá CSP, HSTS, `X-Content-Type-Options`, vhodnou `Referrer-Policy` a další hlavičky. Tyto vlastnosti závisí na hostingu/DNS/proxy. GitHub Pages může mít omezené možnosti nastavování vlastních hlaviček.

Doporučení: zkontrolujte skutečné odpovědi produkčního webu. Pokud hosting hlavičky neumožňuje, zvažte hosting/proxy, kde je lze nakonfigurovat. CSP musí zohlednit moduly, CDN, fonty a Facebook embed; nevkládejte ji naslepo bez testování.

#### 9. Doména, CNAME a sitemap nejsou sjednocené

- `CNAME` obsahuje `jm3d.cz`.
- `sitemap.xml`, metadata a některé canonical/share odkazy používají `https://www.jm3d.cz/`.

Nejde samo o sobě o zranitelnost, ale nesoulad může způsobit problémy s nasazením, indexací a důvěryhodností. Ověřte vlastnictví domény, DNS záznamy, HTTPS certifikát a přesměrování variant `www`/bez `www`; sjednoťte sitemap, OG URL a případné canonical adresy.

#### 10. Kontrola DOM/XSS v prohlédnutých částech

- `js/gallery.js` přidává nadpisy a popisy přes `textContent`; to je dobrá praxe a v této cestě jsem nenašel zjevné vložení těchto textů jako HTML.
- `js/contact.js` vypisuje stav přes `textContent`.
- `js/pronterface.js` vytváří řádky konzole pomocí DOM elementů a `textContent`.

To je pozitivní, ale není to záruka proti všem XSS ani bezpečnost celého nasazení. Obsah galerie je nyní lokální JSON; při pozdějším napojení na CMS/API je nutné zachovat bezpečné vkládání a validovat cesty k souborům.

#### 11. Simulátor tiskárny

`js/pronterface.js` simuluje G-kódy v prohlížeči a nepřipojuje fyzickou tiskárnu; stránka také uvádí, že jde o demo. To je důležité. Zachovejte jasné označení `DEMO` a vysvětlení i přímo u ovládání, zejména protože tlačítka mají názvy jako `STOP`, `HOME` a ovládání teploty, které mohou být zaměněny za skutečné řízení zařízení.

### Nižší priorita — přístupnost a UX

#### 12. Přístupnost lightboxu a klávesnicového ovládání

- Lightbox lze zavřít Escape a kliknutím mimo obrázek, což je užitečné.
- Ve zdrojovém kódu není patrné plné chování dialogu: role/označení dialogu, přesunutí a návrat fokusu, omezení fokusu uvnitř lightboxu ani zákaz interakce se zbytkem stránky.
- Přepínač režimů kalkulačky používá ARIA role, ale je třeba otestovat ovládání klávesnicí a čtečkou obrazovky.
- Vizuální kontrast tlumeného textu je vhodné změřit; samotná přítomnost barvy v CSS neprokazuje splnění WCAG.

Doporučení: otestujte klávesnici, NVDA/VoiceOver a kontrast; doplňte odpovídající dialogové chování a viditelný focus.

## Právní a obchodní připravenost v ČR

Tento audit neposkytuje právní stanovisko. Před komerčním použitím doporučuji ověřit následující body podle skute��ného provozovatele a obchodního modelu:

1. **Práva:** získat svolení/licenci ke kódu a ověřit původ a podmínky všech assetů, fontů a externích knihoven.
2. **Identifikace provozovatele:** uvést přesné a aktuální údaje o tom, kdo web provozuje; rozsah požadavků závisí na právním postavení a povaze nabídky.
3. **Spotřebitelé a nabídka:** pokud web nabízí služby spotřebitelům, nechat ověřit povinné informace, způsob prezentace cen, podmínky objednání, reklamace a případná další pravidla pro konkrétní služby.
4. **Soukromí:** popsat skutečné zpracování kontaktních údajů a případné příjemce dat; zmapovat externí technologie a rozhodnout, zda je před jejich načtením potřeba volba/souhlas.
5. **Pravdivost obsahu:** ověřit, že technické parametry tiskáren, seznam služeb, materiály, fotografie a reference odpovídají realitě a lze je oprávněně zveřejnit.
6. **Kalkulačka:** ponechat jasné sdělení o orientační povaze výsledku, dokud není metoda ověřená a její obchodní účel jasný.

## Doporučený pořadník před spuštěním

1. Vyřešit licenci a autorská práva ke kódu i všem materiálům.
2. Rozhodnout, zda jde o web JM3D; odstranit nebo nahradit značku, osobní údaje, `CNAME`, Facebook profil a metadata.
3. Nahradit placeholdery nebo vypnout galerii/formulář, dokud nejsou připravené.
4. Opravit model výpočtu výplně ručního režimu a přidat testy kalkulačky.
5. Zpřísnit validaci STL (konečné souřadnice, počet trojúhelníků, zátěžové testy a bezpečné chybové stavy).
6. Zmapovat externí zdroje a připravit odpovídající informace o soukromí; ověřit chování Facebook embedů a formulářové služby.
7. Ověřit HTTPS, DNS, přesměrování `www`/bez `www`, bezpečnostní hlavičky a skutečné chování webu na hostingu.
8. Otestovat mobilní zobrazení, klávesnici, čtečku obrazovky a kontrast.
9. Spustit `npm test` v prostředí projektu a zaznamenat výsledek; tento audit existenci testů zkontroloval, ale testy nebyly v rámci kontroly spuštěny.

## Celkový závěr

**Z hlediska samotného zdrojového kódu jde o relativně malý statický web a nebyla nalezena zjevná kritická serverová zranitelnost. To však neznamená, že je web certifikovaně bezpečný nebo právně připravený.** Před komerčním použitím je nutné vyřešit práva, odstranit nedokončené části, opravit kalkulačku, omezit nároky parseru STL a řádně posoudit ochranu osobních údajů a nastavení produkčního hostingu.
