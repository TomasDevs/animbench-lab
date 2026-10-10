import '../style.css'
import './techniques.css'
import { applyTheme, readTheme, themeToggle } from '../theme.ts'
import { applyLang, carry, langToggle, readLang, toggleClass, type Lang } from '../i18n.ts'

/**
 * Techniques page. Never measured: a plain-language account of what each
 * technique is, for readers who are not front-end developers.
 */

type Text = {
  name: string
  summary: string
  web: string
  devtools: string
  note?: string
}

type Technique = {
  id: string
  /** Who computes the in-between frames: the browser from a declaration, or a script every frame. */
  driver: 'browser' | 'script'
  code: string
  text: Record<Lang, Text>
}

const MAIN: Technique[] = [
  {
    id: 'css-transition',
    driver: 'browser',
    code: `.menu { transition: transform 300ms linear; }
.menu.is-open { transform: translateX(240px); }`,
    text: {
      en: {
        name: 'CSS transitions',
        summary: 'You declare a start and an end state. When the property changes, the browser fills in the frames between them.',
        web: 'Hover effects, opening menus, buttons, switches.',
        devtools: 'document.getAnimations() returns CSSTransition; the element carries a transition property.',
        note: 'A transition only goes from A to B. A path with several steps has to be chained from a script, here with a timer per step: at 2000 elements that means thousands of style changes on the main thread.',
      },
      cs: {
        name: 'CSS přechody',
        summary: 'Určíš počáteční a koncový stav. Když se vlastnost změní, prohlížeč dopočítá snímky mezi nimi.',
        web: 'Efekty při najetí myší, rozbalovací menu, tlačítka, přepínače.',
        devtools: 'document.getAnimations() vrátí CSSTransition, prvek má vlastnost transition.',
        note: 'Přechod vede jen z A do B. Dráhu o více krocích je nutné řetězit ze skriptu, tady časovačem pro každý krok: při 2000 prvcích to znamená tisíce změn stylu v hlavním vlákně.',
      },
    },
  },
  {
    id: 'css-keyframes',
    driver: 'browser',
    code: `@keyframes slide {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(240px); }
  100% { transform: translateX(0); }
}
.badge { animation: slide 2s linear infinite; }`,
    text: {
      en: {
        name: 'CSS keyframes',
        summary: 'The whole path is written in CSS as a list of keyframes. The browser plays it on its own, repetition included.',
        web: 'Loading spinners, pulsing badges, entrance animations, looping decorations.',
        devtools: 'getAnimations() returns CSSAnimation; the element carries animation-name.',
      },
      cs: {
        name: 'CSS klíčové snímky',
        summary: 'Celá dráha je zapsaná v CSS jako seznam klíčových snímků. Prohlížeč ji přehraje sám, včetně opakování.',
        web: 'Načítací kolečka, pulzující odznaky, nástupové animace, opakující se dekorace.',
        devtools: 'getAnimations() vrátí CSSAnimation, prvek má vlastnost animation-name.',
      },
    },
  },
  {
    id: 'waapi',
    driver: 'browser',
    code: `el.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(240px)' }],
  { duration: 2000, easing: 'linear', iterations: Infinity },
)`,
    text: {
      en: {
        name: 'Web Animations API',
        summary: 'The engine behind CSS animations, controlled from JavaScript. Keyframes go to element.animate() and the browser plays them.',
        web: 'Components that pause, reverse or seek an animation; the base several libraries build on.',
        devtools: 'getAnimations() returns Animation; the Elements panel shows no style changes.',
      },
      cs: {
        name: 'Web Animations API',
        summary: 'Engine CSS animací ovládaný z JavaScriptu. Klíčové snímky se předají metodě element.animate() a prohlížeč je přehraje.',
        web: 'Komponenty, které animaci pozastavují, obracejí nebo přetáčejí; základ, na kterém staví řada knihoven.',
        devtools: 'getAnimations() vrátí Animation, v panelu Elements se styl nemění.',
      },
    },
  },
  {
    id: 'raf',
    driver: 'script',
    code: `function tick(now) {
  el.style.transform = \`translateX(\${position(now)}px)\`
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)`,
    text: {
      en: {
        name: 'requestAnimationFrame',
        summary: 'JavaScript computes the position itself before every frame and writes it to the element. Full control, and all the work on the main thread.',
        web: 'Games, canvas, physics, custom effects; the low-level base of animation libraries.',
        devtools: 'getAnimations() is empty; the style attribute changes every frame; Performance shows Animation Frame Fired in each frame.',
        note: 'The reference: every other technique is checked against its trajectory.',
      },
      cs: {
        name: 'requestAnimationFrame',
        summary: 'JavaScript před každým snímkem sám spočítá polohu a zapíše ji prvku. Plná kontrola a veškerá práce v hlavním vlákně.',
        web: 'Hry, canvas, fyzika, vlastní efekty; nízkoúrovňový základ animačních knihoven.',
        devtools: 'getAnimations() je prázdné, atribut style se mění každý snímek, v panelu Performance je v každém snímku Animation Frame Fired.',
        note: 'Reference: trajektorie všech ostatních technik se ověřuje proti ní.',
      },
    },
  },
  {
    id: 'gsap',
    driver: 'script',
    code: `gsap.to(el, { x: 240, duration: 2, ease: 'none', repeat: -1, yoyo: true })`,
    text: {
      en: {
        name: 'GSAP',
        summary: 'A widespread animation library. It runs its own loop on top of requestAnimationFrame and adds timelines, easing and sequencing.',
        web: 'Marketing sites, interactive showcase pages, complex sequences and scroll effects.',
        devtools: 'getAnimations() is empty; Network downloads the gsap file; Performance shows the GSAP ticker in each frame.',
        note: 'Here it animates a plain value and the adapter writes the transform, because GSAP would otherwise reorder the transform functions.',
      },
      cs: {
        name: 'GSAP',
        summary: 'Rozšířená animační knihovna. Běží ve vlastní smyčce nad requestAnimationFrame a přidává časové osy, průběhy a řazení animací.',
        web: 'Marketingové weby, interaktivní prezentační stránky, složité sekvence a efekty při posunu.',
        devtools: 'getAnimations() je prázdné, v panelu Network se stáhne soubor gsap, v Performance je v každém snímku ticker GSAP.',
        note: 'Tady animuje pomocnou hodnotu a transform zapisuje adaptér, protože GSAP by jinak přeskládal pořadí transformačních funkcí.',
      },
    },
  },
  {
    id: 'motion',
    driver: 'script',
    code: `animate(el, { x: 240 }, { duration: 2, ease: 'linear', repeat: Infinity })`,
    text: {
      en: {
        name: 'Motion',
        summary: 'A modern animation library, formerly Framer Motion. Measured through its plain JavaScript animate() function, without React.',
        web: 'React and other modern front ends, product interfaces, micro-interactions.',
        devtools: 'getAnimations() is empty; Network downloads the motion file; Performance shows its frame loop in each frame.',
        note: 'Motion can hand transform and opacity over to the browser through the Web Animations API. Here it animates a plain value to keep the transform order fixed, so what is measured is its JavaScript engine, not that path.',
      },
      cs: {
        name: 'Motion',
        summary: 'Moderní animační knihovna, dříve Framer Motion. Měří se přes její čistě JavaScriptovou funkci animate(), bez Reactu.',
        web: 'React a další moderní front-endy, produktová rozhraní, mikrointerakce.',
        devtools: 'getAnimations() je prázdné, v panelu Network se stáhne soubor motion, v Performance je v každém snímku její smyčka.',
        note: 'Motion umí transform a opacity předat prohlížeči přes Web Animations API. Tady animuje pomocnou hodnotu, aby zůstalo pevné pořadí transformací, takže se měří její JavaScriptový engine, ne tato cesta.',
      },
    },
  },
]

