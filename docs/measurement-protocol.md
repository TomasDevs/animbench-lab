# Protokol měření

Podmínky, za kterých vznikají data použitá v práci. Dokument je zároveň zadáním
pro nástroj animbench a podkladem pro kapitolu 4, kde platí požadavek katedry,
aby postup umožnil někomu jinému vše zopakovat se stejnými výsledky.

Odůvodnění jednotlivých pravidel je v docs/theory-digest.md, pravidla
srovnatelnosti v CLAUDE.md.

## Jeden běh

Jeden běh znamená jedno načtení stránky bench.html s parametry v adrese.
Technika se nikdy nepřepíná za běhu.

Průběh běhu:

1. Nástroj otevře adresu s parametry a čeká na window.__benchReady.
2. Stránka postaví scénu, inicializuje adaptér a změří klidový rozestup snímků.
   Nic se nepohybuje, takže výsledek vyjadřuje, co zařízení zvládne.
3. Nástroj zavolá window.__benchStart. Až tím začíná měřený běh, takže doba
   stavby scény do dat nevstupuje.
4. Po doběhnutí stránka vystaví window.__benchResult a nastaví window.__benchDone.
5. Nástroj hodnoty odečte a stránku zavře.

Sonda neprovádí žádný výpočet. Průměr, medián, percentily i počet snímků nad
rozpočtem se dopočítají až v nástroji.

## Kontrakt stránky

Stránka vystavuje na objektu window pět klíčů:

| klíč | typ | význam |
|------|-----|--------|
| `__benchReady` | true | scéna postavená, adaptér inicializovaný |
| `__benchStart` | funkce | nástroj jí spustí měření |
| `__benchResult` | objekt | surová razítka a metadata po doběhnutí |
| `__benchDone` | true | výsledek je k dispozici |
| `__benchError` | { message, stack? } | místo výsledku, pokud běh selhal |

Nástroj funkci __benchStart zavolá jednou, vrácený příslib zahodí a sleduje
výhradně __benchDone. Stránka proto nesmí nastavit __benchDone dřív, než je
__benchResult úplný.

Časové limity nástroje: 30 s na dobu od načtení do __benchReady, 120 s na dobu
od __benchStart do __benchDone. Běh při čtyřech tisících prvcích trvá 26 s, což
se do limitu vejde.

Pole frameIntervalMs a refreshRateHz si musí odpovídat. Nástroj z prvního
odvozuje snímkový rozpočet a z druhého podíl dosažené a dosažitelné frekvence,
ale vzájemnou shodu nekontroluje. Zaokrouhlená frekvence spolu se surově
naměřeným rozestupem by proto vytvořila nekonzistenci, které by si nikdo
nevšiml. Stránka posílá obě hodnoty odvozené ze zaokrouhlené frekvence
a naměřenou hodnotu přikládá zvlášť jako measuredRefreshHz.

Rozměry, podle kterých se má v datech seskupovat, musí přijít jako parametry
adresy. Nástroj seskupuje podle nich, nikoli podle metadat. Stránka je zároveň
vrací v meta, takže případný nesoulad mezi adresou a tím, co stránka přečetla,
jde zpětně dohledat.

## Délka běhu a ustálené okno

Zpoždění mezi prvky (stagger) běží uvnitř měřeného okna: sběr razítek i animace
začínají týmž voláním __benchStart, takže rozjezd scény je součástí záznamu.

Počet současně animovaných prvků ovšem není po celý běh stejný. Prvek i startuje
v čase i × stagger a běží po dobu duration, takže zátěž od nuly roste, chvíli se
drží na vrcholu a pak klesá. Naměřeno u CSS transitions při dvou tisících
prvcích, průměrné rozestupy po pětinách běhu:

    16,8   17,7   34,5   22,2   16,7 ms

Průměr z celého běhu proto míchá tři různé zátěže dohromady a zátěž podhodnocuje.
U téhož nastavení vyšla snímková frekvence z celého běhu 20,8 FPS, kdežto
z ustáleného okna 12,4 FPS.

