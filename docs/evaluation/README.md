# Material for the evaluation of the paper 'ReOCL: An Incremental Core of OCL for Reactive Web-Based Modeling'

Only RQ2 benchmarks the tool. To run it:

1. `cd packages/benchmark`
2. `bun install`
3. `bun run start` (runs benchmark, writes `results/rq2.json`)
4. `bun run plot` (generates figures from `results/rq2.json`)

This directory contains at `results/` and `figures/` the resulting data and figures plotted in the paper.
