import { Sheet, Cell, CellAddressKey } from "./types";
import { cellKey, parseCellLabel, RuntimeValue, colToLabel, errorDisplay } from "../formula/types";
import { tokenize } from "../formula/tokenizer";
import { parse } from "../formula/parser";
import { evaluate, EvalContext } from "../formula/evaluator";

export function createSheet(name: string): Sheet {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    cells: new Map(),
    maxRow: 0,
    maxCol: 0,
  };
}

export function getCell(sheet: Sheet, row: number, col: number): Cell | undefined {
  return sheet.cells.get(cellKey(row, col));
}

export function getCellValue(sheet: Sheet, row: number, col: number): RuntimeValue {
  const cell = getCell(sheet, row, col);
  if (!cell) return { kind: "blank" };
  return cell.value;
}

export function setCellRaw(sheet: Sheet, row: number, col: number, raw: string): void {
  const key = cellKey(row, col);

  // Get or create cell
  let cell = sheet.cells.get(key);
  if (!cell) {
    cell = {
      row, col, raw: "", parsed: null,
      value: { kind: "blank" }, display: "",
      dependencies: new Set(), dependents: new Set(),
    };
    sheet.cells.set(key, cell);
  }

  // Remove old dependencies
  for (const dep of cell.dependencies) {
    const depCell = sheet.cells.get(dep);
    if (depCell) depCell.dependents.delete(key);
  }
  cell.dependencies.clear();

  // Update raw
  cell.raw = raw;

  // Track max extents
  if (row > sheet.maxRow) sheet.maxRow = row;
  if (col > sheet.maxCol) sheet.maxCol = col;

  // Parse and evaluate
  if (raw === "") {
    cell.parsed = null;
    cell.value = { kind: "blank" };
    cell.display = "";
  } else if (raw.startsWith("=")) {
    // Formula
    try {
      const tokens = tokenize(raw.slice(1)); // skip '='
      const ast = parse(tokens);
      cell.parsed = ast;

      // Extract dependencies from AST
      extractDeps(ast, cell.dependencies);

      // Register as dependent
      for (const dep of cell.dependencies) {
        let depCell = sheet.cells.get(dep);
        if (!depCell) {
          const parsed = parseCellLabel(dep);
          if (parsed) {
            depCell = {
              row: parsed.row, col: parsed.col, raw: "", parsed: null,
              value: { kind: "blank" }, display: "",
              dependencies: new Set(), dependents: new Set(),
            };
            sheet.cells.set(dep, depCell);
          }
        }
        if (depCell) depCell.dependents.add(key);
      }

      // Evaluate
      evaluateCell(sheet, cell);
    } catch (err: any) {
      cell.parsed = null;
      cell.value = { kind: "error", code: "PARSE", message: err.message };
      cell.display = "#PARSE!";
    }
  } else {
    // Literal value
    cell.parsed = null;
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== "") {
      cell.value = { kind: "number", value: num };
      cell.display = String(num);
    } else if (raw.toUpperCase() === "TRUE") {
      cell.value = { kind: "boolean", value: true };
      cell.display = "TRUE";
    } else if (raw.toUpperCase() === "FALSE") {
      cell.value = { kind: "boolean", value: false };
      cell.display = "FALSE";
    } else {
      cell.value = { kind: "string", value: raw };
      cell.display = raw;
    }
  }

  // Recalculate dependents
  recalcDependents(sheet, key);
}

function evaluateCell(sheet: Sheet, cell: Cell): void {
  if (!cell.parsed) return;

  const ctx: EvalContext = {
    getCell: (r, c) => getCellValue(sheet, r, c),
    currentRow: cell.row,
    currentCol: cell.col,
  };

  cell.value = evaluate(cell.parsed, ctx);

  // Update display
  switch (cell.value.kind) {
    case "number":
      cell.display = cell.value.value % 1 === 0
        ? String(cell.value.value)
        : cell.value.value.toFixed(2);
      break;
    case "string":
      cell.display = cell.value.value;
      break;
    case "boolean":
      cell.display = cell.value.value ? "TRUE" : "FALSE";
      break;
    case "error":
      cell.display = errorDisplay(cell.value.code);
      break;
    case "blank":
      cell.display = "";
      break;
  }
}

function extractDeps(node: any, deps: Set<CellAddressKey>): void {
  if (!node) return;
  if (node.kind === "CellRef") {
    deps.add(cellKey(node.row, node.col));
  } else if (node.kind === "RangeRef") {
    for (let r = node.start.row; r <= node.end.row; r++) {
      for (let c = node.start.col; c <= node.end.col; c++) {
        deps.add(cellKey(r, c));
      }
    }
  } else if (node.kind === "BinaryOp") {
    extractDeps(node.left, deps);
    extractDeps(node.right, deps);
  } else if (node.kind === "UnaryOp") {
    extractDeps(node.argument, deps);
  } else if (node.kind === "FunctionCall") {
    for (const arg of node.args) extractDeps(arg, deps);
  }
}

function recalcDependents(sheet: Sheet, changedKey: CellAddressKey, visited: Set<string> = new Set()): void {
  if (visited.has(changedKey)) return; // cycle guard
  visited.add(changedKey);

  const cell = sheet.cells.get(changedKey);
  if (!cell) return;

  for (const depKey of cell.dependents) {
    const depCell = sheet.cells.get(depKey);
    if (!depCell) continue;

    if (visited.has(depKey)) {
      // Cycle detected
      depCell.value = { kind: "error", code: "CYCLE", message: "Circular reference" };
      depCell.display = "#CYCLE!";
      continue;
    }

    evaluateCell(sheet, depCell);
    recalcDependents(sheet, depKey, visited);
  }
}

export function deleteCell(sheet: Sheet, row: number, col: number): void {
  setCellRaw(sheet, row, col, "");
  sheet.cells.delete(cellKey(row, col));
}
