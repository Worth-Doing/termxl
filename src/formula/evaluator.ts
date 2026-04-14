import {
  FormulaNode,
  RuntimeValue,
  ErrorCode,
  CellRefNode,
  RangeRefNode,
} from "./types";

/**
 * Context provided by the spreadsheet engine so the evaluator
 * can look up cell values without knowing the sheet internals.
 */
export interface EvalContext {
  getCell: (row: number, col: number) => RuntimeValue;
  currentRow: number;
  currentCol: number;
}

// ── Helpers ─────────────────────────────────────

function mkNum(value: number): RuntimeValue {
  return { kind: "number", value };
}

function mkStr(value: string): RuntimeValue {
  return { kind: "string", value };
}

function mkBool(value: boolean): RuntimeValue {
  return { kind: "boolean", value };
}

function mkError(code: ErrorCode, message: string): RuntimeValue {
  return { kind: "error", code, message };
}

/** Coerce a RuntimeValue to a number. Blanks become 0, booleans become 0/1. */
function toNumber(v: RuntimeValue): number | null {
  switch (v.kind) {
    case "number": return v.value;
    case "blank": return 0;
    case "boolean": return v.value ? 1 : 0;
    case "string": {
      const n = Number(v.value);
      return isNaN(n) ? null : n;
    }
    case "error": return null;
  }
}

/** Expand a range reference into an array of RuntimeValues. */
function expandRange(node: RangeRefNode, ctx: EvalContext): RuntimeValue[] {
  const values: RuntimeValue[] = [];
  const r1 = Math.min(node.start.row, node.end.row);
  const r2 = Math.max(node.start.row, node.end.row);
  const c1 = Math.min(node.start.col, node.end.col);
  const c2 = Math.max(node.start.col, node.end.col);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      values.push(ctx.getCell(r, c));
    }
  }
  return values;
}

/** Flatten args — ranges are expanded, scalars stay as-is. */
function flattenArgs(args: FormulaNode[], ctx: EvalContext): RuntimeValue[] {
  const result: RuntimeValue[] = [];
  for (const arg of args) {
    if (arg.kind === "RangeRef") {
      result.push(...expandRange(arg, ctx));
    } else {
      result.push(evaluate(arg, ctx));
    }
  }
  return result;
}

/** Collect numeric values from flattened args, skipping blanks and strings. */
function collectNumbers(values: RuntimeValue[]): number[] | RuntimeValue {
  const nums: number[] = [];
  for (const v of values) {
    if (v.kind === "error") return v; // propagate errors
    if (v.kind === "number") nums.push(v.value);
    else if (v.kind === "boolean") nums.push(v.value ? 1 : 0);
    // blanks and strings are silently skipped in aggregation
  }
  return nums;
}

// ── Built-in functions ──────────────────────────

type BuiltinFn = (args: FormulaNode[], ctx: EvalContext) => RuntimeValue;

