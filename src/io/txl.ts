import * as fs from "node:fs";
import { Workbook } from "../spreadsheet/types";
import { createWorkbook } from "../spreadsheet/workbook";
import { createSheet, setCellRaw } from "../spreadsheet/sheet";
import { parseCellLabel } from "../formula/types";

export function saveWorkbook(wb: Workbook, path: string): void {
  const data = {
    name: wb.name,
    sheets: wb.sheets.map(s => ({
      name: s.name,
      cells: Object.fromEntries(
        Array.from(s.cells.entries())
          .filter(([, cell]) => cell.raw !== "")
          .map(([key, cell]) => [key, cell.raw])
      ),
    })),
  };
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  wb.dirty = false;
  wb.filePath = path;
}

export function loadWorkbook(path: string): Workbook {
  const content = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(content);
  const wb = createWorkbook(data.name || "Workbook");
  wb.filePath = path;
  wb.sheets = [];

  for (const sheetData of data.sheets || []) {
    const sheet = createSheet(sheetData.name || "Sheet");
    for (const [key, raw] of Object.entries(sheetData.cells || {})) {
      const parsed = parseCellLabel(key);
      if (parsed) {
        setCellRaw(sheet, parsed.row, parsed.col, raw as string);
      }
    }
    wb.sheets.push(sheet);
  }

  if (wb.sheets.length === 0) {
    wb.sheets.push(createSheet("Sheet1"));
  }

  wb.dirty = false;
  return wb;
}
