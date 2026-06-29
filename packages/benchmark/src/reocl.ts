import {
  ReactiveStore,
  TypedReactiveCollection,
  type ReactiveObject,
  type ReactiveSignal,
  computed,
} from "reactiveocl";
import type { Employee, Department } from "./model";

function createStore() {
  const store = new ReactiveStore();
  store.registerClass("Department", {
    capacity: { tag: "Int", initial: 0 },
    employees: { tag: "Collection", elementClass: "Employee" },
  });
  store.registerClass("Employee", {
    active: { tag: "Bool", initial: true },
  });
  return store;
}

export class ReoclDepartment implements Department {
  private store: ReactiveStore;
  private employees$: TypedReactiveCollection<ReactiveObject>;
  private activeCount$: ReactiveSignal<number>;
  private ok$: ReactiveSignal<boolean>;
  private empMap = new Map<number, ReactiveObject>();

  constructor(
    initialEmployees: Iterable<Employee>,
    readonly capacity: number,
  ) {
    this.store = createStore();
    const deptObj = this.store.getClass("Department")!.create({ capacity });
    this.employees$ = deptObj.collection("employees");

    const objs: ReactiveObject[] = [];
    for (const e of initialEmployees) {
      const obj = this.store.getClass("Employee")!.create({ active: e.active });
      this.empMap.set(e.id, obj);
      objs.push(obj);
    }

    this.employees$.addAll(objs);

    this.activeCount$ = this.employees$.select((obj) => obj.bool("active")).size();

    this.ok$ = computed(() => this.activeCount$.value <= this.capacity);
  }

  get activeCapacity(): boolean {
    return this.ok$.value;
  }

  addEmployee(e: Employee): void {
    const obj = this.store.getClass("Employee")!.create({ active: e.active });
    this.empMap.set(e.id, obj);
    this.employees$.add(obj);
  }

  removeEmployee(e: Employee): void {
    const obj = this.empMap.get(e.id);
    if (!obj) return;
    this.employees$.removeByOid("Employee", obj.oid);
    this.empMap.delete(e.id);
  }
}
