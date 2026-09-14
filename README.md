# animbench-lab

Demo app with animation scenes for benchmarking web animation techniques.

Part of a master's thesis at the Czech University of Life Sciences Prague. The
measurement tool lives in a separate repository, [animbench](https://github.com/TomasDevs/animbench).

The same scene is driven by different animation techniques so that frame timing
can be attributed to the technique rather than to the scene. Every technique is
validated against a reference implementation before any measurement is trusted.

## Techniques

Main matrix, compared directly against each other:

- requestAnimationFrame (reference implementation)
- CSS transitions
- CSS keyframes
- Web Animations API
- GSAP
- Motion (vanilla `animate()`)

Measured separately, because their nature differs:

- Scroll-driven animations, driven by scroller position rather than time
- View Transitions API, a one-shot transition of a few hundred milliseconds
- Lottie, which plays a prepared document and renders its own DOM

## Scenes

- `grid` — translate and opacity, staggered by position
- `composite` — translate, scale, rotate and opacity at once
- `parallax` — layers at different speeds during scripted scrolling

Scenes are generated from a seed, so the same seed always produces the same
layout.

## Pages

- `index.html` — landing page with links to demo runs
- `bench.html` — measurement page, driven by URL parameters
- `validate.html` — trajectory equivalence against the reference
- `react.html` — the same scene through `motion/react`, to isolate framework
  overhead

## Development

```sh
pnpm install
pnpm dev        # development server
pnpm build      # type check and production build
pnpm preview    # serve the production build, which is what gets measured
```

Measurement runs are served from `pnpm preview`, not from the dev server: the
development client is another script on the main thread.

## Measurement

`bench.html` takes its configuration from the URL:

```
bench.html?technique=css-keyframes&scene=grid&complexity=500&seed=42&window=20000&mode=bench
```

| Parameter | Meaning |
|---|---|
| `technique` | adapter id |
| `scene` | `grid`, `composite` or `parallax` |
| `complexity` | number of elements |
| `seed` | integer, fixes the layout |
| `window` | steady-state window in ms; duration is derived from it |
| `duration` | animation duration in ms, when `window` is not given |
| `mode` | `bench` or `demo` |
| `repeat` | run index, for logging only |

In `demo` mode a control panel and a live frame rate appear. In `bench` mode
they do not: the panel runs its own frame counter, which would pollute the
result.

The page exposes `window.__benchReady`, `__benchStart`, `__benchResult`,
`__benchDone` and `__benchError`. Only raw frame timestamps are collected;
aggregation happens outside the browser.

## Documentation

- [docs/measurement-protocol.md](docs/measurement-protocol.md) — the conditions
  a measurement run must satisfy
- [docs/thesis-context.md](docs/thesis-context.md) — goals, research questions
  and the reasoning behind the comparability rules
- [docs/theory-digest.md](docs/theory-digest.md) — findings from the literature
  that shape the design
- [docs/vo6-accessibility.md](docs/vo6-accessibility.md) — accessibility
  comparison of the techniques
- [docs/roadmap.md](docs/roadmap.md) — what is done and what is next

## License

MIT
