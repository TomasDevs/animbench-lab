import type { AnimationSpec } from '../types/animation.ts'

/**
 * Builds a Lottie animation document from the shared AnimationSpec.
 *
 * Lottie normally plays a file exported from a design tool. Generating it from
 * the same spec every other adapter reads is what makes the comparison possible
 * at all: the motion is identical by construction rather than by eye.
 *
 * The document is still a Lottie document, so the renderer does exactly what it
 * would do with an exported file.
 */

/** Lottie works in frames; 60 fps keeps keyframe times exact at 60 Hz. */
const FRAME_RATE = 60

type LottieKeyframe = {
  t: number
  s: number[]
  i?: { x: number[]; y: number[] }
  o?: { x: number[]; y: number[] }
}

/** Linear easing: Lottie interpolates between keyframes without a curve. */
function linearTrack(values: { t: number; s: number[] }[]): LottieKeyframe[] {
  return values.map((frame, index) =>
    index === values.length - 1
      ? { t: frame.t, s: frame.s }
      : { t: frame.t, s: frame.s, i: { x: [1], y: [1] }, o: { x: [0], y: [0] } },
  )
}

export function buildLottieSource(
  spec: AnimationSpec,
  elementCount: number,
  size: number,
  width: number,
  height: number,
): object {
  const totalFrames = Math.max(1, Math.round((spec.duration / 1000) * FRAME_RATE))

  const layers = []
  for (let i = 0; i < elementCount; i++) {
    const startFrame = (i * spec.stagger / 1000) * FRAME_RATE
    const at = (offset: number) => startFrame + offset * totalFrames

    layers.push({
      ddd: 0,
      ind: i + 1,
      ty: 4,
      nm: `item-${i}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: linearTrack(spec.keyframes.map((f) => ({ t: at(f.offset), s: [f.opacity * 100] }))),
        },
        r: {
          a: 1,
          k: linearTrack(spec.keyframes.map((f) => ({ t: at(f.offset), s: [f.rotate] }))),
        },
        p: {
          a: 1,
          k: linearTrack(
            spec.keyframes.map((f) => ({ t: at(f.offset), s: [f.translateX, f.translateY, 0] })),
          ),
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: linearTrack(
            spec.keyframes.map((f) => ({ t: at(f.offset), s: [f.scale * 100, f.scale * 100, 100] })),
          ),
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [size, size] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 2 } },
            { ty: 'fl', c: { a: 0, k: [0.35, 0.33, 0.78, 1] }, o: { a: 0, k: 100 }, r: 1 },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'group',
        },
      ],
      ip: 0,
      op: totalFrames + startFrame,
      st: 0,
    })
  }

  return {
    v: '5.13.0',
    fr: FRAME_RATE,
    ip: 0,
    op: totalFrames + (elementCount * spec.stagger / 1000) * FRAME_RATE,
    w: width,
    h: height,
    nm: 'animbench',
    ddd: 0,
    assets: [],
    layers,
  }
}