Stránka proto v metadatech označí ustálené okno:

    steadyStateFromMs   čas, kdy se rozběhl poslední prvek
    steadyStateToMs     čas, kdy se začal zastavovat první prvek
    concurrentElements  počet prvků animovaných současně v tomto okně

Obě značky jsou v téže časové ose jako timestamps. Nástroj z nich počítá metriky
jen nad ustáleným oknem, zatímco surová razítka ukládá nezkrácená, aby šel profil
zátěže analyzovat zpětně a při změně kritéria přepočítat bez nového měření.

### Volba doby trvání

Konstantní má být měřené okno, nikoli celý běh. Doba trvání se proto odvozuje
z požadované šířky okna:

    duration = okno + stagger × (počet prvků − 1)

Adresa přijímá parametr window a duration si dopočítá sama. Při okně deseti
sekund a zpoždění 4 ms na prvek:

| Prvků | Okno | duration | Délka běhu |
|------:|-----:|---------:|-----------:|
|   100 | 10 s |   10,4 s |     10,8 s |
|   500 | 20 s |   22,0 s |     24,0 s |
|  2000 | 20 s |   28,0 s |     36,0 s |

Běhy jsou různě dlouhé, ale měřené okno má vždy zadanou šířku. Nestejná zůstává
jen doba rozjezdu, která se neměří. Okno se u vyšších složitostí rozšiřuje, aby
v něm zbylo dost snímků; důvod je v následující kapitole.

Hlavní matice o sedmi technikách, třech úrovních složitosti a deseti opakováních
dává 210 běhů na scénu. Při těchto dobách a patnáctisekundové prodlevě na
zchladnutí vychází zhruba 2,3 hodiny na scénu, tedy asi 7 hodin na zařízení pro
tři scény.

### Počet snímků v okně

Šířka okna v sekundách neurčuje počet vzorků: čím pomalejší technika, tím méně
snímků se do okna vejde. Právě tam, kde je rozdíl mezi technikami největší, je
tedy dat nejméně.

Naměřeno u CSS transitions při okně přizpůsobeném složitosti:

| Prvků | Okno | FPS v okně | Snímků v okně |
|------:|-----:|-----------:|--------------:|
|   500 | 20 s |       59,7 |          1075 |
|  2000 | 30 s |  11,8–25,1 |       260–753 |
|  4000 | 40 s |        3,4 |            82 |

Rozpětí u dvou tisíc prvků vzniklo mezi dvěma měřicími stroji; obě hodnoty
překračují stovku vzorků, která je pro pátý percentil potřeba.

Prodlužovat okno donekonečna nelze. Aby při čtyřech tisících prvcích vzniklo tři
sta vzorků, muselo by okno trvat 88 sekund a celý běh přes dvě minuty, což naráží
na časový limit nástroje.

Proto se čtyři tisíce prvků do hlavní matice nezařazují. Hlavní matice pracuje se
sty, pěti sty a dvěma tisíci prvky, kde počet vzorků na percentily stačí. Vyšší
složitosti se měří jen v samostatném experimentu k VO5, kde se hledá práh
plynulosti a percentily nejsou potřeba.

Počet snímků v okně se zaznamenává ke každému běhu. Běh s méně než stovkou
vzorků se do výpočtu percentilů nezahrnuje a v práci se uvádí zvlášť.

Pokud okno nevznikne vůbec, protože poslední prvek startuje až po zastavení
prvního, scéna nikdy neanimuje všechny prvky naráz. Pro sweep k VO5 se proto
vedle zadané složitosti uvádí hodnota concurrentElements, která odpovídá
skutečné souběžné zátěži.

## Prostředí

Měří se s viditelným oknem prohlížeče, nikoli bezhlavě. Bezhlavý režim nemusí
použít grafickou akceleraci a bez kompozitoru na grafické kartě by se ztratila
právě ta výhoda kaskádových stylů, kterou práce zkoumá.

Před zahájením měření se ověří stav grafického subsystému na stránce
chrome://gpu. Očekává se hardwarová akcelerace u položek Compositing
a Rasterization. Stav se zaznamená do metodiky.

