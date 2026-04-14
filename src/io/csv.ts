import { Sheet } from "../spreadsheet/types";
import { createSheet, setCellRaw } from "../spreadsheet/sheet";

export function importCSV(content: string, name: string = "Sheet1"): Sheet {
  const sheet = createSheet(name);
  const lines = content.split("\n");

  for (let r = 0; r < lines.length; r++) {
    const row = parseCSVLine(lines[r]);
    for (let c = 0; c < row.length; c++) {
      const val = row[c].trim();
      if (val) setCellRaw(sheet, r + 1, c + 1, val);
    }
  }
  return sheet;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function exportCSV(sheet: Sheet): string {
  const lines: string[] = [];
  for (let r = 1; r <= Math.max(sheet.maxRow, 1); r++) {
    const row: string[] = [];
    for (let c = 1; c <= Math.max(sheet.maxCol, 1); c++) {
      const cell = sheet.cells.get(`${String.fromCharCode(64 + c)}${r}`);
      const val = cell?.display || "";
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        row.push(`"${val.replace(/"/g, '""')}"`);
      } else {
        row.push(val);
      }
    }
    lines.push(row.join(","));
  }
  return lines.join("\n");
}
