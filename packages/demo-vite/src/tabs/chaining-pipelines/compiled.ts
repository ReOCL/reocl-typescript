import type { ReactiveObject } from "reactiveocl";
import { intSignal, ReactiveStore, strSignal, type ReactiveSignal } from "reactiveocl";

export class CompiledProduct {
  name$: ReactiveSignal<string>;
  price$: ReactiveSignal<number>;
  quantity$: ReactiveSignal<number>;
  readonly obj: ReactiveObject;

  constructor(store: ReactiveStore, name: string, price: number, quantity: number) {
    this.obj = store.getClass("Product")!.create({ name, price, quantity });
    this.name$ = strSignal(this.obj, "name");
    this.price$ = intSignal(this.obj, "price");
    this.quantity$ = intSignal(this.obj, "quantity");
  }

  static from(obj: ReactiveObject): CompiledProduct {
    const p = Object.create(CompiledProduct.prototype);
    p.obj = obj;
    p.name$ = strSignal(obj, "name");
    p.price$ = intSignal(obj, "price");
    p.quantity$ = intSignal(obj, "quantity");
    return p;
  }
}