Okno prohlížeče nesmí být během běhu zakryté jiným oknem ani minimalizované,
protože Chromium v takovém případě omezí volání requestAnimationFrame. Po dobu
měření je stroj vyhrazen a ostatní aplikace jsou zavřené.

## Velikost okna

Scéna se přizpůsobuje velikosti okna. Generátor mřížky počítá počet sloupců
z počtu prvků a z rozměrů okna, takže odlišná velikost okna znamená odlišné
rozvržení.

Velikost okna proto musí být u všech technik i všech opakování shodná a zapisuje
se ke každému běhu. Bez toho by se místo rozdílu mezi technikami měřil rozdíl
v rozvržení.

## Rozptyl u dlouhých běhů

Širší okno dává víc vzorků, ale u dlouhých běhů roste rozptyl mezi opakováními
natolik, že se získaná přesnost ztrácí. Naměřeno u CSS transitions při dvou
tisících prvcích:

| Okno | Vzorků v okně | Rozptyl mezi opakováními |
|-----:|--------------:|-------------------------:|
| 10 s |           346 |                    9,8 % |
| 30 s |           790 |                   30,3 % |

Na jednom ze dvou měřicích strojů přitom hodnoty v pořadí provedení klesaly
z 43,7 na 19,8 snímků za sekundu, tedy o 55 procent. Oba stroje jsou MacBook Air
s pasivním chlazením, takže se při šestačtyřicetisekundových bězích zahřejí
a výkon klesne. Na druhém stroji monotónní pokles nenastal, ale rozptyl byl
srovnatelný, 29 procent. Tepelné škrcení tedy není jedinou příčinou.

Okno se proto u dvou tisíc prvků drží na dvaceti sekundách, nikoli na třiceti,
a prodleva mezi běhy se prodlužuje na patnáct sekund. Vzorků zbývá dost a stroj
mezi běhy vychladne.

Pasivní chlazení je vlastnost testovacího zařízení, nikoli metody, a jako takové
patří do metodiky. Na aktivně chlazeném stroji by delší okno problém nedělalo.

Na stolních počítačích stránka skutečný displej nevidí. Playwright při pevném
okně 1280 × 720 emuluje obrazovku stejné velikosti s poměrem pixelů 1, takže se
stránka vykresluje v poměru 1 i na displeji Retina. Údaje window.screen
a devicePixelRatio ve výsledku proto na desktopu popisují emulaci, nikoli
monitor. Skutečný displej čte nástroj ze systému a zapisuje ho ke každému běhu
(environment.host.display, například DELL U2719D 2560 × 1440 při 60 Hz).
Na telefonech se nic neemuluje a stránka se vykresluje na skutečné obrazovce
v jejím nativním poměru pixelů.

Běhy změřené na různých zařízeních, displejích, se zdrojem napájení nebo se
vzorkováním procesoru a bez něj se při zpracování nikdy nesdružují. Analýza
složku se smíšenými podmínkami odmítne.

## Pořadí a prodlevy

Pořadí běhů je náhodné, aby se tepelné škrcení rozložilo rovnoměrně mezi
techniky. Kdyby se měřily po blocích, poslední technika by systematicky běžela
na teplejším stroji.

Mezi běhy se drží pevná prodleva na zchladnutí, shodná pro všechny kombinace.
Na pasivně chlazených zařízeních patnáct sekund, viz předchozí kapitolu.

První běh každé kombinace je rozehřívací a zahazuje se.

## Co se zaznamenává ke každému běhu

Sonda ukládá do window.__benchResult:

- surová časová razítka snímků
- klidový rozestup snímků a z něj odvozenou obnovovací frekvenci
- parametry běhu: technika, scéna, složitost, seed, doba trvání, index opakování
- identifikaci prostředí: user agent, velikost okna, poměr pixelů, počet jader,
  velikost paměti
- příznak overflowed

Nástroj k tomu doplní:

