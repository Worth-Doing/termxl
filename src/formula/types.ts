// ── Token Types ─────────────────────────────────
export type TokenType =
  | "NUMBER" | "STRING" | "BOOLEAN" | "CELL" | "IDENT"
  | "COLON" | "COMMA" | "LPAREN" | "RPAREN"
  | "PLUS" | "MINUS" | "STAR" | "SLASH" | "CARET"
  | "GT" | "LT" | "GTE" | "LTE" | "EQ" | "NEQ"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// ── AST Node Types ──────────────────────────────
export type FormulaNode =
  | NumberNode | BooleanNode | StringNode
  | CellRefNode | RangeRefNode
  | UnaryOpNode | BinaryOpNode | FunctionCallNode;

export interface NumberNode { kind: "NumberLiteral"; value: number; }
export interface BooleanNode { kind: "BooleanLiteral"; value: boolean; }
export interface StringNode { kind: "StringLiteral"; value: string; }
export interface CellRefNode { kind: "CellRef"; row: number; col: number; label: string; }
export interface RangeRefNode { kind: "RangeRef"; start: { row: number; col: number }; end: { row: number; col: number }; label: string; }
export interface UnaryOpNode { kind: "UnaryOp"; op: "+" | "-"; argument: FormulaNode; }
export interface BinaryOpNode { kind: "BinaryOp"; op: string; left: FormulaNode; right: FormulaNode; }
export interface FunctionCallNode { kind: "FunctionCall"; name: string; args: FormulaNode[]; }

// ── Runtime Values ──────────────────────────────
export type RuntimeValue =
  | { kind: "blank" }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "error"; code: ErrorCode; message: string };

export type ErrorCode = "REF" | "NAME" | "VALUE" | "DIV0" | "CYCLE" | "PARSE";

export function errorDisplay(code: ErrorCode): string {
  const map: Record<ErrorCode, string> = {
    REF: "#REF!", NAME: "#NAME?", VALUE: "#VALUE!",
    DIV0: "#DIV/0!", CYCLE: "#CYCLE!", PARSE: "#PARSE!",
  };
  return map[code];
}

// ── Cell Address Helpers ────────────────────────
export function colToLabel(col: number): string {
  let label = "";
  let c = col;
  while (c > 0) {
    c--;
    label = String.fromCharCode(65 + (c % 26)) + label;
    c = Math.floor(c / 26);
  }
  return label;
}

export function labelToCol(label: string): number {
  let col = 0;
  for (let i = 0; i < label.length; i++) {
    col = col * 26 + (label.charCodeAt(i) - 64);
  }
  return col;
}

export function cellKey(row: number, col: number): string {
  return `${colToLabel(col)}${row}`;
}

export function parseCellLabel(label: string): { row: number; col: number } | null {
  const match = label.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { col: labelToCol(match[1]), row: parseInt(match[2], 10) };
}
