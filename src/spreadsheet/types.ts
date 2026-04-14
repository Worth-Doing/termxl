import type { FormulaNode, RuntimeValue, ErrorCode } from "../formula/types";

export interface CellAddress {
  row: number; // 1-based
  col: number; // 1-based
}

export type CellAddressKey = string; // e.g. "A1", "B2"

export interface Cell {
  row: number;
  col: number;
  raw: string;            // What the user typed
  parsed: FormulaNode | null;
  value: RuntimeValue;
  display: string;        // Rendered text for grid
  dependencies: Set<CellAddressKey>;
  dependents: Set<CellAddressKey>;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Map<CellAddressKey, Cell>;
  maxRow: number;
  maxCol: number;
}

export interface Workbook {
  name: string;
  sheets: Sheet[];
  activeSheetIndex: number;
  filePath: string | null;
  dirty: boolean; // unsaved changes
}

export interface ViewportState {
  startRow: number;
  startCol: number;
  visibleRows: number;
  visibleCols: number;
  activeRow: number;
  activeCol: number;
  mode: "NAVIGATION" | "EDIT" | "FORMULA";
  editBuffer: string;
}