- verzi prohlížeče, protože Playwright si nese vlastní Chromium a liší se od
  stabilní verze
- u mobilních zařízení stav nabíjení, protože nabíjený telefon se chová tepelně
  jinak
- údaje z protokolu vývojářských nástrojů: Performance.getMetrics
  a SystemInfo.getProcessInfo

## Kdy se běh zahazuje

- Příznak overflowed je nastaven. Sonda sbírala víc snímků, než se vešlo do
  vyrovnávací paměti, takže záznam je zkrácený a vypadal by jako kratší běh
  s menším počtem výpadků.
- Nastaven je window.__benchError místo výsledku.
- Klidové měření vrátilo obnovovací frekvenci mimo očekávaný rozsah, což
  naznačuje rušivý vliv na pozadí.
- Okno bylo během běhu zakryté nebo ztratilo zaměření.

Zahozené běhy se zaznamenávají i s důvodem. Počet zahozených běhů patří do
metodiky.

## Ověření ekvivalence

Před hlavním měřením se na stránce validate.html ověří, že každá technika
sleduje stejnou trajektorii jako referenční implementace nad
requestAnimationFrame.

Vzorkuje se poloha prvního prvku v pevných časech a porovnává se s předpisem.
Odchylka nad dva pixely po započtení konstantního zpoždění znamená, že techniky
neanimují totéž a technika do hlavní matice nepatří.

Konstantní zpoždění se vykazuje zvlášť, nikoli koriguje. Technika řízená
časovačem zapisuje styl o jeden snímek později než technika zapisující přímo ve
snímku; u CSS transitions to je přibližně 17 ms při 60 Hz. Jde o vlastnost
techniky, kterou má měření odhalit.

Ověření se opakuje po každé změně scény, předpisu nebo adaptéru.

## Vyjádření výsledků

Snímkový rozpočet se odvozuje z naměřené obnovovací frekvence, ne z pevných
16,7 ms. Herní monitory běžně pracují na 144 Hz a telefony na 120 Hz, takže mají
rozpočet poloviční i menší.

Výsledky se proto vyjadřují i jako podíl dosažené a dosažitelné frekvence. Práh
pro VO5 se vztahuje k rozpočtu daného zařízení, například devadesát procent, ne
k pevnému počtu snímků za sekundu.

Vedle průměru se uvádí medián, první a pátý percentil, nejdelší snímek a počet
snímků nad rozpočtem. Samotný průměr propad plynulosti skryje: při čtyřech
tisících prvcích byl naměřen medián 16,7 ms, tedy zdánlivě bez potíží, zatímco
třetina snímků rozpočet překročila.

## Vyhodnocení po scénách

Matice není vyvážená, protože ne každá technika zvládne každou scénu. Scéna se
proto vyhodnocuje zvlášť jako samostatná matice technik a složitostí.

## Scroll-driven animace a scéna parallax

Animace řízené posunem nelze měřit stejným postupem jako ostatní techniky.
Ověřeno v prohlížeči: bez posunu zůstane časová osa nedefinovaná (currentTime je
null) a animace se nepohne, přestože je ve stavu running. Doba trvání ji neřídí,
řídí ji poloha posuvníku.

Scéna parallax proto staví vlastní posuvník uvnitř scény a vystavuje jej jako
pojmenovanou časovou osu --animbench-scroll. Měřicí stránka má posun stránky
zakázaný a adaptér si posuvník vytvořit nesmí, protože by měnil strukturu scény.

Posun řídí adaptér programově, rovnoměrnou rychlostí přes celý rozsah za dobu
zadanou ve specifikaci. Ověřeno, že nastavení scrollTop posune časovou osu
scroll-driven animace (currentTime dosáhl 50 % v polovině rozsahu), takže není
potřeba syntetizovat vstupní gesto protokolem vývojářských nástrojů.

### Proč scroll-driven nepatří do hlavní matice

Techniky řízené časem na scéně parallax neprodukují parallax. Ověřeno u všech
čtyř: posuvníkem nepohnou vůbec a všechny vrstvy posunou stejně, protože
specifikace je pro všechny prvky totožná a rychlost vrstvy je vlastnost scény,
nikoli specifikace.

