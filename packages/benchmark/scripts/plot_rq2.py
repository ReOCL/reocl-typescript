"""Process rq2.json and generate summary CSV + latency PDF figures."""

import json
import csv
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

HERE = Path(__file__).resolve().parent
PKG = HERE.parent
RAW = PKG / "results" / "rq2.json"
CSV = PKG / "results" / "rq2.csv"
FIG_DIR = PKG / "figures"
FIG_INIT = FIG_DIR / "rq2-init.pdf"
FIG_TOTAL_EXTRAPOLATED = FIG_DIR / "rq2-total-extrapolated.pdf"
FIG_MUTATE = FIG_DIR / "rq2-mutate.pdf"

SERIES = {
    "ocljs": {"label": "OCL.js", "color": "#FF9800", "marker": "D"},
    "eager": {"label": "JSX", "color": "#4CAF50", "marker": "s"},
    "reocl": {"label": "ReOCL", "color": "#2196F3", "marker": "o"},
}
SERIES_ORDER = ["ocljs", "eager", "reocl"]

CSV_STAT = "avg"
PLOT_STAT = "p50"

EXTRAPOLATED_MUTATIONS = 100_000


def load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def get_value(source: dict, n: int, key: str, field: str = "avg") -> float:
    entry = source[str(n)]
    value = entry[key]
    return value[field] if isinstance(value, dict) else value


def build_summary_rows(data: dict, stat: str = CSV_STAT) -> list[dict]:
    base_mutations = data["config"]["baseMutations"]
    init_data = data["init"]
    mutate_data = data.get("mutate", {})
    total_measured = data.get("totalMeasured", {})
    ns = sorted(int(k) for k in init_data)

    rows = []
    for n in ns:
        init = {key: get_value(init_data, n, key, stat) for key in SERIES_ORDER}
        mutate = {key: get_value(mutate_data, n, key, stat) for key in SERIES_ORDER}

        if total_measured:
            total = {key: get_value(total_measured, n, key, stat) for key in SERIES_ORDER}
        else:
            total = {key: init[key] + mutate[key] * base_mutations for key in SERIES_ORDER}

        rows.append({"N": n, "init": init, "mutate": mutate, "total": total})

    return rows


def write_summary_csv(path: Path, rows: list[dict]) -> None:
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "N",
                "ReOCL init (ms)",
                "Eager init (ms)",
                "OCL.js init (ms)",
                "ReOCL total (ms)",
                "Eager total (ms)",
                "OCL.js total (ms)",
                "ReOCL per-op (ms)",
                "Eager per-op (ms)",
                "OCL.js per-op (ms)",
            ]
        )
        for row in rows:
            r, e, o = "reocl", "eager", "ocljs"
            w.writerow(
                [
                    str(row["N"]),
                    f"{row['init'][r]:.6f}",
                    f"{row['init'][e]:.6f}",
                    f"{row['init'][o]:.6f}",
                    f"{row['total'][r]:.6f}",
                    f"{row['total'][e]:.6f}",
                    f"{row['total'][o]:.6f}",
                    f"{row['mutate'][r]:.6f}",
                    f"{row['mutate'][e]:.6f}",
                    f"{row['mutate'][o]:.6f}",
                ]
            )


def print_summary(rows: list[dict]) -> None:
    print(f"Summary CSV written to {CSV}")
    print(f"\n{'N':>6} {'ReOCL/op':>10} {'Eager/op':>10} {'OCL.js/op':>10}  ReOCL vs Eager")
    for row in rows:
        rm = row["mutate"]["reocl"]
        em = row["mutate"]["eager"]
        om = row["mutate"]["ocljs"]
        ratio = em / rm if rm > 0 else 0
        print(f"{row['N']:>6} {rm*1000:>8.3f}µs {em*1000:>8.3f}µs {om*1000:>8.2f}µs  {ratio:.1f}x")


def draw(ylabel: str, outpath: Path, ns: list[int], get_y_ms, yscale="log", unit="µs"):
    fig, ax = plt.subplots(figsize=(2.8, 1.5))
    x = np.log10(ns)
    scale = 1000 if unit == "µs" else 0.001

    for key in SERIES_ORDER:
        y = np.array([get_y_ms(key, n) for n in ns]) * scale
        style = SERIES[key]
        ax.plot(
            x,
            y,
            color=style["color"],
            label=style["label"],
            marker=style["marker"],
            markersize=5,
            linewidth=1.5,
            zorder=5,
        )

    ax.set_xticks(x)
    ax.set_xticklabels([f"{n:,}" for n in ns])
    ax.set_xlabel("Collection size")
    ax.set_yscale(yscale)
    ax.set_ylabel(ylabel)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, 1.35), ncol=3)
    if yscale == "linear":
        ax.set_ylim(bottom=0)
    ax.yaxis.set_major_formatter(
        ticker.FuncFormatter(
            lambda v, _: (
                f"{v:,.0f}" if v >= 100 else f"{v:,.1f}" if v >= 1 else f"{v:.4f}"
            )
        )
    )
    fig.subplots_adjust(left=0.13, right=0.96, top=0.93, bottom=0.16)
    fig.savefig(outpath, bbox_inches="tight", pad_inches=0.02)
    print(f"Figure saved to {outpath}")


def main():
    plt.rcParams["font.family"] = "Calibri"
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    data = load_json(RAW)
    ns = sorted(int(k) for k in data["init"])
    init_data = data["init"]
    mutate_data = data.get("mutate", {})

    # CSV + console summary
    rows = build_summary_rows(data, CSV_STAT)
    write_summary_csv(CSV, rows)
    print_summary(rows)

    # Figures
    draw(
        "Init time (µs)",
        FIG_INIT,
        ns,
        get_y_ms=lambda key, n: get_value(init_data, n, key, PLOT_STAT),
    )

    draw(
        "Delta processing time (µs)",
        FIG_MUTATE,
        ns,
        get_y_ms=lambda key, n: get_value(mutate_data, n, key, PLOT_STAT),
    )

    draw(
        "Total time (s) w/ 10" + "$^5$" + " mutations",
        FIG_TOTAL_EXTRAPOLATED,
        ns,
        get_y_ms=lambda key, n: (
            get_value(init_data, n, key, PLOT_STAT)
            + get_value(mutate_data, n, key, PLOT_STAT) * EXTRAPOLATED_MUTATIONS
        ),
        unit="s",
    )


if __name__ == "__main__":
    main()
