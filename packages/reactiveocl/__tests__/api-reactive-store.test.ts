import { describe, it, expect } from "bun:test";
import { ReactiveStore } from "@api/reactive-store";
import { TypedReactiveCollection } from "@api/reactive-collection";
import { Transaction } from "@core/transaction";
import { Store } from "@core/store";
import { vint } from "@core/values";
import { signal } from "@core/signal";

describe("ReactiveStore", () => {
  it("registerClass and getClass", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 0 } });
    expect(s.getClass("C")).toBeDefined();
    expect(s.getClass("X")).toBeUndefined();
  });

  it("create returns ReactiveObject with typed access", () => {
    const s = new ReactiveStore();
    s.registerClass("C", {
      a: { tag: "Int", initial: 10 },
      b: { tag: "String", initial: "hi" },
      c: { tag: "Bool", initial: true },
    });
    const obj = s.getClass("C")!.create({ a: 5, b: "bye", c: false });
    expect(obj.int("a")).toBe(5);
    expect(obj.str("b")).toBe("bye");
    expect(obj.bool("c")).toBe(false);
  });

  it("create uses default values when not provided", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 99 } });
    const obj = s.getClass("C")!.create({});
    expect(obj.int("x")).toBe(99);
  });

  it("create increments oid", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("C")!.create({});
    const o2 = s.getClass("C")!.create({});
    expect(o2.oid).toBe(o1.oid + 1);
  });

  it("transaction creates a Transaction and watches invariants", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 10 } });
    const obj = s.getClass("C")!.create({});
    const ok$ = signal(obj.int("x") > 0);
    const tx = s.transaction(ok$);
    expect(tx).toBeInstanceOf(Transaction);
  });

  it("core getter exposes Store", () => {
    const s = new ReactiveStore();
    expect(s.core).toBeInstanceOf(Store);
  });
});

describe("ReactiveObject", () => {
  it("int / str / bool accessors", () => {
    const s = new ReactiveStore();
    s.registerClass("C", {
      a: { tag: "Int", initial: 42 },
      b: { tag: "String", initial: "hello" },
      c: { tag: "Bool", initial: true },
    });
    const obj = s.getClass("C")!.create({});
    expect(obj.int("a")).toBe(42);
    expect(obj.str("b")).toBe("hello");
    expect(obj.bool("c")).toBe(true);
  });

  it("int returns 0 for non-existent field", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 5 } });
    const obj = s.getClass("C")!.create({});
    expect(obj.int("nonexistent")).toBe(0);
  });

  it("str returns empty string for non-existent field", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "String", initial: "a" } });
    const obj = s.getClass("C")!.create({});
    expect(obj.str("nonexistent")).toBe("");
  });

  it("bool returns false for non-existent field", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Bool", initial: true } });
    const obj = s.getClass("C")!.create({});
    expect(obj.bool("nonexistent")).toBe(false);
  });

  it("preInt reads store value when no transaction", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 7 } });
    const obj = s.getClass("C")!.create({});
    // Falls back to current value since no heap
    expect(obj.preInt("x")).toBe(7);
  });

  it("setInt / setString / setBool", () => {
    const s = new ReactiveStore();
    s.registerClass("C", {
      a: { tag: "Int", initial: 0 },
      b: { tag: "String", initial: "" },
      c: { tag: "Bool", initial: false },
    });
    const obj = s.getClass("C")!.create({});
    obj.setInt("a", 99);
    obj.setString("b", "updated");
    obj.setBool("c", true);
    expect(obj.int("a")).toBe(99);
    expect(obj.str("b")).toBe("updated");
    expect(obj.bool("c")).toBe(true);
  });

  it("field returns signal", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 10 } });
    const obj = s.getClass("C")!.create({});
    const sig = obj.field("x");
    expect(sig.value).toEqual(vint(10));
  });

  it("toVal returns VObj", () => {
    const s = new ReactiveStore();
    s.registerClass("C", { x: { tag: "Int", initial: 1 } });
    const obj = s.getClass("C")!.create({});
    const v = obj.toVal();
    expect(v.tag).toBe("VObj");
  });

  it("collection returns TypedReactiveCollection", () => {
    const s = new ReactiveStore();
    s.registerClass("C", {
      items: { tag: "Collection", elementClass: "D" },
    });
    const obj = s.getClass("C")!.create({});
    const coll = obj.collection("items");
    expect(coll).toBeInstanceOf(TypedReactiveCollection);
  });
});
