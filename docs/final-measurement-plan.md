# Plán závěrečného měření

Předem stanovený postup závěrečného měření a jeho vyhodnocení. Dokument vzniká
před měřením a po jeho zahájení se nemění; případná odchylka se zapíše do
kapitoly Odchylky s datem a důvodem. Slouží jako doklad, že metoda nebyla
přizpůsobena výsledkům.

Podmínky jednoho běhu popisuje docs/measurement-protocol.md, pilotní data
a jejich zpracování data/pilot/ a analysis/.

Stav: **návrh**. Plán se zafixuje, jakmile budou uzavřeny otevřené body níže.

## Otevřené body před zafixováním

| | Bod | Kdo | Podmínka uzavření |
|---|---|---|---|
| O1 | Režie vzorkování CPU při 1000 ms | animbench | viz kapitola Mez rovnocennosti |
| O2 | Časy přechodu u View Transitions | animbench-lab | stránka zapíše do metadat okamžik připravenosti a dokončení přechodu |
| O3 | Ustálené okno u View Transitions | animbench-lab | ověřit, že okno odpovídá průběhu přechodu, nikoli zpoždění mezi prvky |
| O4 | Ověření ekvivalence | animbench-lab | **uzavřeno 9. 10. 2026**: všech 10 dvojic ekvivalentních; zopakovat, pokud se sestavení změní |

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

Zvláštní režim a doplňkové srovnání:

| Technika | Scény | Složitost |
|---|---|---|
| scroll-driven | parallax | 100, 500, 2000 |
| view-transition | grid, composite | 50, 100, 200 |
| lottie | grid, composite | 100, 500, 2000 |
| react-motion (react.html) | grid | 100, 500, 2000 |

## Průběh

| | |
|---|---|
| Opakování | 10 platných běhů na kombinaci |
| Rozehřívací běh | 1 na kombinaci, zahazuje se |
| Pořadí | náhodné, seed dávky zapsaný v konfiguraci |
| Prodleva mezi běhy | 15 s |
| Vzorkování CPU | `cpuSampleIntervalMs: 1000` |
| Časové limity | 30 s do připravenosti, 300 s na běh |
| Výstup | `animbench-lab/data/final/` |

Odhad délky na jednom zařízení, včetně rozehřívacích běhů a prodlev:

| Blok | Běhů | Doba |
|---|---:|---:|
| hlavní matice | 396 | 4,4 h |
| scroll-driven | 33 | 0,4 h |
| View Transitions | 66 | 0,5 h |
| Lottie | 66 | 0,7 h |
| React Motion | 33 | 0,4 h |
| ověření režie CPU (O1) | 44 | 0,6 h |
| **celkem** | **638** | **6,9 h** |

Hlavní matice se může spustit samostatně jako první blok; zbytek lze měřit
v dalších dávkách se stejnou konfigurací prostředí.

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

Zatím žádné.
