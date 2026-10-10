"""Static figures for the thesis, drawn from the output of analyze.py.

Usage:
    .venv/bin/python figures.py output/pilot

Writes PNG at 300 dpi and SVG into <output>/figures/, plus popisky.md with the
Czech captions in the thesis format. Labels are in Czech with a decimal comma,
because the figures go straight into the thesis text.

Same encoding as the results page: the story is one technique falling away
while the rest stay on the display ceiling, so CSS transitions are drawn in the
accent and every other technique in a recessive gray.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402

FOCUS = "css-transition"
REFERENCE = "raf"
SCENES = ("grid", "composite")

# Validated against a white surface with the dataviz palette checks.
ACCENT = "#2a78d6"
MUTED = "#a8a7a1"
INK = "#16161a"
INK_MUTED = "#6b6b73"
GRID = "#e6e6e9"

LABELS = {
    "raf": "requestAnimationFrame",
    "css-transition": "CSS přechody",
    "css-keyframes": "CSS klíčové snímky",
    "waapi": "Web Animations API",
    "gsap": "GSAP",
    "motion": "Motion",
    "scroll-driven": "Scroll-driven",
}
SCENE_NAMES = {"grid": "Scéna grid", "composite": "Scéna composite", "parallax": "Scéna parallax"}
BUCKET_LABELS = ["1", "2", "3", "4", "5+"]

plt.rcParams.update({
    "font.family": "Arial",
    "font.size": 9,
    "axes.edgecolor": GRID,
    "axes.labelcolor": INK_MUTED,
    "axes.titlesize": 9,
    "axes.titleweight": "bold",
    "axes.titlecolor": INK,
    "axes.titlelocation": "left",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "axes.grid.axis": "y",
    "grid.color": GRID,
    "grid.linewidth": 0.6,
    "xtick.color": INK_MUTED,
    "ytick.color": INK_MUTED,
    "xtick.major.size": 0,
    "ytick.major.size": 0,
    "legend.frameon": False,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    # Gridlines stay behind the marks, never across them.
    "axes.axisbelow": True,
})


def decimal_comma(digits: int) -> FuncFormatter:
    return FuncFormatter(lambda v, _: f"{v:.{digits}f}".replace(".", ","))


def percent_comma() -> FuncFormatter:
    return FuncFormatter(lambda v, _: f"{v * 100:.0f} %")


def comma(value: float, digits: int = 3) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def load(out_dir: Path) -> tuple[dict, list[dict]]:
    summary = json.loads((out_dir / "summary.json").read_text(encoding="utf-8"))
    with (out_dir / "runs.csv").open(encoding="utf-8") as handle:
        runs = list(csv.DictReader(handle))
    return summary, runs


def save(fig: plt.Figure, folder: Path, name: str) -> None:
    for suffix in ("png", "svg"):
        fig.savefig(folder / f"{name}.{suffix}")
    plt.close(fig)


def ratio_by_complexity(summary: dict, folder: Path) -> None:
    combos = summary["combinations"]
    fig, axes = plt.subplots(1, len(SCENES), figsize=(6.3, 2.6), sharey=True)

    for index, (ax, scene) in enumerate(zip(axes, SCENES)):
        rows = [c for c in combos if c["scene"] == scene]
        levels = sorted({c["complexity"] for c in rows})
        positions = range(len(levels))
        techniques = sorted({c["technique"] for c in rows}, key=lambda t: t == FOCUS)

        for technique in techniques:
            focus = technique == FOCUS
            values = [next(c["refreshRatio"] for c in rows
                           if c["technique"] == technique and c["complexity"] == level)
                      for level in levels]
            ax.plot(list(positions), values, color=ACCENT if focus else MUTED,
                    linewidth=2 if focus else 1.5, marker="o", markersize=4,
                    markeredgecolor="white", markeredgewidth=1, zorder=3 if focus else 2,
                    # One legend entry per series, taken from the first panel.
                    label=(LABELS[FOCUS] if focus else "Ostatní techniky") if index == 0 and (focus or technique == techniques[0]) else None)

        focus_last = next(c["refreshRatio"] for c in rows
                          if c["technique"] == FOCUS and c["complexity"] == levels[-1])
        ax.annotate(comma(focus_last), (len(levels) - 1, focus_last), xytext=(6, 0),
                    textcoords="offset points", va="center", color=INK, fontweight="bold")

        ax.set_title(SCENE_NAMES[scene])
        ax.set_xticks(list(positions), [str(level) for level in levels])
        ax.set_xlabel("Počet prvků")
        ax.set_ylim(0, 1.05)
        ax.set_xlim(-0.2, len(levels) - 0.6 + 0.4)
        ax.yaxis.set_major_formatter(decimal_comma(2))

    axes[0].set_ylabel("Podíl dosažené a dosažitelné frekvence")
    handles, labels = axes[0].get_legend_handles_labels()
    order = sorted(range(len(labels)), key=lambda i: labels[i] != LABELS[FOCUS])
    fig.legend([handles[i] for i in order], [labels[i] for i in order],
               loc="lower left", ncol=2, bbox_to_anchor=(0.06, 0.98))
    fig.tight_layout()
    save(fig, folder, "podil-frekvence-podle-slozitosti")


def run_distribution(runs: list[dict], folder: Path, complexity: int) -> None:
    fig, axes = plt.subplots(1, len(SCENES), figsize=(6.3, 2.8), sharey=True)
    for ax, scene in zip(axes, SCENES):
        rows = [r for r in runs if r["scene"] == scene and int(r["complexity"]) == complexity]
        by_technique: dict[str, list[float]] = {}
        for r in rows:
            by_technique.setdefault(r["technique"], []).append(float(r["refresh_ratio"]))
        # Worst median at the bottom, so the outlier reads first.
        techniques = sorted(by_technique, key=lambda t: float(np.median(by_technique[t])))
        data = [by_technique[t] for t in techniques]
        box = ax.boxplot(data, orientation="horizontal", widths=0.5, patch_artist=True, showfliers=False,
                         medianprops={"color": INK, "linewidth": 1.2},
                         whiskerprops={"color": INK_MUTED, "linewidth": 0.8},
                         capprops={"color": INK_MUTED, "linewidth": 0.8})
        for patch, technique in zip(box["boxes"], techniques):
            patch.set_facecolor(ACCENT if technique == FOCUS else "#ececea")
            patch.set_edgecolor(ACCENT if technique == FOCUS else MUTED)
            patch.set_alpha(0.35 if technique == FOCUS else 1)
        # Every run as a dot, so ten values are not hidden behind a box.
        for i, (values, technique) in enumerate(zip(data, techniques), start=1):
            ax.scatter(values, [i] * len(values), s=10, zorder=3,
                       color=ACCENT if technique == FOCUS else INK_MUTED, linewidths=0)
        ax.set_yticks(range(1, len(techniques) + 1), [LABELS[t] for t in techniques])
        ax.set_title(SCENE_NAMES[scene])
        ax.set_xlim(0, 1.03)
        ax.grid(axis="x")
        ax.grid(axis="y", visible=False)
        ax.xaxis.set_major_formatter(decimal_comma(2))
        ax.set_xlabel("Podíl dosažené a dosažitelné frekvence")
    fig.tight_layout()
    save(fig, folder, f"rozlozeni-behu-{complexity}")


def frame_length(summary: dict, folder: Path, complexity: int) -> None:
    fig, axes = plt.subplots(len(SCENES), 2, figsize=(6.3, 3.8), sharey=True, sharex=True)
    for row, scene in enumerate(SCENES):
        for col, technique in enumerate((FOCUS, REFERENCE)):
            ax = axes[row][col]
            combo = next(c for c in summary["combinations"]
                         if c["scene"] == scene and c["complexity"] == complexity and c["technique"] == technique)
            focus = technique == FOCUS
            bars = ax.bar(BUCKET_LABELS, combo["buckets"], width=0.55,
                          color=ACCENT if focus else MUTED)
            for bar, share in zip(bars, combo["buckets"]):
                if share >= 0.05:
                    ax.annotate(f"{share * 100:.0f} %", (bar.get_x() + bar.get_width() / 2, share),
                                xytext=(0, 2), textcoords="offset points", ha="center",
                                va="bottom", fontsize=8, color=INK)
            ax.set_title(f"{LABELS[technique]}, {SCENE_NAMES[scene].lower()}")
            ax.set_ylim(0, 1.15)
            ax.yaxis.set_major_formatter(percent_comma())
            ax.grid(axis="x", visible=False)
    fig.supxlabel("Délka snímku v násobcích snímkového rozpočtu", color=INK_MUTED, fontsize=9)
    fig.supylabel("Podíl snímků", color=INK_MUTED, fontsize=9)
    fig.tight_layout()
    save(fig, folder, f"delka-snimku-{complexity}")


CAPTIONS = """# Popisky grafů

