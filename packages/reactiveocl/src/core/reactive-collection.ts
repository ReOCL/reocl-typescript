import { batch, computed, signal, type ReadonlySignal, type Signal } from "./signal";
import type { Delta, DeltaSubscriber } from "./types";
import type { OCLVal } from "./values";
import { OCLVal_beq } from "./values";

type Pred = (v: OCLVal) => boolean | null;
type Mapper = (v: OCLVal) => OCLVal | null;
type KeyFn = (v: OCLVal) => number | null;

function vobjKey(v: OCLVal): string | null {
  if (v.tag !== "VObj") return null;
  return `${v.classId}:${v.oid}`;
}

function scanKey(v: OCLVal): string {
  if (v.tag === "VObj") return `vobj:${v.classId}:${v.oid}`;
  if (v.tag === "VInt") return `vint:${v.n}`;
  if (v.tag === "VString") return `vstr:${v.s}`;
  if (v.tag === "VTrue") return "vbool:true";
  if (v.tag === "VFalse") return "vbool:false";
  return `vcoll:${v.vs.length}`;
}

export class ReactiveCollection {
  private _values: OCLVal[] = [];
  private _version: Signal<number> = signal(0);
  private subscribers = new Set<DeltaSubscriber>();

  private _index: Map<string, number> = new Map();

  constructor(initial?: OCLVal[]) {
    if (initial?.length) {
      this._values = initial.slice();
      for (let i = 0; i < this._values.length; i++) {
        const k = vobjKey(this._values[i]!) ?? scanKey(this._values[i]!);
        this._index.set(k, i);
      }
    }
  }

  snapshot(): readonly OCLVal[] {
    return this._values;
  }

  get value(): OCLVal[] {
    return this._values;
  }

  get signal(): ReadonlySignal<OCLVal[]> {
    return computed(() => {
      void this._version.value;
      return this._values.slice();
    });
  }

  version(): ReadonlySignal<number> {
    return this._version;
  }

  add(v: OCLVal): void {
    batch(() => {
      const k = vobjKey(v) ?? scanKey(v);
      this._index.set(k, this._values.length);
      this._values.push(v);
      this._version.value++;

      for (const sub of this.subscribers) {
        sub({ tag: "ADD", val: v });
      }
    });
  }

  addAll(vs: OCLVal[]): void {
    if (vs.length === 0) return;
    batch(() => {
      for (const v of vs) {
        const k = vobjKey(v) ?? scanKey(v);
        this._index.set(k, this._values.length);
        this._values.push(v);
      }
      this._version.value++;

      for (const v of vs) {
        for (const sub of this.subscribers) {
          sub({ tag: "ADD", val: v });
        }
      }
    });
  }

  remove(v: OCLVal): void {
    batch(() => {
      if (v.tag === "VObj") {
        this._removeVObj(v.classId, v.oid);
      } else {
        this._removeByScan(v);
      }
    });
  }

  private _removeVObj(classId: string, oid: number): void {
    const key = `${classId}:${oid}`;
    const idx = this._index.get(key);
    if (idx === undefined) return;

    const removed = this._values[idx]!;
    const lastIdx = this._values.length - 1;

    if (idx !== lastIdx) {
      const last = this._values[lastIdx]!;
      this._values[idx] = last;
      const lastKey = vobjKey(last) ?? scanKey(last);
      this._index.set(lastKey, idx);
    }

    this._values.pop();
    this._index.delete(key);
    this._version.value++;

    for (const sub of this.subscribers) {
      sub({ tag: "REMOVE", val: removed });
    }
  }

  private _removeByScan(v: OCLVal): void {
    const idx = this._values.findIndex((w) => OCLVal_beq(w, v));
    if (idx === -1) return;

    const removed = this._values[idx]!;
    const lastIdx = this._values.length - 1;

    if (idx !== lastIdx) {
      const last = this._values[lastIdx]!;
      this._values[idx] = last;
      const lastKey = vobjKey(last) ?? scanKey(last);
      this._index.set(lastKey, idx);
    }

    this._values.pop();

    const oldKey = vobjKey(removed) ?? scanKey(removed);
    this._index.delete(oldKey);
    this._version.value++;

    for (const sub of this.subscribers) {
      sub({ tag: "REMOVE", val: removed });
    }
  }

