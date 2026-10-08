# animbench-lab

Demonstration application for a master's thesis benchmarking web animation
techniques. Companion CLI tool lives in a separate repository (animbench).

Code, comments and identifiers are in English. Thesis text is in Czech.

## Purpose

The application renders identical animated scenes driven by different animation
techniques. A measurement tool then compares frame timing and hardware load
across techniques. Comparability between techniques is the single most important
constraint in this project.

Thesis goals, research questions and the reasoning behind the comparability
rules are described in docs/thesis-context.md. The conditions a measurement run
must satisfy are in docs/measurement-protocol.md.

## Stack

Vite, TypeScript, no UI framework. React is used only for one isolated entry
point that compares vanilla Motion against React Motion.

Do not add Alpine.js, Swiper, jQuery or any other runtime library. Every script
running on the main thread pollutes the measurement.

## Structure

index.html      landing page for humans, never measured
bench.html      measurement page, driven by URL parameters
react.html      React Motion variant, same contract as bench.html
validate.html   trajectory equivalence check against the reference

src/adapters/   one file per animation technique
src/scenes/     deterministic scene generators and animation specs
src/probe/      frame timestamp collector, idle baseline, steady-state window
src/bench/      bench.html entry, URL parameters, demo panel
src/validate/   trajectory sampling and comparison
src/react/      react.html entry
src/types/      shared type definitions

Measurement runs are served from `pnpm preview`, never from the dev server: the
development client is another script on the main thread.

## AnimationSpec

The animation is described by data, not by code inside an adapter. Every adapter
receives the same spec and only translates it into its own API.

type Keyframe = {
  offset: number      // 0 to 1
  translateX: number  // px
  translateY: number  // px
  scale: number
  rotate: number      // deg
  opacity: number
}

type AnimationSpec = {
  duration: number      // ms
  iterations: number
  easing: 'linear'
  stagger: number       // ms between elements
  keyframes: Keyframe[]
}

Transform functions must appear in every keyframe in identical order:
translate, then scale, then rotate. A missing function in one keyframe forces
the browser into matrix decomposition and the result diverges.

Write transforms as a single `transform` value. Never use individual properties
such as `translate`, `scale` or `rotate`.

## Adapter contract

Every adapter implements:

  init(ctx: AdapterContext): void
  start(): void
  stop(): void
  dispose(): void

  static meta: { id: string, label: string, scenes: SceneId[] }

A technique lists only the scenes it can animate correctly. Separate-regime
techniques are listed in SEPARATE_REGIME_IDS and are excluded from validation;
per-technique complexity caps live in MAX_COMPLEXITY.

AdapterContext provides the already built element list and the AnimationSpec.
Adapters are loaded with dynamic import so that unused libraries are never
downloaded.

The requestAnimationFrame adapter is the reference implementation. It computes
positions directly from the spec without any engine. Every other adapter is
validated against it.

## Comparability rules (hard constraints)

1. Scenes are built by the scene generator, never by an adapter.
2. An adapter must not insert, remove or reorder DOM nodes.
3. Only `transform` and `opacity` may be animated in the main matrix.
4. Easing is always `linear` in the main matrix.
5. All adapters receive the same AnimationSpec instance for a given run.
6. The scene must look pixel identical at time zero regardless of technique.
7. One measurement run equals one page load. Never switch technique at runtime.

Violating any of these invalidates the measurement. If a technique cannot follow
a rule, it does not belong in the main matrix.

## Scenes

grid       elements in a grid, translate and opacity, staggered
composite  translate, scale, rotate and opacity applied together
parallax   layers at different speeds; the scene builds its own scroller and
           exposes it as the named timeline --animbench-scroll

composite is the only scene where scale and rotate are not neutral, so it is
the one that exposes a technique reordering transform functions.

Scenes are generated deterministically from a seed so that the same seed always
produces the same layout. Use a seeded PRNG, not Math.random.

## URL parameters for bench.html

technique    adapter id
scene        grid | parallax | composite
complexity   number of elements
seed         integer
window       steady-state window in ms; duration is derived from it as
             window + stagger * (complexity - 1)
duration     ms, used only when window is absent
mode         bench | demo (anything else falls back to bench)
repeat       run index, for logging only

## Probe contract

The probe collects raw frame timestamps and nothing else. All aggregation
happens outside the browser. Computing averages inside the page would load the
very thread being measured.

The page exposes:

  window.__benchReady   true once the scene is built and the adapter initialised
  window.__benchStart   function the tool calls to start the run; the returned
                        promise is ignored, so __benchDone must not be set before
                        __benchResult is complete
  window.__benchResult  raw timestamps and run metadata after the run ends
  window.__benchDone    true once the result is available or the run failed
  window.__benchError   { message, stack? } instead of a result on failure

The baseline is measured before the run. frameIntervalMs and refreshRateHz are
both derived from the snapped refresh rate so they cannot disagree; the raw rate
is kept as measuredRefreshHz. The tool groups results by URL parameters, not by
meta; meta repeats them as a cross-check.

meta carries steadyStateFromMs and steadyStateToMs, in the same clock as the
timestamps, marking the stretch where every element is animating. Metrics are
computed over that window only. A run with overflowed set is discarded.

In demo mode a control panel with technique, scene and complexity selectors is
rendered along with a live frame rate readout. The panel must not exist in
bench mode.

## Techniques

Main matrix, on grid and composite: requestAnimationFrame (reference), CSS
transitions, CSS keyframes, Web Animations API, GSAP, Motion (vanilla API).

Separate regime, own procedure, not validated against the reference:
- scroll-driven, parallax only: progress comes from the scroller, and the
  time-driven techniques cannot produce parallax, so there is no reference
- View Transitions API: a one-shot transition, capped at 200 elements
- Lottie: plays a document generated from the same spec, renders its own DOM

GSAP and Motion rewrite transform strings on their own. Their adapters tween a
plain value and write the transform themselves to keep the function order.

Motion is used through its vanilla animate() API, not through motion/react.

## What not to do

Do not add shadows, filters or blur to scene elements.
Do not load web fonts, favicons or any other extra resource on bench.html or
react.html; both are measured.
Do not add a header, navigation or any content outside the scene on bench.html.
Do not use localStorage or any browser storage.
Do not aggregate measurements inside the page.
