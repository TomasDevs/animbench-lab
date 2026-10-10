# Plán závěrečného měření

Předem stanovený postup závěrečného měření a jeho vyhodnocení. Dokument vzniká
před měřením a po jeho zahájení se nemění; případná odchylka se zapíše do
kapitoly Odchylky s datem a důvodem. Slouží jako doklad, že metoda nebyla
přizpůsobena výsledkům.

Podmínky jednoho běhu popisuje docs/measurement-protocol.md, pilotní data
a jejich zpracování data/pilot/ a analysis/.

Stav: **zafixováno 9. 10. 2026.** Všechny otevřené body jsou uzavřené. Další změny se zapisují pouze do kapitoly Odchylky.

## Otevřené body před zafixováním

| | Bod | Kdo | Podmínka uzavření |
|---|---|---|---|
| O1 | Režie vzorkování CPU při 1000 ms | animbench | **změřeno 9. 10. 2026**, výsledek a jeho důsledky v kapitole Odchylky (D1–D3) |
| O2 | Časy přechodu u View Transitions | animbench-lab | **uzavřeno 9. 10. 2026**: metadata nesou `oneShot.prepareMs` a `oneShot.playMs` |
| O3 | Ustálené okno u View Transitions | animbench-lab | **uzavřeno 9. 10. 2026**: okno vede od připravenosti po dokončení přechodu, běh končí až s přechodem |
| O4 | Ověření ekvivalence | animbench-lab | **uzavřeno 9. 10. 2026**: všech 10 dvojic ekvivalentních; zopakovat, pokud se sestavení změní |
| O5 | Rozhodnutí o oddělení měření CPU od měření snímků | autor | **uzavřeno 9. 10. 2026**: varianta 2, viz D3 |

## Zařízení a prostředí

První fáze probíhá na stroji, na kterém vznikl pilot: MacBook Air M3, 16 GB,
pasivní chlazení, externí displej 60 Hz. Ostatní zařízení následují stejným
plánem, s redukcemi uvedenými v protokolu (iPhone ručně, Android bez času
procesů vykreslování a grafické karty).

- aplikace servírovaná přes `pnpm preview` z čerstvého sestavení na portu 4173,
  spuštěném s `--strictPort`
- viditelné okno prohlížeče 1280 × 720, nezakryté, ostatní aplikace zavřené
- hardwarová akcelerace ověřená přes SystemInfo.getInfo před zahájením
- zařízení připojené k napájení, stav napájení zapsaný ke každému běhu

## Matice

Hlavní matice:

| | |
|---|---|
| Techniky | raf, css-transition, css-keyframes, waapi, gsap, motion |
| Scény | grid, composite |
| Složitost | 100, 500, 2000 prvků |
| Šířka ustáleného okna | 10 s pro 100 prvků, 20 s pro 500 a 2000 prvků |
| Seed | 42 |

Práh počtu prvků (VO5):

| | |
|---|---|
| Techniky | raf, css-transition, css-keyframes, waapi |
| Scéna | grid |
| Složitost | 50, 100, 250, 500, 800, 1200, 1500, 2000 prvků |
| Šířka ustáleného okna | 20 s |

Tři úrovně hlavní matice na určení prahu nestačí. Sweep hledá nejvyšší počet
prvků, při kterém technika drží podíl dosažené a dosažitelné frekvence alespoň
0,9. Menší podmnožina technik drží počet běhů v rozumných mezích: referenční
requestAnimationFrame, technika, která v pilotu propadala, a dvě nativní
techniky. Knihovny GSAP a Motion se v pilotu od reference nelišily.

Zvláštní režim a doplňkové srovnání:

| Technika | Scény | Složitost |
|---|---|---|
| scroll-driven | parallax | 100, 500, 2000 |
| view-transition | grid, composite | 50, 100, 200; `duration=1000`, bez parametru `window` |
| lottie | grid, composite | 100, 500, 2000 |
| react-motion (react.html) | grid | 100, 500, 2000 |

## Průběh

| | |
|---|---|
| Opakování | 10 platných běhů na kombinaci |
| Rozehřívací běh | 1 na kombinaci, zahazuje se |
| Pořadí | náhodné, seed dávky zapsaný v konfiguraci |
| Prodleva mezi běhy | 15 s |
| Vzorkování CPU | jen v samostatné dávce pro VO1, `cpuSampleIntervalMs: 1000`; dávky pro snímky bez vzorkování |
| Časové limity | 30 s do připravenosti, 300 s na běh |
| Výstup | `animbench-lab/data/final/` |

Odhad délky na jednom zařízení, včetně rozehřívacích běhů a prodlev:

