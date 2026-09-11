# VO6: Přístupnost animačních technik

Podklad k výzkumné otázce VO6, tedy které animační přístupy lze doporučit
z hlediska přístupnosti. Otázka se neměří, hodnotí se srovnáním vlastností.

Hodnoceny jsou tři věci: zda technika sama respektuje předvolbu uživatele pro
omezení pohybu, jak nákladné je ruční ošetření a zda jde animaci zastavit kvůli
kritériu WCAG 2.2.2. Vlastnosti byly ověřeny v prohlížeči, nikoli převzaty
z dokumentace; naměřené hodnoty jsou uvedeny u jednotlivých kapitol.

## Srovnávací tabulka

| Technika | Respektuje předvolbu sama | Náklad ručního ošetření | Zastavení (WCAG 2.2.2) |
|---|---|---|---|
| CSS transitions | ne, ale spadá pod plošné pravidlo | jedno pravidlo v kaskádě | bez nativní pauzy |
| CSS keyframes | ne, ale spadá pod plošné pravidlo | jedno pravidlo v kaskádě | `animation-play-state` |
| Scroll-driven | ne, ale spadá pod plošné pravidlo | jedno pravidlo v kaskádě | `animation-play-state` |
| Web Animations API | ne | kontrola v kódu před spuštěním | `pause()` a `play()` |
| requestAnimationFrame | ne | kontrola v kódu před spuštěním | vlastní řízení smyčky |
| GSAP | ne | kontrola v kódu před spuštěním | `pause()` a `resume()` |
| Motion | ne | kontrola v kódu před spuštěním | `stop()` vrací do výchozího stavu |
| View Transitions | ne | kontrola v kódu před spuštěním | `skipTransition()` |
| Lottie | ne | kontrola v kódu před spuštěním | `pause()` a `play()` |

Žádná technika předvolbu nerespektuje sama od sebe. Rozdíl je v tom, kolik práce
stojí ji ošetřit.

## Předvolba prefers-reduced-motion

Dotaz je vlastností kaskádových stylů, takže se na něj může navázat jedině
animace zapsaná v kaskádě. Ověřeno, že pravidlo uvnitř bloku s podmínkou
prefers-reduced-motion se korektně uplatní na animation-duration i na
transition-duration, a že tím lze plošně vypnout všechny deklarativní animace
na stránce.

Pro techniky řízené JavaScriptem takový mechanismus neexistuje. Předvolbu je
nutné přečíst metodou matchMedia a rozhodnout se v kódu. Rozdíl je tedy zásadní:

U kaskádových stylů, včetně animací řízených posunem, stačí jediné pravidlo,
které pokryje celou stránku najednou a platí i pro kód, který vznikne později.

U requestAnimationFrame, Web Animations API, knihoven GSAP a Motion, rozhraní
View Transitions i nástroje Lottie je nutné ošetřit každé místo zvlášť. Na
opomenuté místo žádné plošné pravidlo nedosáhne.

Uvedené omezení potvrzuje i W3C: technika C39 se výslovně vztahuje pouze na
animace zapsané kaskádovými styly.

## Zastavení pohybu

Kritérium WCAG 2.2.2 požaduje, aby šel pohyb trvající déle než pět sekund
pozastavit, zastavit nebo skrýt. Ověřeno chování jednotlivých mechanismů:

Web Animations API nabízí pause() a play(). Naměřeno, že po pozastavení se prvek
nepohne ani o setinu pixelu a po obnovení pokračuje z téhož místa.

Kaskádové styly s klíčovými snímky nabízejí animation-play-state. Chování je
shodné, tedy nulový posun po pozastavení a pokračování po obnovení.

Kaskádové přechody nativní pauzu nemají. Jediná cesta je přečíst dopočítanou
hodnotu a zapsat ji zpět, čímž se přechod zruší. Prvek sice zůstane stát, ale
animaci nelze obnovit z místa zastavení, pouze spustit znovu.

Knihovny GSAP a Lottie mají vlastní metody pro pozastavení, které polohu udrží.

Knihovna Motion se liší. Metoda stop() animaci ukončí a prvek se vrátí do
výchozího stavu; ověřeno, že prvek zastavený v poloze 35,3 pixelu skončil na
nule. Pro splnění kritéria 2.2.2 je proto nutné polohu před zastavením přečíst
a zapsat zpět, podobně jako u kaskádových přechodů.

Rozhraní View Transitions nabízí skipTransition(), což přechod okamžitě dokončí.
Vzhledem k tomu, že celý přechod trvá stovky milisekund, kritérium 2.2.2 se na
něj nevztahuje.

Animace řízené requestAnimationFrame nemají žádný vestavěný mechanismus, ale
vývojář má nad smyčkou plnou kontrolu, takže zastavení je triviální.

## Rozsah pohybu

Kritéria se vztahují na kontrolu nad pohybem, samotný rozsah pohybu ovšem určuje
už návrh stránky. Nejrizikovější jsou rozsáhlé pohyby přes celou plochu okna,
tedy právě parallax při posunu stránky, který u citlivých uživatelů vyvolává
nevolnost nejsnáze.

Scéna parallax v této práci proto není jen zátěžovým testem, ale i příkladem
vzorce, který je z hlediska přístupnosti nejproblematičtější.

## Doporučení

Z hlediska přístupnosti vycházejí nejlépe animace zapsané kaskádovými styly.
Jediné pravidlo pokryje celou stránku, platí i pro budoucí kód a nelze je
opomenout u jednotlivého volání.

Techniky řízené JavaScriptem vyžadují ukázněnost. Ošetření je sice jednoduché,
ale musí se provést všude, a na opomenuté místo žádné plošné pravidlo nedosáhne.
Doporučení proto zní soustředit rozhodnutí o pohybu do jediného místa v kódu,
například do obálky nad spouštěním animací.

Z hlediska zastavitelnosti vycházejí nejlépe Web Animations API a kaskádové
animace s klíčovými snímky, protože pozastavení i obnovení mají přímo v rozhraní.
Nejhůře vycházejí kaskádové přechody, u nichž pauza vůbec neexistuje.

## Poznámka k měřicí stránce

Měřicí stránka bench.html předvolbu záměrně nerespektuje. Kdyby ji respektovala,
animace by se na zařízení se zapnutým omezením pohybu vůbec nespustila a měření
by vyšlo prázdné. Ošetření předvolby patří na rozcestník, nikoli na měřicí
stránku, a tato výjimka se přiznává v metodice.
