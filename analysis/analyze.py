"""Statistical processing of animbench measurements.

Reads the raw NDJSON written by animbench, recomputes per-run metrics from the
frame timestamps inside the steady-state window, and compares techniques with
non-parametric tests.

Runs are independent observations: each is its own page load in shuffled order,
and nothing pairs repetition 3 of one technique with repetition 3 of another.
Techniques are therefore compared with the Kruskal-Wallis test per scene and
complexity, followed by pairwise Mann-Whitney U tests with Holm correction.
Friedman's test, which assumes matched blocks, does not apply.

Dunn's test was tried on the pilot and rejected: it ranks all groups together,
and with five techniques tied near the display ceiling it missed a pair whose
runs separated completely (Cliff's delta = 1, Holm p = 0.052).

Usage:
    .venv/bin/python analyze.py ../data/pilot output/pilot
"""

from __future__ import annotations

import csv
import json
import sys
from dataclasses import dataclass, asdict
from itertools import combinations
from pathlib import Path

import numpy as np
from scipy import stats

ALPHA = 0.05

# A frame counts as over budget once it takes longer than one and a half frame
# intervals, the same tolerance animbench uses.
OVER_BUDGET_FACTOR = 1.5

# Metrics the tests are run on. Median is deliberately absent: for a technique
# that drops every other frame the intervals are either 16.7 or 33.3 ms and the
# median jumps between them from run to run.
TESTED_METRICS = ("refresh_ratio", "over_budget_ratio", "p1_fps")

# Equivalence margins for the two one-sided tests. A difference smaller than the
# margin is treated as practically irrelevant. PROVISIONAL: the margin is a
# methodological decision and has to be fixed before the final measurement, not
# fitted to its results. 0.02 of refresh ratio is about 1.2 fps at 60 Hz.
EQUIVALENCE_MARGIN: dict[str, float] = {
    "refresh_ratio": 0.02,
    "over_budget_ratio": 0.02,
}


@dataclass
class Run:
    scene: str
    technique: str
    complexity: int
    repetition: int
    refresh_rate_hz: float
    frames_in_window: int
    mean_fps: float
    refresh_ratio: float
    over_budget_ratio: float
    p5_fps: float
    p1_fps: float
    max_interval_ms: float
    sd_interval_ms: float


def window_intervals(record: dict) -> np.ndarray:
    """Frame intervals whose both timestamps fall inside the steady state."""
    timestamps = np.asarray(record["timestamps"], dtype=float)
    meta = record["meta"]
    start = meta.get("steadyStateFromMs", record["startTime"])
    end = meta.get("steadyStateToMs", record["endTime"])
    inside = timestamps[(timestamps >= start) & (timestamps <= end)]
    return np.diff(inside)


def run_metrics(record: dict) -> Run | None:
    intervals = window_intervals(record)
    if intervals.size < 2:
        return None

    budget = record["baseline"]["frameIntervalMs"]
    rate = record["baseline"]["refreshRateHz"]
    mean_fps = 1000.0 / intervals.mean()
    combo = record["combination"]

    return Run(
        scene=combo["scene"],
        technique=combo["technique"],
        complexity=int(combo["complexity"]),
        repetition=record["repetition"],
        refresh_rate_hz=rate,
        frames_in_window=int(intervals.size),
        mean_fps=mean_fps,
        refresh_ratio=mean_fps / rate,
        over_budget_ratio=float(np.mean(intervals > budget * OVER_BUDGET_FACTOR)),
        # The 1st percentile of frame rate is the 99th percentile of intervals.
        p5_fps=1000.0 / np.percentile(intervals, 95),
        p1_fps=1000.0 / np.percentile(intervals, 99),
        max_interval_ms=float(intervals.max()),
        sd_interval_ms=float(intervals.std(ddof=1)),
    )


def load_runs(data_dir: Path) -> list[Run]:
    runs: list[Run] = []
    for path in sorted(data_dir.glob("*.ndjson")):
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                record = json.loads(line)
                # Warm-up and discarded runs are kept in the file for the record
                # but never enter the analysis.
                if not record.get("valid"):
                    continue
                run = run_metrics(record)
                if run is not None:
                    runs.append(run)
    return runs