Scéna parallax tedy nemá referenční implementaci, proti které by se dala ověřit
ekvivalence trajektorií. Bez ověření ekvivalence nelze techniku do hlavní matice
zařadit, protože by se neměřila technika, ale rozdíl v zadání.

Scroll-driven animace se proto vyhodnocují ve zvláštním režimu spolu s View
Transitions API a nástrojem Lottie. Pro VO4 to znamená, že se neporovnává
s ostatními technikami na téže scéně, ale hodnotí se samostatně: sleduje se počet
výpadků snímků během posunu, nejdelší snímek a rovnoměrnost rozestupů.

Alternativa, tedy naučit časem řízené adaptéry číst rychlost vrstvy ze scény
a řídit posuvník, by znamenala, že adaptér neanimuje podle specifikace, ale podle
vlastnosti scény. Tím by přestala platit zásada, že všechny adaptéry dostávají
tentýž předpis a liší se jen překladem.

## View Transitions API

Rozhraní vytváří jednorázový přechod mezi dvěma stavy dokumentu. Nemá dobu, jakou
by vyplnilo, ani posloupnost klíčových snímků, kterou by sledovalo: prohlížeč
pořídí snímek původního stavu a dopočítá přechod k novému. Průměrná snímková
frekvence za desetisekundový běh u něj proto nedává smysl.

Ze specifikace se čtou pouze krajní polohy. Běh provede jeden přechod z prvního
klíčového snímku do toho nejvzdálenějšího. Poslední snímek se záměrně nepoužívá,
protože cyklická specifikace končí tam, kde začala, a přechod do ní by nepohnul
ničím.

### Chování při rostoucí složitosti

Každý prvek dostane vlastní jméno přechodu, jinak by je prohlížeč sejmul jako
jeden celek a animoval jediný obdélník místo jednotlivých prvků. Počet animací
pseudoprvků tím roste přibližně pětinásobkem počtu prvků; při pěti stech prvcích
jich bylo naměřeno 2505.

Naměřeno na scéně grid:

| Prvků | Medián rozestupu | Nejdelší snímek | Snímků v běhu |
|------:|-----------------:|----------------:|--------------:|
|    25 |          16,7 ms |         49,9 ms |            71 |
|    50 |          16,7 ms |         33,3 ms |            84 |
|   100 |          16,7 ms |         33,4 ms |           104 |
|   200 |          33,3 ms |         83,4 ms |            67 |
|   500 |         482,7 ms |        6799,8 ms |             4 |

Do sta prvků technika drží snímkový rozpočet. Při dvou stech se medián zdvojnásobí
a při pěti stech se stránka prakticky zastaví: příprava přechodu trvala 7,7
sekundy a sonda zachytila čtyři snímky.

Technika se proto měří jen do dvou set prvků a hodnotí se jinými veličinami než
hlavní matice: dobou přípravy přechodu, celkovou délkou přechodu, počtem výpadků
během něj a nejdelším snímkem. Sama nestabilita při vyšších počtech je výsledkem,
nikoli překážkou měření.

## Lottie

Nástroj přehrává předem připravený dokument a vykresluje jej do vlastní struktury,
čímž porušuje pravidlo, že adaptér nesmí sahat na scénu. Prvky postavené
generátorem se proto skryjí a přehrávač vedle nich vykreslí vlastní obraz. Právě
proto techniku nelze porovnávat prvek po prvku s ostatními a měří se odděleně.

Dokument se negeneruje v grafickém programu, ale ze stejné specifikace, jakou
dostávají ostatní adaptéry. Pohyb je tím shodný z podstaty, nikoli od oka; liší
se pouze to, kdo jej vykresluje. Použit je vykreslovač SVG.

Ověřeno, že trajektorie odpovídá specifikaci. Vzorky polohy během běhu sedí na
předepsanou dráhu s konstantním zpožděním 114 ms, po jehož započtení klesne
odchylka na 1,3 pixelu. Zpoždění je řádově vyšší než u technik v hlavní matici,
kde se pohybovalo mezi jednou a dvaceti milisekundami, a je vlastností
přehrávače.

