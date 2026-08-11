/** One sampled pose of the reference element at a fixed time. */
export type TrajectorySample = {
  /** ms since start */
  time: number
  translateX: number
  translateY: number
  scale: number
  rotate: number
  opacity: number
}

export type Trajectory = {
  technique: string
  samples: TrajectorySample[]
}

export type ValidationReport = {
  technique: string
  reference: string
  /** Largest positional distance from the reference, px. */
  maxDeltaPx: number
  /** Positional distance once the constant lag is accounted for, px. */
  maxDeltaLagCorrectedPx: number
  /** Constant time offset that best explains the difference, ms. */
  estimatedLagMs: number
  maxOpacityDelta: number
  /** True when the trajectories match within tolerance after lag correction. */
  equivalent: boolean
  samples: {
    time: number
    reference: [number, number]
    candidate: [number, number]
    deltaPx: number
  }[]
}
