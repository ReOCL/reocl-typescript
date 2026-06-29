import { TypedReactiveCollection } from "reactiveocl";
import { store } from "@/store";
import { CompiledProduct } from "./compiled";

export const PRODUCT_NAMES = [
  "Widget",
  "Gadget",
  "Doohickey",
  "Thingamajig",
  "Contraption",
  "Sprocket",
  "Gizmo",
  "Whatsit",
  "Doodad",
  "Apparatus",
  "Module",
  "Component",
  "Assembly",
  "Fixture",
  "Mechanism",
  "Device",
  "Instrument",
  "Tool",
  "Implement",
  "Utensil",
];

export function productNameForIndex(i: number): string {
  if (i < PRODUCT_NAMES.length) return PRODUCT_NAMES[i]!;
  const extra = i - PRODUCT_NAMES.length;
  const idx = extra % PRODUCT_NAMES.length;
  const suffix = Math.floor(extra / PRODUCT_NAMES.length) + 2;
  return `${PRODUCT_NAMES[idx]} ${suffix}`;
}

const p1 = new CompiledProduct(store, "Widget", 250, 40);
const p2 = new CompiledProduct(store, "Gadget", 120, 60);
const p3 = new CompiledProduct(store, "Doohickey", 80, 100);
const p4 = new CompiledProduct(store, "Thingamajig", 350, 15);
const p5 = new CompiledProduct(store, "Contraption", 500, 8);

export const products$ = new TypedReactiveCollection(
  [p1.obj, p2.obj, p3.obj, p4.obj, p5.obj],
  CompiledProduct.from,
);

let prodAdded = 5;

export function addProduct(price: number, quantity: number) {
  prodAdded++;
  const name = productNameForIndex(prodAdded);
  const p = new CompiledProduct(store, name, price, quantity);
  products$.add(p.obj);
  return p;
}

export function removeProduct(oid: number) {
  products$.removeByOid("Product", oid);
}
