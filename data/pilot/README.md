# Pilot measurement

Verification run of the full main matrix, made before the final measurement to
check that the contract, the steady-state window and the analysis work. These
data are not the thesis results: the final measurement goes to `data/final/`.

## How it differs from the final measurement

- No CPU sampling (`cpuSampleIntervalMs` was not set), so there is nothing here
  for VO1.
- The steady-state window was 10 s at every complexity. The protocol uses
  10 s for 100 elements and 20 s for 500 and 2000 elements.
- Hardware and power state were not recorded automatically; the device is
  identified only by the labels in the configuration.
- The separate regime contains only scroll-driven animations. View Transitions,
  Lottie and the React variant were not measured.

## Conditions

| | |
|---|---|
| Date | 11 September 2026 |
| Device | MacBook Air M3, 16 GB, passive cooling |
| Display | external, 60 Hz, 2560 × 1440 |
| Browser | Chrome 151.0.7922.34 (Playwright), visible window 1280 × 720 |
| Acceleration | hardware, ANGLE Metal |
| Served by | `pnpm preview` |
| Repetitions | 10 per combination, 1 warm-up run discarded, shuffled order |
| Cool-down | 15 s between runs |

## Files

Per scene (`grid`, `composite`, `parallax`):

- `<scene>.ndjson` — one line per run: raw frame timestamps, baseline,
  page metadata including the steady-state window, environment, validity
- `<scene>.csv` — aggregate per combination as written by animbench
- `<scene>.json` — the animbench configuration the run used

Warm-up runs are kept in the NDJSON with `valid: false` and
`discardReason: "warmup"`. The configuration still names `results/final/` as its
output path; that is where animbench wrote the files before they were moved here.

Statistical processing is in [`analysis/`](../../analysis/).