const SEPARATE: Technique[] = [
  {
    id: 'scroll-driven',
    driver: 'browser',
    code: `.layer {
  animation: drift linear both;
  animation-timeline: scroll();
}`,
    text: {
      en: {
        name: 'Scroll-driven animations',
        summary: 'A CSS animation whose progress follows the scroll position instead of time.',
        web: 'Reading progress bars, parallax, elements revealed as the page scrolls.',
        devtools: 'getAnimations() returns CSSAnimation whose timeline is a ScrollTimeline.',
        note: 'Progress comes from scrolling, not from a clock, so it cannot be set against the time-driven techniques. Measured on the parallax scene only.',
      },
      cs: {
        name: 'Animace řízené posunem',
        summary: 'CSS animace, jejíž průběh sleduje polohu posuvníku místo času.',
        web: 'Ukazatele průběhu čtení, parallax, prvky odkrývané při posunu stránky.',
        devtools: 'getAnimations() vrátí CSSAnimation, jejíž časová osa je ScrollTimeline.',
        note: 'Průběh určuje posun, ne hodiny, takže ji nelze postavit proti technikám řízeným časem. Měří se jen ve scéně parallax.',
      },
    },
  },
  {
    id: 'view-transition',
    driver: 'browser',
    code: `document.startViewTransition(() => {
  card.classList.add('is-expanded')
})`,
    text: {
      en: {
        name: 'View Transitions API',
        summary: 'The browser takes a snapshot of the page, you change the DOM, and it animates between the old and the new picture.',
        web: 'Page transitions, a card expanding into a detail, reordering lists.',
        devtools: 'While the transition runs, the ::view-transition pseudo-element tree appears at the top of the Elements panel.',
        note: 'A single transition rather than a looping animation, and it takes snapshots before anything moves. Measured as preparation time and dropped frames, up to 200 elements.',
      },
      cs: {
        name: 'View Transitions API',
        summary: 'Prohlížeč vyfotí stránku, ty změníš DOM a on animuje mezi starým a novým obrázkem.',
        web: 'Přechody mezi stránkami, karta rozbalující se do detailu, přeskládání seznamu.',
        devtools: 'Během přechodu se v panelu Elements nahoře objeví strom pseudoprvků ::view-transition.',
        note: 'Jeden přechod, ne opakovaná animace, a než se cokoli pohne, pořizuje snímky. Měří se doba přípravy a vynechané snímky, nejvýše při 200 prvcích.',
      },
    },
  },
  {
    id: 'lottie',
    driver: 'script',
    code: `lottie.loadAnimation({
  container: el,
  renderer: 'svg',
  path: 'animation.json',
})`,
    text: {
      en: {
        name: 'Lottie',
        summary: 'Plays an animation exported from a design tool as a JSON file and draws it as SVG.',
        web: 'Illustrated icons, onboarding screens, animated logos.',
        devtools: 'An svg element with deeply nested groups appears; getAnimations() is empty.',
        note: 'It draws its own elements instead of moving the scene’s, which breaks the rule that every technique animates the same page. The file here is generated from the same specification, so the motion is identical.',
      },
      cs: {
        name: 'Lottie',
        summary: 'Přehrává animaci exportovanou z grafického nástroje jako soubor JSON a kreslí ji jako SVG.',
        web: 'Ilustrované ikony, úvodní obrazovky aplikací, animovaná loga.',
        devtools: 'Objeví se prvek svg s hluboce vnořenými skupinami, getAnimations() je prázdné.',
        note: 'Kreslí vlastní prvky místo toho, aby hýbal prvky scény, a tím porušuje pravidlo, že všechny techniky animují stejnou stránku. Soubor je tu vygenerovaný ze stejné specifikace, takže pohyb je totožný.',
      },
    },
  },
]