| Blok | Běhů | Doba |
|---|---:|---:|
| hlavní matice, snímky (bez vzorkování) | 396 | 4,4 h |
| hlavní matice, vytížení CPU (VO1) | 396 | 4,4 h |
| scroll-driven | 33 | 0,4 h |
| View Transitions | 66 | 0,5 h |
| Lottie | 66 | 0,7 h |
| React Motion | 33 | 0,4 h |
| práh počtu prvků (VO5) | 352 | 4,1 h |
| ověření režie CPU (O1) | 44 | 0,6 h |
| **celkem** | **1386** | **15,4 h** |

Hlavní matice se může spustit samostatně jako první blok; zbytek lze měřit
v dalších dávkách se stejnou konfigurací prostředí.

Každý blok se ukládá do vlastní podsložky `data/final/<blok>/` a analyzuje se
samostatně. Bloky sdílejí některé kombinace (sweep a hlavní matice), dávky se
vzorkováním CPU a bez něj se nesmějí slučovat. Analýza běh se smíšeným
vzorkováním odmítne.

## Zahození běhu

Běh se zahazuje a zapisuje i s důvodem, pokud:

- přetekla vyrovnávací paměť sondy (`overflowed`)
- stránka místo výsledku vrátila `__benchError`
- klidové měření vrátilo frekvenci, která se od očekávané liší o více než 10 %
- akcelerace nebyla dostupná
- v ustáleném okně je méně než 100 snímků (jen hlavní matice; View Transitions
  je krátký přechod a tolik snímků mít nemůže)

Zahozený běh se nenahrazuje dodatečně v jiném pořadí. Pokud by kombinace měla
méně než osm platných běhů, uvádí se v práci samostatně.

## Vyhodnocení

Metriky se počítají z razítek v ustáleném okně skriptem analysis/analyze.py.

Primární metriky: podíl dosažené a dosažitelné frekvence (refresh ratio), podíl
snímků nad rozpočtem a první percentil snímkové frekvence. Medián rozestupu se
uvádí jen doplňkově, protože u techniky, která vynechává snímky, přeskakuje mezi
16,7 a 33,3 ms. Pro VO1 se uvádí podíl času, kdy je hlavní vlákno zaneprázdněné,
a čas procesu grafické karty.

| | |
|---|---|
| Srovnání všech technik | Kruskalův–Wallisův test pro každou kombinaci scény a složitosti |
| Srovnání dvojic | Mannův–Whitneyho test, asymptotický s korekcí na shody a spojitost |
| Mnohonásobné srovnávání | Holmova korekce přes 15 dvojic jedné kombinace scény, složitosti a metriky |
| Citlivost | Holmova korekce přes všechny dvojice analýzy najednou |
| Velikost účinku | epsilon na druhou pro celý test, Cliffovo delta pro dvojice |
| Rovnocennost | Hodgesův–Lehmannův posun, rovnocenné při 90% intervalu uvnitř meze |
| Hladina významnosti | 0,05 |

Dvojice se považuje za odlišnou, pokud je významný Kruskalův–Wallisův test
i Holmem upravený test dvojice. Za rovnocennou, pokud splní kritérium
rovnocennosti. Dvojice, která nesplní ani jedno, se popisuje jako
nerozhodnutelná, nikoli jako shodná.

Shapirův–Wilkův test se uvádí, ale volba testů na něm nezávisí.

View Transitions se vyhodnocují zvlášť: doba přípravy přechodu
(`oneShot.prepareMs`), délka přechodu (`oneShot.playMs`), podíl snímků nad
rozpočtem a nejdelší snímek během přechodu. Ustálené okno vede od připravenosti
po dokončení přechodu, takže příprava se do snímkových metrik nezapočítává.

Vytížení CPU (VO1) se vyhodnocuje z dávky se vzorkováním stejnými testy jako
snímky. Snímkové metriky se počítají výhradně z dávek bez vzorkování.

## Mez rovnocennosti

Navržená mez je **0,02 podílu dosažené a dosažitelné frekvence**, tedy přibližně
1,2 snímku za sekundu při 60 Hz, méně než jeden vynechaný snímek za sekundu.

Mez musí ležet nad vlivem měřicí vrstvy, jinak by test rovnocennosti hodnotil
nástroj, nikoli techniku. Režie vzorkování CPU byla zatím změřena jen při
intervalech 500 a 100 ms a jen na technice na hranici výkonu (css-transition při
2000 prvcích), s 95% intervalem rozdílu [−0,026; +0,013] při 500 ms. U technik
na stropu displeje má hlavní vlákno rezervu a režie se nemusí projevit, takže
by mohla působit nerovnoměrně.

Proto se před zafixováním (O1) změří při intervalu 1000 ms:

