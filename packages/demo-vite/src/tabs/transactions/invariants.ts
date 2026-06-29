import { invariant } from "reactiveocl";
import { pa } from "./model";

export const conservation = invariant(
  "conservation",
  pa.conservation$,
  `checking + savings = checking@pre + savings@pre`,
);
export const checkingNonNeg = invariant("checkingNonNeg", pa.checkingNonNeg$, `checking >= 0`);
export const savingsNonNeg = invariant("savingsNonNeg", pa.savingsNonNeg$, `savings >= 0`);
