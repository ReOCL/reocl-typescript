// Operates over configurations ⟨ρ, H, I⟩:
//   ρ = Store (reactive store)
//   H = Heap (pre-state snapshot)
//   I = watched invariant signals (Computed<boolean>)
//
// Rules: Begin → Mutate* → Commit (Ok or Rollback)

import { batch, untracked, type ReadonlySignal } from "./signal";
import { Store, type Heap } from "./store";

/** Global pre-state heap - set by Transaction.begin(), cleared by commit/rollback.
 *  Invariant signals read @pre values via this heap during commit evaluation. */
let currentHeap: Heap | null = null;

/** Read a pre-state value from the active transaction heap - the paper's $pre(sid). */
export function $pre(sid: string): ReturnType<Store["read"]> {
  if (!currentHeap) return undefined;
  return currentHeap.get(sid);
}

export class Transaction {
  private store: Store;
  private heap: Heap | null = null;
  private watched = new Set<ReadonlySignal<boolean>>();

  constructor(store: Store) {
    this.store = store;
  }

  /** Register a watched invariant signal. */
  watch(inv: ReadonlySignal<boolean>): void {
    this.watched.add(inv);
  }

  /** Begin a transaction: snapshot the store, set global heap for @pre reads. */
  begin(): void {
    this.heap = this.store.snapshot();
    currentHeap = this.heap;
  }

  /** Apply mutations inside a batch. */
  mutate(fn: () => void): void {
    if (!this.heap) throw new Error("Transaction not begun - call begin() first");
    batch(() => fn());
  }

  /**
   * Commit the transaction.
   * Returns true if all invariants are valid, false if rolled back.
   */
  commit(): boolean {
    if (!this.heap) throw new Error("Transaction not begun - call begin() first");
    const allValid = untracked(() => {
      for (const inv of this.watched) {
        if (!inv.value) return false;
      }
      return true;
    });

    if (allValid) {
      currentHeap = null;
      this.heap = null;
      return true;
    } else {
      this.store.restore(this.heap);
      currentHeap = null;
      this.heap = null;
      return false;
    }
  }

  /** Read pre-state value for a store cell during this transaction. */
  $pre(sid: string): ReturnType<Store["read"]> {
    return this.heap?.get(sid);
  }
}
