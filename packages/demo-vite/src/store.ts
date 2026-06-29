import { ReactiveStore } from "reactiveocl";

export const store = new ReactiveStore();

store.registerClass("Department", {
  name: { tag: "String", initial: "" },
  budget: { tag: "Int", initial: 100_000 },
  employees: { tag: "Collection", elementClass: "Employee" },
});

store.registerClass("Employee", {
  name: { tag: "String", initial: "" },
  isMale: { tag: "Bool", initial: true },
  salary: { tag: "Int", initial: 30_000 },
});

store.registerClass("PersonAccount", {
  checking: { tag: "Int", initial: 300 },
  savings: { tag: "Int", initial: 700 },
});

store.registerClass("Product", {
  name: { tag: "String", initial: "" },
  price: { tag: "Int", initial: 0 },
  quantity: { tag: "Int", initial: 0 },
});
