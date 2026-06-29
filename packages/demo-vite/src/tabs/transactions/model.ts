import { store } from "@/store";
import { CompiledPersonAccount } from "./compiled";

export { store };

export const pa = new CompiledPersonAccount(store, 300, 700);

export const personAccount = pa.obj;
