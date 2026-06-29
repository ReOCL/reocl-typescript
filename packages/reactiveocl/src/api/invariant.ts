import type { ReadonlySignal } from "@core/signal";

/**
 * A named invariant with a reactive value signal and source code.
 */
export interface InvariantDef {
  name: string;
  value$: ReadonlySignal<boolean>;
  code: string;
}

/**
 * Create an invariant definition.
 *
 * @param name   The invariant name (e.g. "noUnpaid")
 * @param value$ The reactive boolean signal
 * @param code   The source code that created the invariant
 */
export function invariant(
  name: string,
  value$: ReadonlySignal<boolean>,
  code: string = "",
): InvariantDef {
  return { name, value$, code };
}
