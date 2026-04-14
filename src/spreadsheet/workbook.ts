import { Workbook, Sheet } from "./types";
import { createSheet } from "./sheet";

export function createWorkbook(name: string = "Book1"): Workbook {
  return {
    name,
    sheets: [createSheet("Sheet1")],
    activeSheetIndex: 0,
    filePath: null,
    dirty: false,
  };
}

export function activeSheet(wb: Workbook): Sheet {
  return wb.sheets[wb.activeSheetIndex];
}

export function addSheet(wb: Workbook, name?: string): Sheet {
  const sheet = createSheet(name || `Sheet${wb.sheets.length + 1}`);
  wb.sheets.push(sheet);
  return sheet;
}