Objem knihovny je 309 kB, tedy zhruba čtyřnásobek GSAP. U techniky, jejíž
předností má být malý a na rozlišení nezávislý výstup, patří tento údaj do
výsledků.

## Skriptovaný posun stránky

Scéna parallax vyžaduje posun stránky. Ten se syntetizuje protokolem
vývojářských nástrojů jako plynulý pohyb, nikoli nastavením vlastnosti
scrollTop. Ta sice událost posunu vyvolá, hodnota však skočí naráz, takže vznikne
jeden velký přírůstek místo plynulého pohybu a obejde se cesta přes kompozitor.

Rychlost posunu je pevná a shodná pro všechny techniky.

## React Motion

Doplňkové měření mimo hlavní matici. Porovnává knihovnu Motion v podobě pro
React proti téže knihovně ve vanilla podobě a izoluje tím režii frameworku.

Vstupní bod react.html vystavuje týž kontrakt jako bench.html, takže jej nástroj
měří stejným postupem. Parametry adresy jsou shodné, jen se neuvádí technika:
stránka se hlásí jako react-motion.

Scéna vzniká ze stejného seedovaného generátoru jako u vanilla varianty. Ověřeno,
že rozvržení obou variant je shodné, včetně pozic, rozměrů i barev jednotlivých
prvků. Bez toho by se neměřila režie frameworku, ale rozdíl ve scéně.

Komponenta je psána idiomaticky pro React, tedy jako pohybová komponenta řízená
vlastnostmi. Napsat ji jako volání vanilla rozhraní by srovnání zbavilo smyslu,
protože právě způsob použití je tím, co se porovnává. Transformace se přesto
zapisuje jediným řetězcem, aby zůstalo zachováno pořadí funkcí.

## Ověření adaptéru pro CSS přechody

Měření ukázalo, že kaskádové přechody při dvou tisících prvcích pravidelně
vynechávají každý druhý snímek, zatímco ostatní techniky rozpočet drží. Protože
by takové zjištění mohlo být artefaktem implementace adaptéru, bylo ověřeno, zda
adaptér nepřenastavuje cílovou hodnotu opakovaně.

Sledování zápisů do atributu style ukázalo pět zápisů na prvek za celý běh:
čtyři odpovídají segmentům mezi klíčovými snímky a pátý je zmrazení polohy na
konci. Adaptér tedy hodnotu nepřenastavuje a přechod nerestartuje.

Zbývala možnost, že půlení způsobuje samotný počet časovačů, kterých je při dvou
tisících prvcích osm tisíc. Vyloučeno dvěma doplňkovými měřeními:

| Technika | Prvků | Časovačů za běhu | Podíl zdvojených rozestupů |
|---|------:|-----------------:|---------------------------:|
| CSS přechody | 100 | 400 | 0 % |
| CSS přechody | 500 | 2000 | 0 % |
| CSS přechody | 2000 | 8000 | 71 % |
| CSS klíčové snímky | 2000 | 0 | 3,7 % |
| Motion | 2000 | 0, zápis stylu každý snímek | 3,0 % |
| Web Animations API | 2000 | 0 | 0 % |

Rozhodující je porovnání s klíčovými snímky: tatáž scéna, tentýž počet prvků
a tentýž vykreslovací mechanismus kaskádových stylů, ale bez jediného časovače
během běhu. Půlení kleslo z 71 na necelá 4 procenta.

Knihovna Motion navíc zapisuje styl každého z dvou tisíc prvků v každém snímku,
tedy nesrovnatelně častěji než osm tisíc časovačů za celý běh, a půlí pouze
3 procenta.

Půlení je proto vlastností kaskádových přechodů při vysokém počtu současně
běžících přechodů, nikoli artefaktem adaptéru ani důsledkem plánování časovačů.

## Vytížení procesoru

