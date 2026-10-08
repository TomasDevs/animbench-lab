# Analysis

Statistical processing of the measurements in [`data/`](../data/).

## Running

```sh
cd analysis
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python analyze.py ../data/pilot output/pilot
```

The final measurement is processed the same way, with `../data/final` and
`output/final`.

## What it does

Metrics are recomputed from the raw frame timestamps inside the steady-state
window, not taken from the animbench CSV. On the pilot data the recomputed
refresh ratio agrees with the animbench aggregate to within 0.00005, which
cross-checks both implementations.

Per run: mean frame rate, refresh ratio (achieved over achievable frame rate),
share of frames over budget (longer than 1.5 frame intervals), 1st and 5th
percentile frame rate, longest frame and standard deviation of frame intervals.

Runs are independent observations, so techniques are compared with the
Kruskal-Wallis test per scene and complexity, followed by pairwise Mann-Whitney U
tests with Holm correction over the pairs of each scene, complexity and metric.
Effect sizes are epsilon squared for the omnibus test and Cliff's delta for
pairs. Friedman's test is not used: it assumes matched blocks, and
nothing pairs repetition 3 of one technique with repetition 3 of another.

Shapiro-Wilk is reported in `shapiro.csv` but nothing depends on it. With ten
runs per group it has little power, and the non-parametric tests were chosen in
advance.

The tests run on refresh ratio, share of frames over budget and the 1st
percentile frame rate. The median is left out: for a technique that drops every
other frame it jumps between 16.7 and 33.3 ms from run to run.

## Output

| File | Contents |
|---|---|
| `runs.csv` | per-run metrics |
| `descriptive.csv` | median, minimum and maximum per combination |
| `kruskal_wallis.csv` | omnibus test per scene, complexity and metric |
| `mann_whitney_holm.csv` | pairwise comparisons where the omnibus test was significant |
| `shapiro.csv` | normality per group, for reference only |

## Pilot findings

At 100 and 500 elements no metric differs between techniques; most values sit
on the display ceiling. At 2000 elements every metric differs on both scenes.
All 30 pairs involving CSS transitions are significant, and no pair among the
other five techniques is.

## Why Mann-Whitney and not Dunn

The post-hoc test was settled on the pilot data, before the final measurement.
Dunn's test ranks all six groups together, which costs power when five of them
are tied near the display ceiling. On composite at 2000 elements it missed CSS
keyframes against CSS transitions (Holm p = 0.052) although the runs separated
completely: every run of one beat every run of the other, Cliff's delta = 1.
Pairwise Mann-Whitney ranks each pair on its own and gives p = 0.0026 for the
same pair. Results are still reported with Cliff's delta alongside p.