Číslo grafu doplň podle pořadí v práci. Zdroj u všech: vlastní zpracování.
{pilot}
## podil-frekvence-podle-slozitosti

Graf N: Podíl dosažené a dosažitelné snímkové frekvence podle počtu prvků (medián
deseti běhů). Zdroj: vlastní zpracování

## rozlozeni-behu-{top}

Graf N: Rozložení podílu dosažené a dosažitelné frekvence v jednotlivých bězích
při {top} prvcích. Zdroj: vlastní zpracování

## delka-snimku-{top}

Graf N: Rozložení délky snímků v násobcích snímkového rozpočtu při {top} prvcích.
Zdroj: vlastní zpracování
"""


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out_dir = Path(sys.argv[1])
    folder = out_dir / "figures"
    folder.mkdir(parents=True, exist_ok=True)

    summary, runs = load(out_dir)
    top = max(c["complexity"] for c in summary["combinations"] if c["scene"] in SCENES)

    ratio_by_complexity(summary, folder)
    run_distribution(runs, folder, top)
    frame_length(summary, folder, top)

    pilot = ("\n**Pilotní data. Tyto grafy do práce nepatří, slouží k odladění vzhledu.**\n"
             if summary["dataset"] != "final" else "")
    (folder / "popisky.md").write_text(CAPTIONS.format(top=top, pilot=pilot), encoding="utf-8")
    print(f"written to {folder}")


if __name__ == "__main__":
    main()