  subscribe(fn: DeltaSubscriber): () => void {
    this.subscribers.add(fn);
    return () => void this.subscribers.delete(fn);
  }

  select(p: Pred): ReactiveCollection {
    const result = new ReactiveCollection();
    for (const v of this.snapshot()) {
      const b = p(v);
      if (b === true) result.add(v);
    }
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") {
        const b = p(d.val);
        if (b === true) result.add(d.val);
      } else {
        const b = p(d.val);
        if (b === true) result.remove(d.val);
      }
    });
    return result;
  }

  reject(p: Pred): ReactiveCollection {
    return this.select((v) => {
      const b = p(v);
      return b === null ? null : !b;
    });
  }

  collect(f: Mapper): ReactiveCollection {
    const result = new ReactiveCollection();
    for (const v of this.snapshot()) {
      const w = f(v);
      if (w !== null) result.add(w);
    }
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") {
        const w = f(d.val);
        if (w !== null) result.add(w);
      } else {
        const w = f(d.val);
        if (w !== null) result.remove(w);
      }
    });
    return result;
  }

  forAll(p: Pred): ReadonlySignal<boolean> {
    let violatingCount = 0;
    for (const v of this.snapshot()) {
      const b = p(v);
      if (b !== true) violatingCount++;
    }
    const violated = signal(violatingCount === 0);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") {
        const b = p(d.val);
        if (b !== true) violatingCount++;
      } else {
        const b = p(d.val);
        if (b !== true) violatingCount--;
      }
      violated.value = violatingCount === 0;
    });
    return violated;
  }

  exists(p: Pred): ReadonlySignal<boolean> {
    let count = 0;
    for (const v of this.snapshot()) {
      if (p(v) === true) count++;
    }
    const result = signal(count > 0);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") {
        if (p(d.val) === true) count++;
      } else {
        if (p(d.val) === true) count--;
      }
      result.value = count > 0;
    });
    return result;
  }

  one(p: Pred): ReadonlySignal<boolean> {
    let count = 0;
    for (const v of this.snapshot()) {
      if (p(v) === true) count++;
    }
    const result = signal(count === 1);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") {
        if (p(d.val) === true) count++;
      } else {
        if (p(d.val) === true) count--;
      }
      result.value = count === 1;
    });
    return result;
  }

  size(): ReadonlySignal<number> {
    let sz = this._values.length;
    const result = signal(sz);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") sz++;
      else sz--;
      result.value = sz;
    });
    return result;
  }

  sum(): ReadonlySignal<number> {
    let total = 0;
    for (const v of this.snapshot()) {
      if (v.tag === "VInt") total += v.n;
    }
    const result = signal(total);
    this.subscribe((d: Delta) => {
      if (d.val.tag === "VInt") {
        if (d.tag === "ADD") total += d.val.n;
        else total -= d.val.n;
      }
      result.value = total;
    });
    return result;
  }

  isEmpty(): ReadonlySignal<boolean> {
    let sz = this._values.length;
    const result = signal(sz === 0);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") sz++;
      else sz--;
      result.value = sz === 0;
    });
    return result;
  }

  notEmpty(): ReadonlySignal<boolean> {
    let sz = this._values.length;
    const result = signal(sz > 0);
    this.subscribe((d: Delta) => {
      if (d.tag === "ADD") sz++;
      else sz--;
      result.value = sz > 0;
    });
    return result;
  }

  isUnique(kf: KeyFn): ReadonlySignal<boolean> {
    const counts = new Map<number, number>();
    let duplicates = 0;
    for (const v of this.snapshot()) {
      const key = kf(v);
      if (key === null) continue;
      const c = counts.get(key) ?? 0;
      counts.set(key, c + 1);
      if (c === 1) duplicates++;
    }
    const result = signal(duplicates === 0);
    this.subscribe((d: Delta) => {
      const key = kf(d.val);
      if (key === null) return;
      const c = counts.get(key) ?? 0;
      if (d.tag === "ADD") {
        counts.set(key, c + 1);
        if (c === 1) duplicates++;
      } else {
        counts.set(key, c - 1);
        if (c - 1 === 0) counts.delete(key);
        if (c === 2) duplicates--;
      }
      result.value = duplicates === 0;
    });
    return result;
  }
}
