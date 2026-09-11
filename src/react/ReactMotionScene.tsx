import { motion } from 'motion/react'
import type { AnimationSpec, Keyframe } from '../types/animation.ts'

/**
 * React Motion variant of the grid scene.
 *
 * Deliberately idiomatic React: elements are motion components driven by props,
 * which is how the library is normally used. That is the point of the
 * comparison, since measuring motion/react written like vanilla animate() would
 * compare nothing.
 *
 * The scene is still generated from the same seed and the same AnimationSpec, so
 * the only difference against the vanilla run is who drives the DOM.
 */

export type SceneItem = {
  fill: string
}

type Props = {
  items: SceneItem[]
  spec: AnimationSpec
  cols: number
  rows: number
  gap: string
  /** Set once the tool may start the run. */
  play: boolean
}

/** Keyframe channel as the array Motion expects, in spec order. */
function channel(spec: AnimationSpec, pick: (frame: Keyframe) => number): number[] {
  return spec.keyframes.map(pick)
}

export function ReactMotionScene({ items, spec, cols, rows, gap, play }: Props) {
  const times = spec.keyframes.map((frame) => frame.offset)

  // Written as a single transform string, matching the vanilla adapters: Motion
  // would otherwise emit individual transform properties and reorder the
  // function list.
  const transform = spec.keyframes.map(
    (frame) =>
      `translate(${frame.translateX}px, ${frame.translateY}px) scale(${frame.scale}) rotate(${frame.rotate}deg)`,
  )

  return (
    <div
      className="scene-grid"
      style={{
        display: 'grid',
        width: '100%',
        height: '100%',
        gap,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        padding: gap,
        boxSizing: 'border-box',
      }}
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          className="scene-grid__item"
          style={{
            background: item.fill,
            borderRadius: 2,
            willChange: 'transform, opacity',
          }}
          initial={{ transform: transform[0], opacity: spec.keyframes[0]?.opacity ?? 1 }}
          animate={
            play
              ? { transform, opacity: channel(spec, (frame) => frame.opacity) }
              : undefined
          }
          transition={{
            duration: spec.duration / 1000,
            delay: (index * spec.stagger) / 1000,
            ease: 'linear',
            times,
            repeat: spec.iterations - 1,
          }}
        />
      ))}
    </div>
  )
}
