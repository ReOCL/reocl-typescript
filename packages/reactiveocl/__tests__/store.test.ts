import { describe, it, expect } from "bun:test";
import { Store, fullSnapshot, restore } from "@core/store";
import { vint, vstring } from "@core/values";

describe("Store", () => {
  it("registers and reads", () => {
    const s = new Store();
    s.register("C", 1, "f", vint(42));
    expect(s.read("C:1:f")).toEqual(vint(42));
  });

  it("register returns a signal that can be mutated", () => {
    const s = new Store();
    const sig = s.register("C", 1, "x", vint(1));
    expect(sig.value).toEqual(vint(1));
    sig.value = vint(99);
    expect(s.read("C:1:x")).toEqual(vint(99));
  });

  it("getSignal returns undefined for unknown", () => {
    const s = new Store();
    expect(s.getSignal("nonexistent")).toBeUndefined();
  });

  it("read returns undefined for unknown", () => {
    const s = new Store();
    expect(s.read("nonexistent")).toBeUndefined();
  });

  it("write sets value", () => {
    const s = new Store();
    s.register("C", 1, "f", vint(0));
    s.write("C:1:f", vint(10));
    expect(s.read("C:1:f")).toEqual(vint(10));
  });
});

describe("snapshot and restore", () => {
  it("snapshot captures all values", () => {
    const s = new Store();
    s.register("A", 1, "x", vint(10));
    s.register("A", 1, "y", vstring("hi"));
    const snap = s.snapshot();
    expect(snap.get("A:1:x")).toEqual(vint(10));
    expect(snap.get("A:1:y")).toEqual(vstring("hi"));
  });

  it("restore rewrites store from snapshot", () => {
    const s = new Store();
    s.register("A", 1, "x", vint(10));
    const snap = s.snapshot();
    s.write("A:1:x", vint(99));
    expect(s.read("A:1:x")).toEqual(vint(99));
    s.restore(snap);
    expect(s.read("A:1:x")).toEqual(vint(10));
  });

  it("fullSnapshot is alias for snapshot", () => {
    const s = new Store();
    s.register("A", 1, "x", vint(5));
    expect(fullSnapshot(s)).toEqual(s.snapshot());
  });

  it("restore helper is alias", () => {
    const s = new Store();
    s.register("A", 1, "x", vint(1));
    const snap = s.snapshot();
    s.write("A:1:x", vint(2));
    restore(s, snap);
    expect(s.read("A:1:x")).toEqual(vint(1));
  });
});
