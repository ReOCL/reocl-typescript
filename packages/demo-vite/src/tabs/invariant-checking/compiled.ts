import type { ReactiveObject } from "reactiveocl";
import {
  boolSignal,
  intSignal,
  type ReactiveSignal,
  ReactiveStore,
  strSignal,
  TypedReactiveCollection,
} from "reactiveocl";

export class CompiledDepartment {
  name$: ReactiveSignal<string>;
  budget$: ReactiveSignal<number>;
  employees$: TypedReactiveCollection<CompiledEmployee>;
  noUnpaid$: ReactiveSignal<boolean>;
  employeeCount$: ReactiveSignal<number>;
  totalSalaries$: ReactiveSignal<number>;
  readonly obj: ReactiveObject;

  constructor(store: ReactiveStore, name: string, budget: number) {
    this.obj = store.getClass("Department")!.create({ name, budget });
    this.name$ = strSignal(this.obj, "name");
    this.budget$ = intSignal(this.obj, "budget");
    this.employees$ = this.obj.collection("employees").wrapAs(CompiledEmployee.from);

    const allSalaries = this.employees$.collect((e) => e.salary$.value);
    this.totalSalaries$ = allSalaries.sum();
    this.employeeCount$ = this.employees$.size();
    this.noUnpaid$ = this.employees$.forAll((e) => e.salary$.value >= 20_000);
  }
}

export class CompiledEmployee {
  name$: ReactiveSignal<string>;
  salary$: ReactiveSignal<number>;
  isMale$: ReactiveSignal<boolean>;
  readonly obj: ReactiveObject;

  constructor(store: ReactiveStore, name: string, salary: number, isMale: boolean) {
    this.obj = store.getClass("Employee")!.create({ name, salary, isMale });
    this.name$ = strSignal(this.obj, "name");
    this.salary$ = intSignal(this.obj, "salary");
    this.isMale$ = boolSignal(this.obj, "isMale");
  }

  static from(obj: ReactiveObject): CompiledEmployee {
    const e = Object.create(CompiledEmployee.prototype);
    e.obj = obj;
    e.name$ = strSignal(obj, "name");
    e.salary$ = intSignal(obj, "salary");
    e.isMale$ = boolSignal(obj, "isMale");
    return e;
  }
}
