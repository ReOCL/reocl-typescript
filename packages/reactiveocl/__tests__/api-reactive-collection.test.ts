import { describe, it, expect } from "bun:test";
import { ReactiveStore } from "@api/reactive-store";
import { ReactiveObject } from "@api/reactive-object";
import { TypedReactiveCollection } from "@api/reactive-collection";

function makeCE() {
  return class CE {
    salary$: { value: number };
    constructor(public obj: ReactiveObject) {
      this.salary$ = {
        get value() {
          return obj.int("salary");
        },
      };
    }
    static from(obj: ReactiveObject) {
      return new CE(obj);
    }
  };
}

describe("TypedReactiveCollection typed API", () => {
  it("forAll with typed predicate", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 30_000 } });
    const o1 = s.getClass("E")!.create({ salary: 40_000 });
    const o2 = s.getClass("E")!.create({ salary: 25_000 });
    const CE = makeCE();
    const coll = new TypedReactiveCollection([o1, o2], CE.from);
    const fa = coll.forAll((e) => e.salary$.value >= 20_000);
    expect(fa.value).toBe(true);
  });

  it("exists with typed predicate", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 10 });
    const CE = makeCE();
    const c = new TypedReactiveCollection([o1], CE.from);
    expect(c.exists((e) => e.salary$.value > 5).value).toBe(true);
    expect(c.exists((e) => e.salary$.value > 20).value).toBe(false);
  });

  it("one / isUnique with typed predicate", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 10 });
    const o2 = s.getClass("E")!.create({ salary: 20 });
    const CE = makeCE();
    const c = new TypedReactiveCollection([o1, o2], CE.from);
    expect(c.one((e) => e.salary$.value > 15).value).toBe(true);
    expect(c.one((e) => e.salary$.value > 0).value).toBe(false);
    expect(c.isUnique((e) => e.salary$.value).value).toBe(true);
  });

  it("select with typed predicate", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 30 });
    const o2 = s.getClass("E")!.create({ salary: 10 });
    const CE = makeCE();
    const c = new TypedReactiveCollection([o1, o2], CE.from);
    const sel = c.select((e) => e.salary$.value > 20);
    expect(sel.objects.value.length).toBe(1);
  });

  it("collect with typed predicate", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 5 });
    const CE = makeCE();
    const c = new TypedReactiveCollection([o1], CE.from);
    const col = c.collect((e) => e.salary$.value * 2);
    expect(col.numbers().value[0]).toBe(10);
  });

  it("size / sum / isEmpty / notEmpty", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 10 });
    const o2 = s.getClass("E")!.create({ salary: 20 });
    const CE = makeCE();
    const c = new TypedReactiveCollection([o1, o2], CE.from);
    expect(c.size().value).toBe(2);
    expect(c.isEmpty().value).toBe(false);
    expect(c.notEmpty().value).toBe(true);
  });

  it("wrapAs shares backing collection", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 99 });
    const raw = new TypedReactiveCollection([o1]);
    const CE = makeCE();
    const typed = raw.wrapAs(CE.from);
    expect(typed.objects.value.length).toBe(1);
    expect(typed.objects.value[0]!.salary$.value).toBe(99);
  });

  it("collect computed evaluates when reading objects", () => {
    const s = new ReactiveStore();
    s.registerClass("E", { salary: { tag: "Int", initial: 0 } });
    const o1 = s.getClass("E")!.create({ salary: 5 });
    const raw = new TypedReactiveCollection([o1]);
    const CE = makeCE();
    const c = raw.wrapAs(CE.from);
    const col = c.collect((e) => e.salary$.value * 2);
    void col.objects.value;
  });
});
