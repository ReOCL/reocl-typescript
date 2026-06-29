import { batch, signal, untracked, type Signal } from "./signal";
import { fieldStateId, type ClassId, type FieldId, type StateId } from "./types";
import type { OCLVal } from "./values";

/** A reactive store: maps state identifiers to mutable signals. */
export class Store {
  private cells = new Map<StateId, Signal<OCLVal>>();

  register(C: ClassId, oid: number, f: FieldId, initial: OCLVal): Signal<OCLVal> {
    const sid = fieldStateId(C, oid, f);
    const s = signal(initial);
    this.cells.set(sid, s);
    return s;
  }

  read(sid: StateId): OCLVal | undefined {
    return this.cells.get(sid)?.value;
  }

  getSignal(sid: StateId): Signal<OCLVal> | undefined {
    return this.cells.get(sid);
  }

  /** Write a value to a store cell. Must be inside a batch (transaction). */
  write(sid: StateId, val: OCLVal): void {
    this.cells.get(sid)!.value = val;
  }

  /** Create a snapshot (Heap) of all current store values. */
  snapshot(): Heap {
    const h = new Map<StateId, OCLVal>();
    for (const [sid, cell] of this.cells) {
      h.set(
        sid,
        untracked(() => cell.value),
      );
    }
    return h;
  }

  /** Restore store cells from a heap snapshot. */
  restore(heap: Heap): void {
    batch(() => {
      for (const [sid, val] of heap) {
        const cell = this.cells.get(sid);
        if (cell) cell.value = val;
      }
    });
  }
}

/** A heap / snapshot: maps state identifiers to pre-transaction values. */
export type Heap = Map<StateId, OCLVal>;

/** Full snapshot: every state id maps to Some(rho(s)) (mirrors semantics.v). */
export function fullSnapshot(store: Store): Heap {
  return store.snapshot();
}

/** restore matches the Coq definition: for each sid in heap, set store; else keep store. */
export function restore(store: Store, heap: Heap): void {
  store.restore(heap);
}

export { fieldStateId };
