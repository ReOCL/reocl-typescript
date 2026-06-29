import { computed, type ReadonlySignal } from "./signal";
import { Store } from "./store";
import { Transaction } from "./transaction";
import {
  type BinOp,
  type Expr,
  type Invariant,
  type MetaModel,
  type OCLType,
  TBool,
  TInt,
  TString,
  TObject,
  TCollection,
  OCLType_compat,
  OCLType_beq,
  OCLType_join,
} from "./types";
import type { OCLVal } from "./values";
import {
  boolVal,
  expectBool,
  expectColl,
  oclAdd,
  oclDiv,
  oclEq,
  oclGeq,
  oclGt,
  oclImplies,
  oclLeq,
  oclLt,
  oclMul,
  oclNeq,
  oclNot,
  oclSub,
  oclXor,
  VFalse,
  vint,
  vstring,
  VTrue,
} from "./values";
type ValEnv = Map<string, OCLVal | undefined>;

function oclBinOp(op: BinOp, a: OCLVal, b: OCLVal): OCLVal | null {
  switch (op) {
    case "and": {
      // short-circuit: VFalse → skip e2
      const ba = expectBool(a);
      if (ba === false) return VFalse;
      if (ba === null) return null;
      // ba === true
      const bb = expectBool(b);
      if (bb === null) return null;
      return boolVal(bb);
    }
    case "or": {
      const ba = expectBool(a);
      if (ba === true) return VTrue;
      if (ba === null) return null;
      const bb = expectBool(b);
      if (bb === null) return null;
      return boolVal(bb);
    }
    case "implies":
      return oclImplies(a, b);
    case "xor":
      return oclXor(a, b);
    case "eq":
      return oclEq(a, b);
    case "neq":
      return oclNeq(a, b);
    case "lt":
      return oclLt(a, b);
    case "gt":
      return oclGt(a, b);
    case "leq":
      return oclLeq(a, b);
    case "geq":
      return oclGeq(a, b);
    case "add":
      return oclAdd(a, b);
    case "sub":
      return oclSub(a, b);
    case "mul":
      return oclMul(a, b);
    case "div":
      return oclDiv(a, b);
  }
}

// ---- Static type checker (mirrors syntax.v typeOf) ----

function typeBinOp(op: BinOp, t1: OCLType, t2: OCLType): OCLType | null {
  switch (op) {
    case "and":
    case "or":
    case "implies":
    case "xor":
      if (OCLType_compat(t1, TBool) && OCLType_compat(t2, TBool)) return TBool;
      return null;
    case "eq":
    case "neq":
      if (OCLType_beq(t1, t2)) return TBool;
      return null;
    case "lt":
    case "gt":
    case "leq":
    case "geq":
      if (OCLType_compat(t1, TInt) && OCLType_compat(t2, TInt)) return TBool;
      return null;
    case "add":
    case "sub":
    case "mul":
    case "div":
      if (OCLType_compat(t1, TInt) && OCLType_compat(t2, TInt)) return TInt;
      return null;
  }
}

export function typeOf(env: Map<string, OCLType>, e: Expr, mm: MetaModel): OCLType | null {
  switch (e.tag) {
    case "ETrue":
    case "EFalse":
      return TBool;
    case "EIntLit":
      return TInt;
    case "EStringLit":
      return TString;
    case "ESelf": {
      const selfT = env.get("self");
      return selfT ?? null;
    }
    case "EVar": {
      const t = env.get(e.x);
      return t ?? null;
    }
    case "ENav": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TObject") return null;
      return mm.fieldType(t.C, e.f);
    }
    case "EPre": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TObject") return null;
      return mm.fieldType(t.C, e.f);
    }
    case "EBinOp": {
      const t1 = typeOf(env, e.e1, mm);
      const t2 = typeOf(env, e.e2, mm);
      if (!t1 || !t2) return null;
      return typeBinOp(e.op, t1, t2);
    }
    case "ENot": {
      const t = typeOf(env, e.e, mm);
      if (!t || !OCLType_compat(t, TBool)) return null;
      return TBool;
    }
    case "EIf": {
      const tg = typeOf(env, e.e1, mm);
      const tt = typeOf(env, e.e2, mm);
      const te = typeOf(env, e.e3, mm);
      if (!tg || !OCLType_compat(tg, TBool)) return null;
      if (!tt || !te) return null;
      return OCLType_join(tt, te);
    }
    case "ESelect": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map<string, OCLType>(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return TCollection(t1.t);
    }
    case "EReject": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map<string, OCLType>(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return TCollection(t1.t);
    }
    case "ECollect": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2) return null;
      return TCollection(t2);
    }
    case "EForAll": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return TBool;
    }
    case "EExists": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return TBool;
    }
    case "EOne": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return TBool;
    }
    case "EIsUnique": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2) return null;
      return TBool;
    }
    case "EAny": {
      const t1 = typeOf(env, e.e1, mm);
      if (!t1 || t1.tag !== "TCollection") return null;
      const extEnv = new Map(env);
      extEnv.set(e.x, t1.t);
      const t2 = typeOf(extEnv, e.e2, mm);
      if (!t2 || !OCLType_compat(t2, TBool)) return null;
      return t1.t;
    }
    case "ESize": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TCollection") return null;
      return TInt;
    }
    case "ESum": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TCollection" || !OCLType_beq(t.t, TInt)) return null;
      return TInt;
    }
    case "EIsEmpty": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TCollection") return null;
      return TBool;
    }
    case "ENotEmpty": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TCollection") return null;
      return TBool;
    }
    case "EKindOf": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TObject") return null;
      return TBool;
    }
    case "ETypeOf": {
      const t = typeOf(env, e.e, mm);
      if (!t || t.tag !== "TObject") return null;
      return TBool;
    }
  }
}