Vytížení se odečítá z protokolu vývojářských nástrojů metodou
Performance.getMetrics během ustáleného okna, s intervalem vzorkování 1000 ms.
Závěrečné měření musí běžet s nastavením cpuSampleIntervalMs: 1000; bez něj
nevzniknou data k VO1.

Režie vzorkování byla ověřena. Při intervalu 500 ms se podíl dosažené
a dosažitelné frekvence průkazně nezměnil (95% interval [−0,026; +0,013],
p ≥ 0,5). Při intervalu 100 ms už ano, a to stejným směrem u všech metrik.
Hustší vzorkování přesnost nezvyšuje, protože čítače jsou kumulativní, proto se
používá 1000 ms.

Předběžné výsledky ze dvou běhů na kombinaci: při dvou tisících prvcích bylo
hlavní vlákno v ustáleném okně zaneprázdněné 81 % u CSS přechodů, 59 %
u requestAnimationFrame a 66 % u CSS klíčových snímků. Rozdíl leží v práci mimo
skript, styly a rozvržení (57 % proti 22–39 %), zatímco čas procesu grafické
karty byl u všech technik shodný (52 %). Práce navíc tedy vzniká v hlavním
vlákně, nikoli v kompozitoru. Pevná čísla přinese závěrečné měření.

## Vytížení grafické karty

Prohlížeč vytížení grafické karty nevystavuje, nástroj ho proto v blocích se
vzorkováním CPU čte z operačního systému ve stejném intervalu:

| Systém | Zdroj | Rozsah |
|---|---|---|
| macOS | ioreg, bez administrátorských práv | celá grafika (`system`) |
| Windows | výkonnostní čítače | jen proces grafické karty prohlížeče (`browser-gpu-process`) |
| Linux, Android | nedostupné | údaj chybí |

Rozsah se zapisuje ke každému běhu jako `environment.gpuUsageScope`. Na macOS
číslo zahrnuje i plochu a ostatní aplikace, proto musí být během měření zavřené
a hodnoty se srovnávají jen mezi technikami na jednom zařízení, nikdy mezi
systémy. Čas procesu grafické karty z protokolu vývojářských nástrojů je jiná
veličina, čas procesoru strávený přípravou příkazů pro grafickou kartu, a uvádí
se vedle vytížení samotné karty, nikoli místo něj.

## Medián u techniky, která vynechává snímky

U techniky, která pravidelně vynechává snímky, není medián rozestupu spolehlivý.
Rozestupy nabývají jen dvou hodnot, 16,7 nebo 33,3 ms, a medián mezi nimi
přeskakuje podle toho, která převáží. U CSS přechodů při dvou tisících prvcích
kolísal mezi běhy o ±7 ms (20,2 ± 6,9 ms).

Hlavními ukazateli jsou proto podíl dosažené a dosažitelné frekvence a podíl
snímků nad rozpočtem. Medián se uvádí jen doplňkově.

## Uložení dat a statistické zpracování

Naměřená data se ukládají do repozitáře aplikace, nikoli do repozitáře nástroje.
Nástroj musí zůstat univerzální, kdežto data nesou názvy technik, scén i adresu
aplikace a k nástroji nepatří. Replikace tak má aplikaci, data i skripty na
jednom místě.

    data/pilot/   ověřovací měření s odlišnou konfigurací, bez vzorkování CPU
    data/final/   závěrečné měření
    analysis/     skripty statistického zpracování v Pythonu

Ukládá se NDJSON se surovými razítky, agregované CSV a konfigurace běhu.

Běhy jsou nezávislá pozorování: každý je samostatné načtení stránky v náhodném
pořadí a nic je mezi technikami nepáruje. Techniky se proto porovnávají
Kruskalovým–Wallisovým testem zvlášť pro každou kombinaci scény a složitosti.
Dvojice se pak porovnávají párovými Mannovými–Whitneyho testy s Holmovou
korekcí. Dunnův test byl na pilotních datech vyzkoušen a zamítnut: řadí všechny
skupiny společně, a když pět technik stojí u stropu displeje, ztrácí sílu.
U dvojice s úplným oddělením běhů (Cliffovo delta = 1) vyšel p = 0,052, párový
test p = 0,0026. Friedmanův test pro závislé
vzorky se na hlavní matici nepoužívá.

