# Postup prací

Stav a další kroky. Aktualizuje se průběžně, není to závazný harmonogram.

## Hotovo

Svislý řez sloučený do main. Obsahuje minimální průchod celým řetězcem od adresy
po výsledek, aby se metodika dala ověřit dřív, než se do ní investuje čas.

- typy: AnimationSpec, Keyframe, SceneId, AdapterContext, rozhraní adaptéru
- scéna grid se seedovaným generátorem
- referenční adaptér nad requestAnimationFrame
- adaptér pro CSS transitions
- sonda s klidovým měřením obnovovací frekvence
- ovládací panel v režimu demo, v režimu bench nevzniká
- validátor ekvivalence trajektorií
- rozcestník s odkazy na demo běhy a na validaci

## Rozhodovací bod

Další práce má smysl až po ověření, že rozptyl mezi shodnými běhy je menší než
rozdíl mezi technikami. Pokud tomu tak není, metodika neobstojí a další adaptéry
by byly prací k zahození.

Postup:

1. Založit repozitář animbench: Node, TypeScript, Playwright, viditelné okno.
2. Režim s vestavěnou sondou: nástroj otevře bench.html, počká na
   window.__benchReady a po doběhnutí odečte window.__benchResult.
3. Výstup NDJSON se surovými razítky, jeden řádek na běh.
4. Agregace v Node: průměr, medián, první a pátý percentil, nejdelší snímek,
   počet snímků nad rozpočtem.
5. Dvacet běhů shodné kombinace a posouzení rozptylu.

Podmínky měření popisuje docs/measurement-protocol.md.

## Po rozhodovacím bodu

Teprve když rozptyl obstojí, má smysl škálovat.

Adaptéry do hlavní matice: hotové jsou requestAnimationFrame, CSS transitions,
CSS keyframes, Web Animations API, GSAP a Motion ve vanilla podobě, všechny
ověřené proti referenci na stránce validate.html.

Zbývá scroll-driven, který ovšem nelze doplnit dřív než scénu parallax. Ověřeno,
že bez posunu se animace nepohne vůbec, a scéna grid posuvník nemá; podrobnosti
v docs/measurement-protocol.md.

Scéna composite je hotová a ověřená. Je první, kde scale a rotate nejsou
neutrální, takže teprve na ní se dá ověřit pořadí transformačních funkcí; na
mřížce by rozdíl zůstal skrytý, protože neutrální hodnoty dávají tutéž matici.

Scéna parallax je hotová. Staví vlastní posuvník uvnitř scény a vystavuje jej
jako pojmenovanou časovou osu, na kterou se váže adaptér scroll-driven. Posun
řídí adaptér programově, syntetizované vstupní gesto není potřeba.

Scroll-driven se měří ve zvláštním režimu, nikoli v hlavní matici: techniky
řízené časem na scéně parallax neprodukují parallax, takže scéna nemá referenční
implementaci a ekvivalence trajektorií pro ni není definovaná. Odůvodnění je
v docs/measurement-protocol.md.

Samostatný experiment pro VO5: sweep přes 50, 100, 250, 500, 1000, 2000 a 4000
prvků s hledáním bodu, kde medián klesne pod práh odvozený z rozpočtu zařízení.
Menší podmnožina technik, jinak počet běhů naroste nesmyslně.

Vstupní bod react.html pro srovnání vanilla Motion proti React Motion. Vyjde
z něj čistá režie frameworku.

Zvláštní režim je hotový: scroll-driven animace, View Transitions API a Lottie.
Do hlavní statistiky nevstupují a každá má vlastní proceduru i vlastní veličiny,
popsané v docs/measurement-protocol.md.

Srovnávací tabulka pro VO6. Neměří se, hodnotí se: zda technika respektuje
prefers-reduced-motion sama od sebe, jak nákladné je ruční ošetření a zda jde
animaci zastavit kvůli kritériu WCAG 2.2.2.

## Nakonec

Nasazení na GitHub Pages přes Actions. Hodnota base je v konfiguraci nastavená,
chybí workflow.

Volitelně results.html s grafy z naměřených dat.

Rozhodovací tabulka pro vývojáře do kapitoly 5: sloupce podle situace, tedy
jednoduchý přechod, parallax, složitá scéna, vysoký počet prvků a slabé mobilní
zařízení, v buňkách doporučená technika s odůvodněním.

## Co záměrně neděláme

Favicona, meta popisky a optimalizace pro vyhledávače. Aplikace je měřicí
přístroj k jedné práci, nikoli veřejný web. Na stránce bench.html by favicona
navíc znamenala další síťový požadavek.

Jakákoli běhová knihovna nad rámec měřených technik. Každý skript v hlavním
vlákně znečišťuje měření.
