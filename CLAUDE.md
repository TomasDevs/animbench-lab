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
rules are described in docs/thesis-context.md.

## Stack

Vite, TypeScript, no UI framework. React is used only for one isolated entry
point that compares vanilla Motion against React Motion.

Do not add Alpine.js, Swiper, jQuery or any other runtime library. Every script
running on the main thread pollutes the measurement.

## Structure

index.html      landing page for humans, never measured
bench.html      measurement page, driven by URL parameters
react.html      separate entry point for the React Motion variant (added later)

src/adapters/   one file per animation technique
src/scenes/     deterministic scene generators
src/probe/      frame timestamp collector
src/types/      shared type definitions

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
parallax   several layers moving at different speeds during scripted scrolling
composite  translate, scale, rotate and opacity applied together

Scenes are generated deterministically from a seed so that the same seed always
produces the same layout. Use a seeded PRNG, not Math.random.

## URL parameters for bench.html

technique    adapter id
scene        grid | parallax | composite
complexity   number of elements
seed         integer
duration     ms
mode         bench | demo
repeat       run index, for logging only

## Probe contract

The probe collects raw frame timestamps and nothing else. All aggregation
happens outside the browser. Computing averages inside the page would load the
very thread being measured.

The page exposes:

  window.__benchReady   true once the scene is built and the adapter initialised
  window.__benchResult  raw timestamps and run metadata after the run ends
  window.__benchDone    true once the result is available

In demo mode a control panel with technique, scene and complexity selectors is
rendered along with a live frame rate readout. The panel must not exist in
bench mode.

## Techniques

Main matrix: CSS transitions, CSS keyframes, scroll-driven, requestAnimationFrame,
Web Animations API, GSAP, Motion (vanilla API).

Separate regime: View Transitions API and Lottie. Both have a different nature
and are measured with a different procedure.

Motion is used through its vanilla animate() API, not through motion/react.

## What not to do

Do not add shadows, filters or blur to scene elements.
Do not load web fonts on bench.html.
Do not add a header, navigation or any content outside the scene on bench.html.
Do not use localStorage or any browser storage.
Do not aggregate measurements inside the page.
