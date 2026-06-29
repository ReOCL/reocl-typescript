import { describe, it, expect } from "bun:test";
import { Transaction } from "@core/transaction";
import { Store } from "@core/store";
import { vint } from "@core/values";
import { computed } from "@core/signal";

describe("Transaction", () => {
  it("commits when invariant satisfied", () => {
    const store = new Store();
    store.register("C", 1, "x", vint(100));
    const ok$ = computed(
      () => store.read("C:1:x")!.tag === "VInt" && (store.read("C:1:x") as any).n > 0,
    );

    const tx = new Transaction(store);
    tx.watch(ok$);
    tx.begin();
    tx.mutate(() => {
      store.write("C:1:x", vint(200));
    });
    expect(tx.commit()).toBe(true);
    expect(store.read("C:1:x")).toEqual(vint(200));
  });

  it("rolls back when invariant violated", () => {
    const store = new Store();
    store.register("C", 1, "x", vint(100));
    const ok$ = computed(
      () => store.read("C:1:x")!.tag === "VInt" && (store.read("C:1:x") as any).n < 200,
    );

    const tx = new Transaction(store);
    tx.watch(ok$);
    tx.begin();
    tx.mutate(() => {
      store.write("C:1:x", vint(300));
    });
    expect(tx.commit()).toBe(false);
    expect(store.read("C:1:x")).toEqual(vint(100));
  });

  it("throws if commit without begin", () => {
    const store = new Store();
    const tx = new Transaction(store);
    expect(() => tx.commit()).toThrow();
  });

  it("throws if mutate without begin", () => {
    const store = new Store();
    const tx = new Transaction(store);
    expect(() => tx.mutate(() => {})).toThrow();
  });

  it("$pre reads pre-state", () => {
    const store = new Store();
    store.register("C", 1, "x", vint(100));
    const tx = new Transaction(store);
    tx.begin();
    tx.mutate(() => {
      store.write("C:1:x", vint(999));
    });
    expect(store.read("C:1:x")).toEqual(vint(999));
    expect(tx.$pre("C:1:x")).toEqual(vint(100));
    tx.commit();
  });

  it("$pre returns undefined outside transaction", () => {
    const store = new Store();
    const tx = new Transaction(store);
    expect(tx.$pre("C:1:x")).toBeUndefined();
  });
});
