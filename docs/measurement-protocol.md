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

## Délka běhu

Animace trvá déle než jmenovitá doba, protože zpoždění mezi prvky posouvá start
posledního z nich. Skutečná délka je duration + stagger × počet prvků.

Při jmenovité době 10 s a zpoždění 4 ms mezi prvky:

| Prvků | Animace | S klidovým měřením |
|------:|--------:|-------------------:|
|   100 |  10,4 s |             11,4 s |
|   500 |  12,0 s |             13,0 s |
|  2000 |  18,0 s |             19,0 s |
|  4000 |  26,0 s |             27,0 s |

Hlavní matice o sedmi technikách, třech úrovních složitosti a deseti
opakováních dává 210 běhů na jednu scénu, tedy zhruba 51 minut čistého času.
S pětisekundovou prodlevou na zchladnutí je to okolo 68 minut, s desetisekundovou
okolo 86 minut. Tři scény tedy znamenají tři až čtyři hodiny na jedno zařízení.

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

## Pořadí a prodlevy

Pořadí běhů je náhodné, aby se tepelné škrcení rozložilo rovnoměrně mezi
techniky. Kdyby se měřily po blocích, poslední technika by systematicky běžela
na teplejším stroji.

Mezi běhy se drží pevná prodleva na zchladnutí, shodná pro všechny kombinace.

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

## Skriptovaný posun stránky

Scéna parallax vyžaduje posun stránky. Ten se syntetizuje protokolem
vývojářských nástrojů jako plynulý pohyb, nikoli nastavením vlastnosti
scrollTop. Ta sice událost posunu vyvolá, hodnota však skočí naráz, takže vznikne
jeden velký přírůstek místo plynulého pohybu a obejde se cesta přes kompozitor.

Rychlost posunu je pevná a shodná pro všechny techniky.

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
