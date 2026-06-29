import type { ReactiveObject } from "reactiveocl";
import { computed, intSignal, type ReactiveSignal, ReactiveStore } from "reactiveocl";

export class CompiledPersonAccount {
  checking$: ReactiveSignal<number>;
  savings$: ReactiveSignal<number>;
  conservation$: ReactiveSignal<boolean>;
  checkingNonNeg$: ReactiveSignal<boolean>;
  savingsNonNeg$: ReactiveSignal<boolean>;
  readonly obj: ReactiveObject;

  constructor(store: ReactiveStore, checking: number, savings: number) {
    this.obj = store.getClass("PersonAccount")!.create({ checking, savings });
    this.checking$ = intSignal(this.obj, "checking");
    this.savings$ = intSignal(this.obj, "savings");

    this.conservation$ = computed(() => {
      const curr = this.checking$.value + this.savings$.value;
      const prev = this.obj.preInt("checking") + this.obj.preInt("savings");
      return curr === prev;
    });

    this.checkingNonNeg$ = computed(() => this.checking$.value >= 0);
    this.savingsNonNeg$ = computed(() => this.savings$.value >= 0);
  }
}
