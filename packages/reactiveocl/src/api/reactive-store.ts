import type { ReadonlySignal } from "@core/signal";
import { Store } from "@core/store";
import { Transaction } from "@core/transaction";
import type { ClassId } from "@core/types";
import { type OCLVal, VFalse, vint, vstring, VTrue } from "@core/values";
import { TypedReactiveCollection } from "./reactive-collection";
import { ReactiveObject } from "./reactive-object";

export type FieldDef =
  | { tag: "Int"; initial: number }
  | { tag: "String"; initial: string }
  | { tag: "Bool"; initial: boolean }
  | { tag: "Collection"; elementClass: ClassId };

export type FieldDefMap = Record<string, FieldDef>;

/** A class registered with the store. */
export class RegisteredClass {
  constructor(
    public readonly classId: ClassId,
    public readonly fields: FieldDefMap,
    private store: Store,
    private oidSource: () => number,
  ) {}

  /** Create a new instance of this class. */
  create(fieldValues: Record<string, number | string | boolean>): ReactiveObject {
    const oid = this.oidSource();
    const collections = new Map<string, TypedReactiveCollection>();

    for (const [fname, def] of Object.entries(this.fields)) {
      if (def.tag === "Collection") {
        collections.set(fname, new TypedReactiveCollection([]));
        continue;
      }
      let val: OCLVal;
      if (fname in fieldValues) {
        const v = fieldValues[fname]!;
        switch (def.tag) {
          case "Int":
            val = vint(v as number);
            break;
          case "String":
            val = vstring(v as string);
            break;
          case "Bool":
            val = (v as boolean) ? VTrue : VFalse;
            break;
        }
      } else {
        switch (def.tag) {
          case "Int":
            val = vint(def.initial);
            break;
          case "String":
            val = vstring(def.initial);
            break;
          case "Bool":
            val = def.initial ? VTrue : VFalse;
            break;
        }
      }
      this.store.register(this.classId, oid, fname, val);
    }
    return new ReactiveObject(this.store, this.classId, oid, collections);
  }
}

/** High-level store: register metamodel classes, create reactive objects. */
export class ReactiveStore {
  private store = new Store();
  private classes = new Map<ClassId, RegisteredClass>();
  private nextOid = new Map<ClassId, number>();

  /** The underlying core store (for Transaction compatibility). */
  get core(): Store {
    return this.store;
  }

  /** Register a metamodel class with its fields. */
  registerClass(classId: ClassId, fields: FieldDefMap): RegisteredClass {
    this.nextOid.set(classId, 1);
    const cls = new RegisteredClass(classId, fields, this.store, () => {
      const n = this.nextOid.get(classId)!;
      this.nextOid.set(classId, n + 1);
      return n;
    });
    this.classes.set(classId, cls);
    return cls;
  }

  /** Get a registered class. */
  getClass(classId: ClassId): RegisteredClass | undefined {
    return this.classes.get(classId);
  }

  /** Create a Transaction watched by invariant signals. */
  transaction(...invariants: ReadonlySignal<boolean>[]): Transaction {
    const tx = new Transaction(this.store);
    for (const inv of invariants) tx.watch(inv);
    return tx;
  }
}