const STRINGS = {
  en: {
    title: 'animbench-lab techniques',
    crumb: 'Techniques',
    lead: 'What each measured technique is, where it shows up on the web, and how to recognise it in DevTools.',
    frameTitle: 'How a browser draws a frame',
    frameLead: 'A display refreshes a fixed number of times per second, usually 60. The browser therefore has about 16.7 ms for each frame. When it misses, the frame comes late and the motion stutters.',
    steps: [
      ['Style', 'which rules apply'],
      ['Layout', 'where everything sits'],
      ['Paint', 'pixels for each layer'],
      ['Composite', 'layers stacked on screen'],
    ],
    skipped: 'Changing transform or opacity skips layout and paint: the browser only moves layers it has already drawn, often on the graphics card. That is why every technique here animates only these two properties.',
    mainTitle: 'Compared directly',
    mainLead: 'All six receive the same description of the motion and produce the same picture. They differ only in who computes the frames in between.',
    separateTitle: 'Measured separately',
    separateLead: 'Each of these breaks one of the comparability rules by its nature, so it gets its own procedure.',
    browser: 'browser computes',
    script: 'script computes',
    web: 'On the web',
    devtools: 'In DevTools',
    layoutTitle: 'Why not top and left',
    layoutText: 'Moving an element with top or left changes its geometry, so the browser recomputes layout and repaints in every frame. It is the slowest common way to animate and the reason the techniques above use transform. It is left out of the comparison because it would measure the property, not the technique.',
    footer: 'Scenes, specification and comparability rules are described in docs/thesis-context.md.',
    theme: { light: 'Switch to light theme', dark: 'Switch to dark theme' },
  },
  cs: {
    title: 'animbench-lab techniky',
    crumb: 'Techniky',
    lead: 'Co je každá měřená technika, kde se s ní potkáte na webu a jak ji poznat v DevTools.',
    frameTitle: 'Jak prohlížeč kreslí snímek',
    frameLead: 'Displej se obnovuje pevně daným počtem snímků za sekundu, obvykle 60. Prohlížeč má proto na každý snímek zhruba 16,7 ms. Když to nestihne, snímek přijde pozdě a pohyb se zadrhne.',
    steps: [
      ['Styly', 'která pravidla platí'],
      ['Rozvržení', 'kde co leží'],
      ['Vykreslení', 'pixely každé vrstvy'],
      ['Složení', 'vrstvy na obrazovce'],
    ],
    skipped: 'Změna transform nebo opacity rozvržení i vykreslení přeskočí: prohlížeč jen posouvá už nakreslené vrstvy, často na grafické kartě. Proto všechny techniky na této stránce animují jen tyto dvě vlastnosti.',
    mainTitle: 'Přímo srovnávané',
    mainLead: 'Všech šest dostává stejný popis pohybu a kreslí stejný obraz. Liší se jen tím, kdo dopočítává snímky mezi klíčovými body.',
    separateTitle: 'Měřené samostatně',
    separateLead: 'Každá z nich už svou podstatou porušuje některé z pravidel srovnatelnosti, a proto má vlastní postup.',
    browser: 'počítá prohlížeč',
    script: 'počítá skript',
    web: 'Na webu',
    devtools: 'V DevTools',
    layoutTitle: 'Proč ne top a left',
    layoutText: 'Posun prvku přes top nebo left mění jeho geometrii, takže prohlížeč v každém snímku znovu počítá rozvržení a překresluje. Je to nejpomalejší běžný způsob animace a důvod, proč techniky výše používají transform. Do srovnání nepatří, protože by měřil vlastnost, ne techniku.',
    footer: 'Scény, specifikace a pravidla srovnatelnosti jsou popsané v docs/thesis-context.md.',
    theme: { light: 'Přepnout na světlý motiv', dark: 'Přepnout na tmavý motiv' },
  },
} satisfies Record<Lang, unknown>

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function techniqueCard(technique: Technique, lang: Lang): HTMLElement {
  const t = STRINGS[lang]
  const text = technique.text[lang]
  const card = el('article', 'technique')
  card.id = technique.id

  const head = el('div', 'technique__head')
  head.append(
    el('h3', undefined, text.name),
    el('span', `technique__driver technique__driver--${technique.driver}`, t[technique.driver]),
  )
  card.append(head, el('p', 'technique__summary', text.summary))

  const facts = el('dl', 'technique__facts')
  facts.append(el('dt', undefined, t.web), el('dd', undefined, text.web))
  facts.append(el('dt', undefined, t.devtools), el('dd', undefined, text.devtools))
  card.append(facts)

  const pre = el('pre', 'technique__code')
  pre.append(el('code', undefined, technique.code))
  card.append(pre)

  if (text.note) card.append(el('p', 'technique__note muted', text.note))
  return card
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  const lang = readLang()
  const t = STRINGS[lang]
  document.title = t.title
  const page = document.createDocumentFragment()

  const header = el('header', 'masthead')
  const row = el('div', 'masthead__row')
  const title = el('h1')
  const home = el('a', 'crumb', 'animbench-lab')
  home.href = carry(import.meta.env.BASE_URL)
  title.append(home, document.createTextNode(` / ${t.crumb}`))
  const toggles = el('div', 'masthead__toggles')
  toggles.append(langToggle(rerender), themeToggle(rerender, t.theme, readTheme()))
  row.append(title, toggles)
  header.append(row, el('p', 'lead', t.lead))
  page.append(header)

  const frame = el('section', 'block')
  frame.append(el('h2', undefined, t.frameTitle), el('p', 'muted block__lead', t.frameLead))
  const steps = el('ol', 'pipeline')
  t.steps.forEach(([name, what], i) => {
    // Layout and paint are the steps transform and opacity avoid.
    const step = el('li', i === 1 || i === 2 ? 'pipeline__step is-skipped' : 'pipeline__step')
    step.append(el('span', 'pipeline__name', name), el('span', 'pipeline__what', what))
    steps.append(step)
  })
  frame.append(steps, el('p', 'muted block__lead', t.skipped))
  page.append(frame)

  const main = el('section', 'block')
  main.append(el('h2', undefined, t.mainTitle), el('p', 'muted block__lead', t.mainLead))
  for (const technique of MAIN) main.append(techniqueCard(technique, lang))
  page.append(main)

  const separate = el('section', 'block')
  separate.append(el('h2', undefined, t.separateTitle), el('p', 'muted block__lead', t.separateLead))
  for (const technique of SEPARATE) separate.append(techniqueCard(technique, lang))
  page.append(separate)

  const layout = el('section', 'block')
  layout.append(el('h2', undefined, t.layoutTitle), el('p', 'muted block__lead', t.layoutText))
  page.append(layout)

  const footer = el('footer', 'footnote')
  footer.append(el('p', undefined, t.footer))
  page.append(footer)
  app.replaceChildren(page)
}

/** Toggles rewrite the URL and call this, so every link is rebuilt from it. */
function rerender(): void {
  const focused = toggleClass(document.activeElement)
  render()
  if (focused) document.querySelector<HTMLElement>(`.${focused}`)?.focus()
}

applyTheme(readTheme())
applyLang(readLang())
render()
