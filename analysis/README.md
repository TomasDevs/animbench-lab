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
Kruskal-Wallis test per scene and complexity, followed by Dunn's test with Holm
correction. Effect sizes are epsilon squared for the omnibus test and Cliff's
delta for pairs. Friedman's test is not used: it assumes matched blocks, and
nothing pairs repetition 3 of one technique with repetition 3 of another.

Shapiro-Wilk is reported in `shapiro.csv` but nothing depends on it. With ten
runs per group it has little power, and the non-parametric tests were chosen in
advance.

The tests run on refresh ratio, share of frames over budget and the 1st
percentile frame rate. The median is left out: for a technique that drops every
other frame it jumps between 16.7 and 33.3 ms from run to run.

The Dunn implementation was checked against `scikit-posthocs`; Holm-adjusted p
values agree exactly across 135 pairs.

## Output

| File | Contents |
|---|---|
| `runs.csv` | per-run metrics |
| `descriptive.csv` | median, minimum and maximum per combination |
| `kruskal_wallis.csv` | omnibus test per scene, complexity and metric |
| `dunn_holm.csv` | pairwise comparisons where the omnibus test was significant |
| `shapiro.csv` | normality per group, for reference only |

## Pilot findings worth knowing before the final measurement

At 100 and 500 elements no metric differs between techniques; most values sit
on the display ceiling. At 2000 elements every metric differs on both scenes,
and every significant pair involves CSS transitions.

Dunn's test ranks all six groups together, which costs power when five of them
are tied near the ceiling. On composite at 2000 elements, CSS keyframes against
CSS transitions separate completely (Cliff's delta = 1, every run of one beats
every run of the other), yet the Holm-adjusted p is 0.052. Results should
therefore be reported with effect sizes, not by significance alone. Whether to
keep Dunn or use pairwise Mann-Whitney tests with Holm correction is a decision
to make before the final analysis, not after seeing it.
