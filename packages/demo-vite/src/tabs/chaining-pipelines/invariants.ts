import { computed, invariant } from "reactiveocl";
import { products$ } from "./model";
import { TOTAL_INVENTORY_LIMIT } from "./config";

export const inStock$ = products$.select((p) => p.quantity$.value > 0);

export const itemValues$ = inStock$.collect((p) => p.price$.value * p.quantity$.value);

export const totalInventoryValue$ = itemValues$.sum();

export const inventoryOk$ = computed(() => totalInventoryValue$.value < TOTAL_INVENTORY_LIMIT);

export const inventoryOk = invariant(
  "inventoryOk",
  inventoryOk$,
  `select(qty>0) -> collect(price * qty) -> sum < ${TOTAL_INVENTORY_LIMIT.toLocaleString()}`,
);
