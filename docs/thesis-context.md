# Kontext diplomové práce

Repozitář je součástí diplomové práce na Provozně ekonomické fakultě
České zemědělské univerzity v Praze, katedra informačních technologií.

Název práce: Webové animace a jejich vliv na plynulost a hardwarovou náročnost

Obhajoba je plánována na letní semestr 2026/27.

## Cíle

Hlavním cílem je analyzovat vliv různých animačních technik na plynulost
vykreslování a hardwarovou náročnost webových aplikací napříč zařízeními.

Dílčí cíle:
- vytvořit demonstrační webovou aplikaci s různými typy animací v několika
  úrovních složitosti (tento repozitář)
- vyvinout nástroj pro měření výkonnostních metrik (repozitář animbench)

## Výzkumné otázky

VO1: Jak se liší dopad animací v kaskádových stylech a v JavaScriptu na
vytížení procesoru a grafické karty?

VO2: Jaký vliv má složitost animace na snímkovou frekvenci a na počet
výpadků snímků?

VO3: Jak se výkonnostní dopady animací liší na desktopových a mobilních
zařízeních?

VO4: Které animační techniky vedou k největšímu počtu výpadků snímků při
posunu stránky?

VO5: Jaký počet současně animovaných prvků udrží plynulé vykreslování na
jednotlivých zařízeních?

VO6: Které animační přístupy lze doporučit z hlediska přístupnosti?

## Proč je srovnatelnost nejdůležitější omezení

Práce netvrdí, že jedna technika je hezčí. Tvrdí, že při shodné scéně,
shodné trajektorii a shodné době trvání zatíží jedna technika zařízení
jinak než druhá. Jakmile se scény mezi technikami liší byť jen v pořadí
transformačních funkcí, výsledek přestane měřit techniku a začne měřit
rozdíl v zadání.

Z toho plyne, že pravidla srovnatelnosti v CLAUDE.md mají přednost před
čitelností kódu, elegancí i výkonem samotné aplikace. Adaptér, který
pravidlo poruší, není v matici použitelný.

## Návaznost na jednotlivé otázky

Scéna grid slouží VO1, VO2 a VO3.
Scéna parallax slouží VO4 a vyžaduje skriptovaný posun stránky.
Scéna composite slouží VO2 při vyšší zátěži.
VO5 vyžaduje samostatný experiment se sweepem počtu prvků
(50, 100, 250, 500, 1000, 2000, 4000).
VO6 se neměří, hodnotí se srovnávací tabulkou vlastností technik.

## Úrovně složitosti

Tři úrovně v hlavní matici, přibližně 100, 500 a 2000 prvků. Volba vychází
z Koren Ivančević a kol. (2026), kde přístupy nad objektovým modelem
dokumentu zůstávaly stabilní u sta objektů a u pěti set výkon citelně klesal.

## Zvláštní režim

View Transitions API vytváří jednorázový přechod v řádu stovek milisekund,
takže průměrná snímková frekvence za desetisekundový běh u něj nedává smysl.
Nástroj Lottie přehrává předem připravený soubor a vytváří si vlastní
strukturu dokumentu, čímž porušuje pravidlo o neměnnosti scény.

Obě techniky se proto měří odlišným postupem a do hlavní statistiky nevstupují.

## Znalosti o měření, které ovlivňují návrh aplikace

Měření kolísá i při nezměněné stránce, proto se každá kombinace opakuje
vícekrát a pracuje se se souhrnnou hodnotou.

Mobilní prohlížeče neposkytují spolehlivé údaje o procesoru a grafické kartě,
takže na telefonech zůstává hlavním ukazatelem snímková frekvence.

Rozhraní Safari na systému iOS nelze řídit protokolem vývojářských nástrojů.
Měření na iPhonu proto probíhá ručně a spoléhá výhradně na sondu ve stránce.

Obnovovací frekvence obrazovek se mezi zařízeními liší. Sonda proto před
každým během změří klidový rozestup snímků, aby šlo výsledek vyjádřit jako
podíl dosažené a dosažitelné frekvence.