const builtins: Record<string, BuiltinFn> = {
  SUM(args, ctx) {
    const vals = flattenArgs(args, ctx);
    const nums = collectNumbers(vals);
    if (!Array.isArray(nums)) return nums;
    return mkNum(nums.reduce((a, b) => a + b, 0));
  },

  AVERAGE(args, ctx) {
    const vals = flattenArgs(args, ctx);
    const nums = collectNumbers(vals);
    if (!Array.isArray(nums)) return nums;
    if (nums.length === 0) return mkError("DIV0", "AVERAGE of empty set");
    return mkNum(nums.reduce((a, b) => a + b, 0) / nums.length);
  },

  COUNT(args, ctx) {
    const vals = flattenArgs(args, ctx);
    let count = 0;
    for (const v of vals) {
      if (v.kind === "number") count++;
    }
    return mkNum(count);
  },

  COUNTA(args, ctx) {
    const vals = flattenArgs(args, ctx);
    let count = 0;
    for (const v of vals) {
      if (v.kind !== "blank") count++;
    }
    return mkNum(count);
  },

  MIN(args, ctx) {
    const vals = flattenArgs(args, ctx);
    const nums = collectNumbers(vals);
    if (!Array.isArray(nums)) return nums;
    if (nums.length === 0) return mkNum(0);
    return mkNum(Math.min(...nums));
  },

  MAX(args, ctx) {
    const vals = flattenArgs(args, ctx);
    const nums = collectNumbers(vals);
    if (!Array.isArray(nums)) return nums;
    if (nums.length === 0) return mkNum(0);
    return mkNum(Math.max(...nums));
  },

  ABS(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "ABS requires 1 argument");
    const v = evaluate(args[0], ctx);
    const n = toNumber(v);
    if (n === null) return mkError("VALUE", "ABS: non-numeric argument");
    return mkNum(Math.abs(n));
  },

  ROUND(args, ctx) {
    if (args.length < 1 || args.length > 2) return mkError("VALUE", "ROUND requires 1-2 arguments");
    const v = evaluate(args[0], ctx);
    const n = toNumber(v);
    if (n === null) return mkError("VALUE", "ROUND: non-numeric argument");
    let digits = 0;
    if (args.length === 2) {
      const d = toNumber(evaluate(args[1], ctx));
      if (d === null) return mkError("VALUE", "ROUND: non-numeric digits");
      digits = Math.round(d);
    }
    const factor = Math.pow(10, digits);
    return mkNum(Math.round(n * factor) / factor);
  },

  IF(args, ctx) {
    if (args.length < 2 || args.length > 3) return mkError("VALUE", "IF requires 2-3 arguments");
    const cond = evaluate(args[0], ctx);
    let truthful = false;
    switch (cond.kind) {
      case "boolean": truthful = cond.value; break;
      case "number": truthful = cond.value !== 0; break;
      case "string": truthful = cond.value.length > 0; break;
      case "blank": truthful = false; break;
      case "error": return cond;
    }
    if (truthful) {
      return evaluate(args[1], ctx);
    } else {
      return args.length === 3 ? evaluate(args[2], ctx) : mkBool(false);
    }
  },

  AND(args, ctx) {
    const vals = flattenArgs(args, ctx);
    for (const v of vals) {
      if (v.kind === "error") return v;
      const n = toNumber(v);
      if (n === null) return mkError("VALUE", "AND: non-numeric argument");
      if (n === 0) return mkBool(false);
    }
    return mkBool(true);
  },

  OR(args, ctx) {
    const vals = flattenArgs(args, ctx);
    for (const v of vals) {
      if (v.kind === "error") return v;
      const n = toNumber(v);
      if (n === null) return mkError("VALUE", "OR: non-numeric argument");
      if (n !== 0) return mkBool(true);
    }
    return mkBool(false);
  },

  NOT(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "NOT requires 1 argument");
    const v = evaluate(args[0], ctx);
    if (v.kind === "error") return v;
    const n = toNumber(v);
    if (n === null) return mkError("VALUE", "NOT: non-numeric argument");
    return mkBool(n === 0);
  },

  CONCAT(args, ctx) {
    const vals = flattenArgs(args, ctx);
    let result = "";
    for (const v of vals) {
      if (v.kind === "error") return v;
      switch (v.kind) {
        case "number": result += String(v.value); break;
        case "string": result += v.value; break;
        case "boolean": result += v.value ? "TRUE" : "FALSE"; break;
        case "blank": break;
      }
    }
    return mkStr(result);
  },

  LEN(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "LEN requires 1 argument");
    const v = evaluate(args[0], ctx);
    if (v.kind === "string") return mkNum(v.value.length);
    if (v.kind === "blank") return mkNum(0);
    if (v.kind === "error") return v;
    return mkNum(String(v.kind === "number" ? v.value : v.kind === "boolean" ? (v.value ? "TRUE" : "FALSE") : "").length);
  },

  INT(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "INT requires 1 argument");
    const v = evaluate(args[0], ctx);
    const n = toNumber(v);
    if (n === null) return mkError("VALUE", "INT: non-numeric argument");
    return mkNum(Math.floor(n));
  },

  MOD(args, ctx) {
    if (args.length !== 2) return mkError("VALUE", "MOD requires 2 arguments");
    const a = toNumber(evaluate(args[0], ctx));
    const b = toNumber(evaluate(args[1], ctx));
    if (a === null || b === null) return mkError("VALUE", "MOD: non-numeric argument");
    if (b === 0) return mkError("DIV0", "MOD: division by zero");
    return mkNum(a - b * Math.floor(a / b));
  },

  POWER(args, ctx) {
    if (args.length !== 2) return mkError("VALUE", "POWER requires 2 arguments");
    const base = toNumber(evaluate(args[0], ctx));
    const exp = toNumber(evaluate(args[1], ctx));
    if (base === null || exp === null) return mkError("VALUE", "POWER: non-numeric argument");
    return mkNum(Math.pow(base, exp));
  },

  SQRT(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "SQRT requires 1 argument");
    const v = evaluate(args[0], ctx);
    const n = toNumber(v);
    if (n === null) return mkError("VALUE", "SQRT: non-numeric argument");
    if (n < 0) return mkError("VALUE", "SQRT: negative argument");
    return mkNum(Math.sqrt(n));
  },

  PI(args, _ctx) {
    if (args.length !== 0) return mkError("VALUE", "PI takes no arguments");
    return mkNum(Math.PI);
  },

  UPPER(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "UPPER requires 1 argument");
    const v = evaluate(args[0], ctx);
    if (v.kind === "error") return v;
    if (v.kind === "string") return mkStr(v.value.toUpperCase());
    if (v.kind === "blank") return mkStr("");
    return mkError("VALUE", "UPPER: expected string");
  },

  LOWER(args, ctx) {
    if (args.length !== 1) return mkError("VALUE", "LOWER requires 1 argument");
    const v = evaluate(args[0], ctx);
    if (v.kind === "error") return v;
    if (v.kind === "string") return mkStr(v.value.toLowerCase());
    if (v.kind === "blank") return mkStr("");
    return mkError("VALUE", "LOWER: expected string");
  },
};