export function wellTypedInvariant(inv: Invariant, mm: MetaModel): boolean {
  const env = new Map<string, OCLType>();
  env.set("self", TObject(inv.context));
  return typeOf(env, inv.body, mm)?.tag === "TBool";
}

/** Evaluate a ReOCL expression to an OCLVal (or null if undefined). */
export function evalExpr(
  expr: Expr,
  env: ValEnv,
  store: Store,
  heap: Map<string, OCLVal> | null,
): OCLVal | null {
  switch (expr.tag) {
    case "ETrue":
      return VTrue;
    case "EFalse":
      return VFalse;
    case "EIntLit":
      return vint(expr.n);
    case "EStringLit":
      return vstring(expr.s);
    case "ESelf":
      return env.get("self") ?? null;
    case "EVar":
      return env.get(expr.x) ?? null;
    case "ENav": {
      const v = evalExpr(expr.e, env, store, heap);
      if (v === null || v.tag !== "VObj") return null;
      const sid = `${v.classId}:${v.oid}:${expr.f}`;
      return store.read(sid) ?? null;
    }
    case "EPre": {
      const v = evalExpr(expr.e, env, store, heap);
      if (v === null || v.tag !== "VObj") return null;
      const sid = `${v.classId}:${v.oid}:${expr.f}`;
      return heap?.get(sid) ?? null;
    }
    case "EBinOp": {
      const v1 = evalExpr(expr.e1, env, store, heap);
      if (v1 === null) return null;
      // short-circuit and/or
      if (expr.op === "and" && expectBool(v1) === false) return VFalse;
      if (expr.op === "or" && expectBool(v1) === true) return VTrue;
      const v2 = evalExpr(expr.e2, env, store, heap);
      if (v2 === null) return null;
      return oclBinOp(expr.op, v1, v2);
    }
    case "ENot": {
      const v = evalExpr(expr.e, env, store, heap);
      return v === null ? null : oclNot(v);
    }
    case "EIf": {
      const guard = evalExpr(expr.e1, env, store, heap);
      const bg = guard === null ? null : expectBool(guard);
      if (bg === null) return null;
      return evalExpr(bg ? expr.e2 : expr.e3, env, store, heap);
    }
    case "ESelect": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      const out: OCLVal[] = [];
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r === VTrue) out.push(v);
      }
      return { tag: "VColl", vs: out };
    }
    case "EReject": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      const out: OCLVal[] = [];
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r !== VTrue) out.push(v);
      }
      return { tag: "VColl", vs: out };
    }
    case "ECollect": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      const out: OCLVal[] = [];
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        out.push(r);
      }
      return { tag: "VColl", vs: out };
    }
    case "EForAll": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r !== VTrue) return VFalse;
      }
      return VTrue;
    }
    case "EExists": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r === VTrue) return VTrue;
      }
      return VFalse;
    }
    case "EOne": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      let cnt = 0;
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r === VTrue) cnt++;
      }
      return cnt === 1 ? VTrue : VFalse;
    }
    case "EIsUnique": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      const seen = new Map<number, number>();
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        const key = r.tag === "VInt" ? r.n : r.tag === "VString" ? r.s.length * 31 : 0;
        const ck = seen.get(key) ?? 0;
        if (ck > 0) return VFalse;
        seen.set(key, ck + 1);
      }
      return VTrue;
    }
    case "EAny": {
      const c = evalExpr(expr.e1, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      for (const v of vs) {
        env.set(expr.x, v);
        const r = evalExpr(expr.e2, env, store, heap);
        if (r === null) return null;
        if (r === VTrue) return v;
      }
      return null;
    }
    case "ESize": {
      const c = evalExpr(expr.e, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      return vs === null ? null : vint(vs.length);
    }
    case "ESum": {
      const c = evalExpr(expr.e, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      if (vs === null) return null;
      let total = 0;
      for (const v of vs) {
        if (v.tag !== "VInt") return null;
        total += v.n;
      }
      return vint(total);
    }
    case "EIsEmpty": {
      const c = evalExpr(expr.e, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      return vs === null ? null : boolVal(vs.length === 0);
    }
    case "ENotEmpty": {
      const c = evalExpr(expr.e, env, store, heap);
      if (c === null) return null;
      const vs = expectColl(c);
      return vs === null ? null : boolVal(vs.length > 0);
    }
    case "EKindOf": {
      // assumes metamodel.covers extends: MetaModel is available
      // simplified: just return true for now (the runtime needs the metamodel)
      const v = evalExpr(expr.e, env, store, heap);
      if (v === null || v.tag !== "VObj") return null;
      // In a full implementation, we'd check extends(v.classId, expr.C)
      return boolVal(v.classId === expr.C);
    }
    case "ETypeOf": {
      const v = evalExpr(expr.e, env, store, heap);
      if (v === null || v.tag !== "VObj") return null;
      return boolVal(v.classId === expr.C);
    }
  }
}

/**
 * Compile an invariant body into a live reactive signal.
 * Returns a Computed<boolean> that re-evaluates when its dependencies change.
 */
export function compileInvariant(
  inv: Invariant,
  store: Store,
  oid: number,
  tx: Transaction | null = null,
): ReadonlySignal<boolean> {
  return computed(() => {
    const heap = tx ? store.snapshot() : null; // simplified: use current snapshot if in tx
    const env = new Map<string, OCLVal | undefined>();
    env.set("self", { tag: "VObj", oid, classId: inv.context } satisfies OCLVal);
    const result = evalExpr(inv.body, env, store, heap);
    return result === VTrue;
  });
}