Techniky na stropu displeje dávají mnoho shodných hodnot, které přesné rozdělení
Mannova–Whitneyho testu nepřipouští. Používá se proto u všech dvojic asymptotická
varianta s korekcí na shody a na spojitost, nastavená výslovně. Nejmenší
dosažitelné p při deseti bězích a úplném oddělení je přibližně 1,8·10⁻⁴.

Holmova korekce se počítá přes patnáct dvojic jedné kombinace scény, složitosti
a metriky. Pro kontrolu citlivosti se uvádí i korekce přes všechny dvojice
analýzy najednou.

Nevýznamný rozdíl neznamená, že techniky jsou rovnocenné. Pro tvrzení
o rovnocennosti se u každé dvojice určí Hodgesův–Lehmannův odhad posunu
s intervalem spolehlivosti a dvojice se považuje za rovnocennou, pokud 90%
interval leží uvnitř předem zvolené meze, což odpovídá dvěma jednostranným
testům na hladině 0,05. Mez musí být stanovena před závěrečným měřením;
předběžně 0,02 podílu dosažené a dosažitelné frekvence, tedy zhruba 1,2 snímku
za sekundu při 60 Hz.

Neparametrické testy jsou zvolené předem. Při deseti bězích na skupinu má test
normality malou sílu a rozdělení techniky, která vynechává snímky, je
dvouvrcholové. Test normality lze spustit, rozhodnutí se o něj ale neopírá.

## Měření na telefonech se systémem Android

Ověřeno na emulátoru s prohlížečem Chrome 133. Experimentální rozhraní
Playwrightu pro Android na běžném telefonu nefunguje, nástroj se proto připojuje
stejnou cestou jako chrome://inspect. Aplikaci telefon vidí přes adb reverse na
adrese localhost:4173, takže se měří stejné sestavení jako na počítači. Velikost
okna nastavit nelze; měří se na skutečné obrazovce a její rozměry se zapisují.

| Údaj | Android |
|---|---|
| hlavní vlákno (Performance.getMetrics) | funguje |
| CPU procesu vykreslování a grafické karty (SystemInfo.getProcessInfo) | nefunguje, izolované procesy hlásí vždy nulu |
| stav akcelerace (SystemInfo.getInfo) | funguje |
| stránka chrome://gpu | nefunguje, neotevře se |

Kontrola akcelerace proto všude používá SystemInfo.getInfo a ke každému běhu se
zapisuje, které údaje byly dostupné. Nedostupný údaj se v datech objeví jako
chybějící hodnota, nikoli jako nula. Na telefonech tak VO1 pokrývá jen hlavní
vlákno, nikoli procesy vykreslování a grafické karty ani vytížení samotné
grafické karty, které na Androidu nástroj nečte.

## Omezení, která patří do metodiky

- Měření je vázané na jádro Chromium. Ve Firefoxu a Safari lze doplňkově změřit
  alespoň snímkovou frekvenci a výpadky.
- Rozhraní Safari na systému iOS nelze řídit protokolem vývojářských nástrojů.
  Měření na iPhonu probíhá ručně na zredukované matici a spoléhá výhradně na
  sondu ve stránce.
- Mobilní prohlížeče neposkytují spolehlivé údaje o procesoru a grafické kartě,
  takže na telefonech zůstává hlavním ukazatelem snímková frekvence.
- Automatizační nástroj má vlastní režii. Playwright vykázal vyšší spotřebu než
  Puppeteer (Lagermann a kol., 2025), což se přiznává jako omezení.
- Měřicí stránka nerespektuje předvolbu prefers-reduced-motion. Kdyby ji
  respektovala, animace by se na stroji se zapnutým omezením pohybu vůbec
  nespustila a měření by vyšlo prázdné. Předvolba se ošetřuje na rozcestníku.
