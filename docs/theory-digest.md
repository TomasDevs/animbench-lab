# Výtah z teoretické části

Shrnutí kapitoly 3 diplomové práce, omezené na zjištění, která ovlivňují návrh
této aplikace. Slouží k tomu, aby bylo možné rozhodnout i v situaci, kterou
pravidla v CLAUDE.md nepokrývají. Plné znění je v textu práce.

## Proč se animuje jen transform a opacity

Prohlížeč skládá stránku v krocích: přepočet stylů, rozvržení, vykreslení,
složení vrstev. Kroky na sebe navazují, takže zdržení v úvodní fázi se promítne
do všech následujících.

Změna šířky, výšky nebo vlastností left a top vynutí přepočet rozvržení
(reflow) a následné překreslení. Posun zapsaný transformací a změna průhlednosti
přepočet rozvržení nevyžadují a prohlížeč je zvládne převážně na grafické kartě.

Naměřené časy u tisíce prvků (Vozisov a kol., 2019) ukazují, jak nerovnoměrně
jsou kroky drahé. Přepočet stylů u čistého CSS trval 4996 ms, rozvržení 1644 ms,
kdežto vykreslení jen 297 ms a složení vrstev 67 ms. U čistého JavaScriptu byl
přepočet stylů 81 ms a rozvržení 21 ms.

Pravidlo 3 v CLAUDE.md (jen transform a opacity) tedy není libovolná volba.
Drží měření v té části řetězce, kde se techniky skutečně liší.

Poznámka k VO a k propojení s kapitolou 3.2.3: omezení na transform a opacity
odřízne vazbu na teorii o drahých operacích. Doplňkový experiment s vlastnostmi
left a top na jedné technice by teorii s praxí propojil. Není součástí hlavní
matice a měří se odděleně.

## Proč je časovací funkce vždy linear

Prohlížeč dopočítává mezilehlé hodnoty mezi klíčovými snímky. U lineární
interpolace mezi shodnými klíčovými snímky dá každý engine tutéž hodnotu.
Rozdíly vznikají až u nelineárních křivek, kde se implementace liší, protože
ease-in-out v kaskádových stylech a power2.inOut v GSAP nejsou tatáž křivka.

Proto je v hlavní matici linear. Jinak by se neměřila technika, ale rozdíl
v interpolační křivce.

## Proč jediná vlastnost transform se stálým pořadím funkcí

Seznam transformačních funkcí musí být v každém klíčovém snímku strukturálně
shodný a ve stejném pořadí. Když se v jednom snímku objeví translate a scale
a v druhém jen translate, prohlížeč přejde na rozklad matice a výsledek se
rozejde.

Hodnoty se zapisují jedinou vlastností transform, ne dílčími vlastnostmi
translate, scale a rotate.

## Vrstvy a will-change

Prohlížeč drží stránku ve stromu dokumentu, stromu vykreslení a stromu vrstev.
Změní-li se obsah jedné vrstvy, překreslí se jen ona.

Vlastnost will-change umožňuje vznik vrstvy vynutit předem. Příprava vrstvy
ovšem zabírá paměť, takže plošné použití zatíží zařízení zbytečně. Pokud se
v aplikaci použije, musí být nastavena shodně u všech technik, jinak by se
měřil rozdíl v přípravě vrstev, ne v technice.

## Snímkový rozpočet a obnovovací frekvence

Při šedesáti snímcích za sekundu připadá na snímek zhruba 16,7 ms. Do té doby
se musí vejít všechny kroky vykreslování. Delší práce znamená výpadek snímku,
tedy jedno vynechané obnovení obrazovky.

Rozpočet 16,7 ms ovšem platí jen pro šedesát hertzů. Herní monitory běžně jedou
na 144 Hz a telefony na 120 Hz, takže mají rozpočet poloviční i menší. Dotaz na
obnovovací frekvenci obrazovky přes webové rozhraní neexistuje, proto ji sonda
měří empiricky: před během nechá běžet prázdnou smyčku requestAnimationFrame
po jednu sekundu bez animace a vezme medián rozestupu.

Adaptivní obrazovky frekvenci mění samy podle obsahu, proto se zaznamenává ke
každému běhu, ne jednou za zařízení.

Výsledky se pak vyjadřují i jako podíl dosažené a dosažitelné frekvence. Práh
pro VO5 nemůže znít padesát pět snímků natvrdo, ale vztahuje se k rozpočtu
daného zařízení, například devadesát procent rozpočtu.

