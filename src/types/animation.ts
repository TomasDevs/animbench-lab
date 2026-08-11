/**
 * A single point in the animation timeline.
 *
 * Every keyframe carries every transform channel. A missing function in one
 * keyframe forces the browser into matrix decomposition and the result
 * diverges between techniques.
 */
export type Keyframe = {
  /** Position in the timeline, 0 to 1. */
  offset: number
  /** Horizontal translation in px. */
  translateX: number
  /** Vertical translation in px. */
  translateY: number
  scale: number
  /** Rotation in deg. */
  rotate: number
  opacity: number
}

/**
 * The animation described as data, not as code inside an adapter.
 *
 * Every adapter receives the same spec instance for a given run and only
 * translates it into its own API.
 */
export type AnimationSpec = {
  /** Total duration in ms. */
  duration: number
  iterations: number
  /** Always linear in the main matrix. Non-linear curves differ per engine. */
  easing: 'linear'
  /** Delay between consecutive elements in ms. */
  stagger: number
  keyframes: Keyframe[]
}
