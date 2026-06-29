import type { ReadonlySignal } from "@core/signal";
import { Store } from "@core/store";
import { $pre } from "@core/transaction";
import type { ClassId } from "@core/types";
import { type OCLVal, vobj } from "@core/values";
import { TypedReactiveCollection } from "./reactive-collection";

/** A reactive object wraps a Store object with typed field access. */
export class ReactiveObject {
  private collections: Map<string, TypedReactiveCollection>;

  constructor(
    public readonly store: Store,
    public readonly classId: ClassId,
    public readonly oid: number,
    collections: Map<string, TypedReactiveCollection> = new Map(),
  ) {
    this.collections = collections;
  }

  /** Read field value directly (internal - consumers use typed accessors). */
  fieldValue(f: string): OCLVal | undefined {
    return this.store.read(`${this.classId}:${this.oid}:${f}`);
  }

  /** Read a field as a raw OCLVal signal (internal). */
  field(f: string): ReadonlySignal<OCLVal> {
    return this.store.getSignal(`${this.classId}:${this.oid}:${f}`)!;
  }

  /** Typed: integer field value. */
  int(f: string): number {
    const v = this.fieldValue(f);
    return v?.tag === "VInt" ? v.n : 0;
  }

  /** Pre-state integer field value - the paper's @pre navigation.
   *  Reads from the transaction heap if active, falls back to current value. */
  preInt(f: string): number {
    const sid = `${this.classId}:${this.oid}:${f}`;
    const pre = $pre(sid);
    return pre?.tag === "VInt" ? pre.n : this.int(f);
  }

  /** Typed: string field value. */
  str(f: string): string {
    const v = this.fieldValue(f);
    return v?.tag === "VString" ? v.s : "";
  }

  /** Typed: boolean field value. */
  bool(f: string): boolean {
    const v = this.fieldValue(f);
    return v?.tag === "VTrue";
  }

  /** Typed: collection field (e.g., self.employees). */
  collection(f: string): TypedReactiveCollection {
    return this.collections.get(f)!;
  }

  /** Set a field value on the store signal. */
  setInt(f: string, n: number): void {
    const s = this.store.getSignal(`${this.classId}:${this.oid}:${f}`);
    if (s) s.value = { tag: "VInt", n };
  }

  setString(f: string, str: string): void {
    const s = this.store.getSignal(`${this.classId}:${this.oid}:${f}`);
    if (s) s.value = { tag: "VString", s: str };
  }

  setBool(f: string, b: boolean): void {
    const s = this.store.getSignal(`${this.classId}:${this.oid}:${f}`);
    if (s) s.value = b ? { tag: "VTrue" } : { tag: "VFalse" };
  }

  /** Get the VObj representation for the core ReactiveCollection. */
  toVal(): OCLVal {
    return vobj(this.oid, this.classId);
  }
}