- techniky raf a css-transition, scéna grid, 2000 prvků
- deset běhů se vzorkováním a deset bez něj, v náhodném pořadí

Rozhodnutí podle výsledku, stanovené předem:

| Výsledek | Mez |
|---|---|
| 95% interval rozdílu u obou technik leží uvnitř ±0,01 | 0,02 |
| interval u některé techniky přesahuje ±0,01 | dvojnásobek nejvzdálenější hranice intervalu, zaokrouhlený nahoru na setiny |

Závěr o rovnocennosti se v práci uvádí spolu s použitou mezí a s výsledkem
ověření režie.

## Odchylky

**D1, 9. 10. 2026: spánek stroje během O1.** Měření běželo bez blokování
spánku a stroj usnul mezi 8:54 a 9:31 (doloženo v `pmset -g log`). Běhy č. 28
až 30 překročily časový limit a byly zahozeny. Běh č. 31 proběhl při probouzení,
displej na dvě sekundy zhasl. Nástroj od té doby blokuje spánek
po celou dobu dávky sám a ke každému běhu zapisuje `environment.keepAwake`
a stav napájení před i po běhu (`environment.power`).

**D2, 9. 10. 2026: pravidlo pro mez nešlo splnit.** Pravidlo „interval rozdílu
uvnitř ±0,01" bylo stanoveno bez ohledu na šum mezi opakováními. Při směrodatné
odchylce kolem 0,013 a deseti bězích na variantu má interval šířku přibližně
±0,012 už bez jakékoli režie, takže u css-transition podmínka splnitelná nebyla.
Výsledek O1:

| Technika | Posun (se vzorkováním − bez) | 95% interval | Mez podle pravidla |
|---|---:|---|---:|
| raf | 0,000 | [−0,002; 0,000] | — |
| css-transition | −0,008 | [−0,026; +0,005] | 0,06 |
| css-transition bez běhu č. 31 | −0,005 | [−0,022; +0,006] | 0,05 |

Bodový odhad režie je malý a odpovídá měření při 500 ms. U techniky na stropu
displeje se neprojevil vůbec, u techniky na hranici výkonu ano. Režie tedy
nepůsobí na všechny techniky stejně, a právě takové nerovnoměrné působení by
zkreslilo srovnání.

**D3, 9. 10. 2026: oddělení měření CPU od měření snímků. Rozhodnuto.**
Snímková frekvence se měří v bězích bez vzorkování CPU, vytížení CPU
v samostatných bězích se stejnou maticí. Měřicí vrstva tak do srovnání technik
nevstupuje vůbec a mez rovnocennosti 0,02 se zdůvodňuje vnímáním (méně než jeden
vynechaný snímek za sekundu při 60 Hz), nikoli režií nástroje. Cena: hlavní
matice se měří dvakrát, přibližně o 4,4 h navíc. Rozhodnutí podpořilo i to, že
vliv vzorkování v O1 nebyl rovnoměrný (u raf nulový, u css-transition −0,008).
Nástroj zapisuje interval vzorkování ke každému běhu a je součástí klíče
skupiny, takže se dávky se vzorkováním a bez něj nikdy nezprůměrují dohromady.

**D4, 10. 10. 2026: doplnění parametrů, které plán neuváděl.** Zjištěno při
přípravě konfigurací.

Šířka okna u zvláštního režimu a doplňkového srovnání:

- Lottie a React Motion: stejně jako hlavní matice, 10 s pro 100 prvků a 20 s
  pro 500 a 2000 prvků. React Motion se porovnává s vanilla Motion z hlavní
  matice, takže musí mít shodné okno.
- Scroll-driven: 20 s pro všechny složitosti, jako v pilotu. Vzdálenost posunu je
  pevná, takže délka určuje rychlost posunu. Odlišná délka podle složitosti by
  měnila rychlost a tím i zátěž.

Uplatnění pravidel zahození: nástroj je uplatňuje přímo při měření
a zapisuje důvod (`expectedRefreshRateHz` s tolerancí 10 % a
`minFramesInWindow: 100` jen v konfiguraci hlavní matice a sweepu). Analýza
pravidlo počtu snímků kontroluje znovu jako pojistku a případné vyřazení zapíše
do `excluded.csv`.

Očekávaná obnovovací frekvence se zadává podle zařízení, pro měřicí Mac 60 Hz.
U displejů s adaptivní frekvencí se kontrola nevynucuje: v klidu může displej
frekvenci snížit, takže klidové měření by se od jmenovité hodnoty lišilo
a pravidlo by zahodilo všechny běhy. U takových zařízení se klidová frekvence
pouze zaznamenává ke každému běhu, jak stanoví protokol, a v práci se uvádí
rozsah naměřených hodnot.