// Aliases
builtins.AVG = builtins.AVERAGE;
builtins.CONCATENATE = builtins.CONCAT;

// ── Main evaluator ──────────────────────────────

export function evaluate(node: FormulaNode, ctx: EvalContext): RuntimeValue {
  switch (node.kind) {
    case "NumberLiteral":
      return mkNum(node.value);

    case "StringLiteral":
      return mkStr(node.value);

    case "BooleanLiteral":
      return mkBool(node.value);

    case "CellRef":
      return ctx.getCell(node.row, node.col);

    case "RangeRef":
      // A bare range in a non-aggregation context returns the top-left value
      return ctx.getCell(node.start.row, node.start.col);

    case "UnaryOp": {
      const arg = evaluate(node.argument, ctx);
      if (arg.kind === "error") return arg;
      const n = toNumber(arg);
      if (n === null) return mkError("VALUE", `Unary ${node.op}: non-numeric operand`);
      return mkNum(node.op === "-" ? -n : n);
    }

    case "BinaryOp": {
      const left = evaluate(node.left, ctx);
      const right = evaluate(node.right, ctx);
      if (left.kind === "error") return left;
      if (right.kind === "error") return right;
      return evalBinaryOp(node.op, left, right);
    }

    case "FunctionCall": {
      const fn = builtins[node.name];
      if (!fn) return mkError("NAME", `Unknown function: ${node.name}`);
      return fn(node.args, ctx);
    }
  }
}

function evalBinaryOp(op: string, left: RuntimeValue, right: RuntimeValue): RuntimeValue {
  // String concatenation with &
  // (not in the tokenizer yet, but handle it if it appears)

  const lNum = toNumber(left);
  const rNum = toNumber(right);

  // Comparison operators work on numbers and strings
  switch (op) {
    case "=":
      return mkBool(runtimeEquals(left, right));
    case "<>":
      return mkBool(!runtimeEquals(left, right));
    case "<":
      if (lNum !== null && rNum !== null) return mkBool(lNum < rNum);
      if (left.kind === "string" && right.kind === "string") return mkBool(left.value < right.value);
      return mkError("VALUE", "Cannot compare these types");
    case ">":
      if (lNum !== null && rNum !== null) return mkBool(lNum > rNum);
      if (left.kind === "string" && right.kind === "string") return mkBool(left.value > right.value);
      return mkError("VALUE", "Cannot compare these types");
    case "<=":
      if (lNum !== null && rNum !== null) return mkBool(lNum <= rNum);
      if (left.kind === "string" && right.kind === "string") return mkBool(left.value <= right.value);
      return mkError("VALUE", "Cannot compare these types");
    case ">=":
      if (lNum !== null && rNum !== null) return mkBool(lNum >= rNum);
      if (left.kind === "string" && right.kind === "string") return mkBool(left.value >= right.value);
      return mkError("VALUE", "Cannot compare these types");
  }

  // Arithmetic operators require numeric operands
  if (lNum === null) return mkError("VALUE", "Left operand is not numeric");
  if (rNum === null) return mkError("VALUE", "Right operand is not numeric");

  switch (op) {
    case "+": return mkNum(lNum + rNum);
    case "-": return mkNum(lNum - rNum);
    case "*": return mkNum(lNum * rNum);
    case "/":
      if (rNum === 0) return mkError("DIV0", "Division by zero");
      return mkNum(lNum / rNum);
    case "^": return mkNum(Math.pow(lNum, rNum));
    default:
      return mkError("VALUE", `Unknown operator: ${op}`);
  }
}

function runtimeEquals(a: RuntimeValue, b: RuntimeValue): boolean {
  if (a.kind === "blank" && b.kind === "blank") return true;
  if (a.kind === "blank") {
    // blank == 0 and blank == ""
    if (b.kind === "number") return b.value === 0;
    if (b.kind === "string") return b.value === "";
    return false;
  }
  if (b.kind === "blank") {
    if (a.kind === "number") return a.value === 0;
    if (a.kind === "string") return a.value === "";
    return false;
  }
  if (a.kind !== b.kind) {
    // Try numeric comparison
    const an = toNumber(a);
    const bn = toNumber(b);
    if (an !== null && bn !== null) return an === bn;
    return false;
  }
  switch (a.kind) {
    case "number": return a.value === (b as any).value;
    case "string": return a.value.toLowerCase() === (b as any).value.toLowerCase();
    case "boolean": return a.value === (b as any).value;
    default: return false;
  }
}
