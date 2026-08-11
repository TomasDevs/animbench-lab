import type { AnimationSpec } from '../types/animation.ts'
import type { Trajectory, ValidationReport } from '../types/validation.ts'
import { interpolate } from '../adapters/interpolate.ts'

/**
 * Tolerance in px. A few pixels of difference is sampling jitter; more than
 * that means the techniques are not animating the same thing.
 */
export const TOLERANCE_PX = 2

/** Range of lags searched when explaining a constant offset, ms. */
const MAX_LAG_MS = 50
const LAG_STEP_MS = 0.5

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

/**
 * Estimates the constant time offset that best explains a candidate's
 * trajectory, by comparing it against the spec evaluated at shifted times.
 *
 * A technique driven from a timer commits its styles one frame later than one
 * that writes them during the frame itself. That lag is a real property of the
 * technique, so it is reported rather than hidden: it belongs in the results,
 * not in a correction applied behind the scenes.
 */
export function estimateLag(spec: AnimationSpec, trajectory: Trajectory): number {
  let bestLag = 0
  let bestError = Infinity

  for (let lag = 0; lag <= MAX_LAG_MS; lag += LAG_STEP_MS) {
    let total = 0
    for (const sample of trajectory.samples) {
      const shifted = Math.max(0, sample.time - lag)
      const expected = interpolate(spec, Math.min(shifted / spec.duration, 1))
      total += distance(expected.translateX, expected.translateY, sample.translateX, sample.translateY)
    }
    if (total < bestError) {
      bestError = total
      bestLag = lag
    }
  }

  return bestLag
}

/**
 * Compares a candidate technique against the reference implementation.
 *
 * Samples are matched by index, so both trajectories must be collected at the
 * same nominal times.
 */
export function compareTrajectories(
  spec: AnimationSpec,
  reference: Trajectory,
  candidate: Trajectory,
): ValidationReport {
  const count = Math.min(reference.samples.length, candidate.samples.length)

  let maxDelta = 0
  let maxOpacity = 0
  // Kept alongside the spec comparison below: a reversed path matches the spec
  // at some shifted time in every sample, so only the sampled reference
  // exposes it.
  let maxDeltaVsSampledReference = 0
  const samples: ValidationReport['samples'] = []

  for (let i = 0; i < count; i++) {
    const ref = reference.samples[i]
    const cand = candidate.samples[i]
    if (!ref || !cand) continue

    maxDeltaVsSampledReference = Math.max(
      maxDeltaVsSampledReference,
      distance(ref.translateX, ref.translateY, cand.translateX, cand.translateY),
    )

    // Both runs sample on their own clock and setTimeout overshoot drifts them
    // apart, so the reference is re-evaluated at the candidate's own instant
    // rather than compared pose to pose.
    const refAtCandidateTime = interpolate(spec, Math.min(cand.time / spec.duration, 1))

    const delta = distance(
      refAtCandidateTime.translateX,
      refAtCandidateTime.translateY,
      cand.translateX,
      cand.translateY,
    )
    maxDelta = Math.max(maxDelta, delta)
    maxOpacity = Math.max(maxOpacity, Math.abs(refAtCandidateTime.opacity - cand.opacity))

    samples.push({
      time: cand.time,
      reference: [refAtCandidateTime.translateX, refAtCandidateTime.translateY],
      candidate: [cand.translateX, cand.translateY],
      deltaPx: delta,
    })
  }

  const lag = estimateLag(spec, candidate)

  // Re-measure against the spec at lag-shifted times: this separates "took a
  // different path" from "took the same path, slightly later".
  let maxCorrected = 0
  for (const sample of candidate.samples) {
    const shifted = Math.max(0, sample.time - lag)
    const expected = interpolate(spec, Math.min(shifted / spec.duration, 1))
    maxCorrected = Math.max(
      maxCorrected,
      distance(expected.translateX, expected.translateY, sample.translateX, sample.translateY),
    )
  }

  // A lag can only excuse as much difference as the motion covers within it.
  const maxSpeed = estimateMaxSpeed(spec)
  const explainableByLag = maxSpeed * lag + TOLERANCE_PX

  return {
    technique: candidate.technique,
    reference: reference.technique,
    maxDeltaPx: maxDelta,
    maxDeltaLagCorrectedPx: maxCorrected,
    estimatedLagMs: lag,
    maxOpacityDelta: maxOpacity,
    equivalent:
      maxCorrected <= TOLERANCE_PX &&
      maxDelta <= explainableByLag &&
      maxDeltaVsSampledReference <= explainableByLag,
    samples,
  }
}

/**
 * Fastest movement the spec ever calls for, px per ms. Used to decide how much
 * positional difference a given lag can legitimately account for.
 */
function estimateMaxSpeed(spec: AnimationSpec): number {
  let fastest = 0
  const frames = spec.keyframes
  for (let i = 0; i < frames.length - 1; i++) {
    const from = frames[i]
    const to = frames[i + 1]
    if (!from || !to) continue
    const segmentMs = (to.offset - from.offset) * spec.duration
    if (segmentMs <= 0) continue
    const travelled = distance(from.translateX, from.translateY, to.translateX, to.translateY)
    fastest = Math.max(fastest, travelled / segmentMs)
  }
  return fastest
}