def holm(p_values: list[float]) -> list[float]:
    """Holm step-down adjustment, returned in the input order."""
    order = np.argsort(p_values)
    m = len(p_values)
    adjusted = np.empty(m)
    running = 0.0
    for rank, index in enumerate(order):
        running = max(running, (m - rank) * p_values[index])
        adjusted[index] = min(running, 1.0)
    return adjusted.tolist()


def mann_whitney(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Two-sided Mann-Whitney U test, (U, p).

    Techniques on the display ceiling produce many tied values, and the exact
    distribution assumes none. The asymptotic method with tie correction and
    continuity correction is therefore used throughout, stated explicitly so it
    does not switch silently between exact and asymptotic per pair.
    """
    if np.ptp(np.concatenate([x, y])) == 0:
        return float(x.size * y.size / 2), 1.0
    u, p = stats.mannwhitneyu(x, y, alternative="two-sided",
                              method="asymptotic", use_continuity=True)
    return float(u), float(p)


def hodges_lehmann(x: np.ndarray, y: np.ndarray, confidence: float) -> tuple[float, float, float]:
    """Shift estimate of x minus y with its distribution-free confidence interval.

    The estimate is the median of all pairwise differences; the interval takes
    the order statistics of those differences that correspond to the Mann-Whitney
    critical value.
    """
    differences = np.sort((x[:, None] - y[None, :]).ravel())
    m, n = x.size, y.size
    z = stats.norm.ppf(1 - (1 - confidence) / 2)
    k = int(np.floor(m * n / 2 - z * np.sqrt(m * n * (m + n + 1) / 12)))
    k = max(k, 0)
    return float(np.median(differences)), float(differences[k]), float(differences[-k - 1])


def cliffs_delta(a: np.ndarray, b: np.ndarray) -> float:
    """Share of pairs where a beats b minus share where b beats a."""
    greater = np.sum(a[:, None] > b[None, :])
    less = np.sum(a[:, None] < b[None, :])
    return float((greater - less) / (a.size * b.size))


def epsilon_squared(h: float, n: int) -> float:
    """Effect size for Kruskal-Wallis."""
    return h / (n - 1) if n > 1 else float("nan")


def describe(runs: list[Run]) -> list[dict]:
    rows = []
    keys = sorted({(r.scene, r.complexity, r.technique) for r in runs})
    for scene, complexity, technique in keys:
        group = [r for r in runs if (r.scene, r.complexity, r.technique) == (scene, complexity, technique)]
        row = {"scene": scene, "complexity": complexity, "technique": technique, "runs": len(group)}
        for metric in ("refresh_ratio", "over_budget_ratio", "p1_fps", "p5_fps", "mean_fps",
                       "max_interval_ms", "sd_interval_ms", "frames_in_window"):
            values = np.array([getattr(r, metric) for r in group], dtype=float)
            row[f"{metric}_median"] = float(np.median(values))
            row[f"{metric}_min"] = float(values.min())
            row[f"{metric}_max"] = float(values.max())
        rows.append(row)
    return rows


def compare(runs: list[Run]) -> tuple[list[dict], list[dict]]:
    """Omnibus test per cell, then every pair in every cell.

    Pairs are computed for all cells, not only where the omnibus test was
    significant, because the equivalence assessment needs them everywhere. A
    pair counts as different only when both the omnibus test and its own
    Holm-adjusted test are significant.
    """
    omnibus, pairwise = [], []
    cells = sorted({(r.scene, r.complexity) for r in runs})

    for scene, complexity in cells:
        cell = [r for r in runs if (r.scene, r.complexity) == (scene, complexity)]
        techniques = sorted({r.technique for r in cell})
        if len(techniques) < 2:
            continue  # a single technique, as on parallax, has nothing to compare

        for metric in TESTED_METRICS:
            groups = {
                t: np.array([getattr(r, metric) for r in cell if r.technique == t], dtype=float)
                for t in techniques
            }
            pooled = np.concatenate(list(groups.values()))
            # Kruskal-Wallis is undefined when every value is identical, which
            # happens when all techniques sit on the display ceiling.
            if np.ptp(pooled) == 0:
                h, p, note = 0.0, 1.0, "all values identical"
            else:
                h, p = (float(v) for v in stats.kruskal(*groups.values()))
                note = ""
            omnibus.append({"scene": scene, "complexity": complexity, "metric": metric,
                            "H": h, "p": p,
                            "epsilon_squared": epsilon_squared(h, pooled.size),
                            "n": pooled.size, "note": note})

            # The Holm family is the pairs of one scene, complexity and metric.
            rows = []
            for a, b in combinations(groups, 2):
                x, y = groups[a], groups[b]
                u, raw = mann_whitney(x, y)
                shift, lo95, hi95 = hodges_lehmann(x, y, 0.95)
                _, lo90, hi90 = hodges_lehmann(x, y, 0.90)
                margin = EQUIVALENCE_MARGIN.get(metric)
                rows.append({"scene": scene, "complexity": complexity, "metric": metric,
                             "a": a, "b": b, "U": u, "p_raw": raw,
                             "cliffs_delta": cliffs_delta(x, y),
                             "shift": shift, "ci95_low": lo95, "ci95_high": hi95,
                             "margin": margin if margin is not None else float("nan"),
                             # TOST at alpha 0.05 is equivalent to the 90 %
                             # interval lying inside the margin.
                             "equivalent": (margin is not None and -margin < lo90 and hi90 < margin)})
            adjusted = holm([row["p_raw"] for row in rows])
            for row, p_adj in zip(rows, adjusted):
                row["p_holm"] = p_adj
                row["significant"] = p < ALPHA and p_adj < ALPHA
            pairwise.extend(rows)

    # Sensitivity check: Holm over every pair of the whole analysis at once, the
    # strictest family. The per-cell family is the primary one.
    adjusted_all = holm([row["p_raw"] for row in pairwise])
    for row, p_adj in zip(pairwise, adjusted_all):
        row["p_holm_all"] = p_adj
        row["significant_all"] = row["significant"] and p_adj < ALPHA

    return omnibus, pairwise


def normality(runs: list[Run]) -> list[dict]:
    """Shapiro-Wilk per group, reported for completeness only.

    With ten runs per group the test has little power, so no decision rests on
    it; the non-parametric tests are chosen in advance.
    """
    rows = []
    for scene, complexity, technique in sorted({(r.scene, r.complexity, r.technique) for r in runs}):
        values = np.array([r.refresh_ratio for r in runs
                           if (r.scene, r.complexity, r.technique) == (scene, complexity, technique)])
        if values.size < 3 or np.ptp(values) == 0:
            rows.append({"scene": scene, "complexity": complexity, "technique": technique,
                         "W": float("nan"), "p": float("nan"), "note": "constant or too few values"})
            continue
        w, p = stats.shapiro(values)
        rows.append({"scene": scene, "complexity": complexity, "technique": technique,
                     "W": float(w), "p": float(p), "note": ""})
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        for row in rows:
            writer.writerow({k: (f"{v:.6g}" if isinstance(v, float) else v) for k, v in row.items()})


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    runs = load_runs(data_dir)
    if not runs:
        sys.exit(f"No valid runs in {data_dir}")

    omnibus, pairwise = compare(runs)
    write_csv(out_dir / "runs.csv", [asdict(r) for r in runs])
    write_csv(out_dir / "descriptive.csv", describe(runs))
    write_csv(out_dir / "kruskal_wallis.csv", omnibus)
    write_csv(out_dir / "mann_whitney_holm.csv", pairwise)
    write_csv(out_dir / "shapiro.csv", normality(runs))

    print(f"{len(runs)} valid runs from {data_dir}")
    print(f"{len(omnibus)} omnibus tests, {sum(r['p'] < ALPHA for r in omnibus)} significant")
    print(f"{len(pairwise)} pairwise comparisons, {sum(r['significant'] for r in pairwise)} significant"
          f" ({sum(r['significant_all'] for r in pairwise)} with Holm over all pairs)")
    print(f"{sum(r['equivalent'] for r in pairwise)} pairs equivalent within the margin")
    print(f"written to {out_dir}")


if __name__ == "__main__":
    main()