## Proč se agreguje mimo stránku

Průměr sám o sobě nestačí, protože krátký propad plynulosti se v něm ztratí,
přestože jej uživatel zaznamená. Proto se vedle průměru sleduje medián, první
a pátý percentil, nejdelší snímek a počet snímků nad rozpočet. Percentily
nahrazují prosté minimum, které rozbije jediná odlehlá hodnota.

Samotné měření není zadarmo a spotřebuje část výkonu. Sonda proto sbírá jen
časová razítka a nic nepočítá. Výpočet průměru uvnitř stránky by zatížil právě
to vlákno, které se měří.

## Proč se každá kombinace opakuje

Výsledky kolísají i tehdy, když se stránka nezmění. Rozptyl působí stav sítě,
zatížení zařízení a chování prohlížeče, takže jediný běh může dát
nereprezentativní hodnotu. Řešením je opakovat měření a pracovat se souhrnnou
hodnotou.

Počet opakování se mezi studiemi liší. Beňo a Ölvecký (2024) opakovali pětkrát,
Stanić Loknar a kol. (2023) desetkrát.

## Prostředí měření

Měří se s viditelným oknem, ne bezhlavě. Bezhlavý režim historicky nepoužíval
grafickou akceleraci a bez kompozitoru na grafické kartě by se ztratila právě ta
výhoda kaskádových stylů, kterou práce zkoumá. Dostupnost akcelerace se ověří
na začátku, ještě před rozhodovacím bodem.

Okno nesmí být během běhu ničím zakryté ani minimalizované, protože Chromium
v takovém případě omezí volání requestAnimationFrame.

Režie automatizačního nástroje se liší. Náklady na tutéž akci se mezi nástroji
lišily až šestinásobně a Puppeteer vykázal nižší režii než Playwright
(Lagermann a kol., 2025). Měřicí vrstva proto zůstává co nejtenčí a u všech
technik shodná.

## Přístupnost (VO6)

Vestibulární poruchu vykazovalo 35,4 procenta dospělých Američanů starších
čtyřiceti let (Agrawal a kol., 2009). Nejrizikovější jsou rozsáhlé pohyby přes
celou plochu okna, tedy parallax při posunu stránky.

Dotaz prefers-reduced-motion se vztahuje jen na animace zapsané kaskádovými
styly. Animace řízené JavaScriptem nebo knihovnou vyžadují samostatné ošetření
přes matchMedia. Právě v tom se techniky liší a z toho vychází srovnávací
tabulka pro VO6: zda technika předvolbu respektuje sama od sebe, jak nákladné
je ruční ošetření a zda jde animaci zastavit kvůli kritériu WCAG 2.2.2.

Pozor na dopad do měřicí stránky: pokud by aplikace předvolbu respektovala,
animace by se na stroji se zapnutým omezením pohybu vůbec nespustila a měření
by vyšlo prázdné. Ošetření předvolby proto patří na rozcestník, ne na měřicí
stránku, a v metodice se to musí přiznat.

## Očekávání z dosavadních studií

Slouží jako kontrola, zda naměřené hodnoty nejsou zjevně mimo.

Kaskádové styly vykazovaly nižší vytížení procesoru než přístup přes JavaScript
(Koren Ivančević a kol., 2026). Deklarativní animace v CSS se osvědčily
u intervalů delších než padesát milisekund (Garaizar a kol., 2014). Z knihoven
vyšla nejlépe GSAP, která ovšem spotřebovala nejvíce paměti (Vozisov a kol.,
2019). Nativní technologie překonaly knihovny (Beňo a Ölvecký, 2024).

Přístupy nad objektovým modelem dokumentu zůstávaly stabilní u sta objektů,
u pěti set výkon citelně klesal (Koren Ivančević a kol., 2026). Odtud pochází
volba tří úrovní složitosti.

## Mezery, které práce zaplňuje

Dosavadní studie sledovaly hlavně nízkoúrovňové technologie, nikoli běžně
používané knihovny a moderní rozhraní. Statistické testy použili jedině
Garaizar a kol. (2014). Citlivost uživatelů na pohyb nezohledňuje žádná
z uvedených prací.

Ověření ekvivalence trajektorií před hlavním měřením citované práce nemají
vůbec. Je to hlavní metodický přínos a důvod, proč jsou pravidla srovnatelnosti
v CLAUDE.md nadřazena čitelnosti kódu.
