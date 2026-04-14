import type { Workbook, Sheet, ViewportState } from "../spreadsheet/types";
import { getCell, getCellValue } from "../spreadsheet/sheet";
import { colToLabel, cellKey } from "../formula/types";

const ESC = "\x1b";
const c = {
  reset: `${ESC}[0m`, bold: `${ESC}[1m`, dim: `${ESC}[2m`, underline: `${ESC}[4m`, inverse: `${ESC}[7m`,
  cyan: `${ESC}[36m`, green: `${ESC}[32m`, yellow: `${ESC}[33m`, blue: `${ESC}[34m`,
  magenta: `${ESC}[35m`, red: `${ESC}[31m`, white: `${ESC}[37m`, gray: `${ESC}[90m`,
  bgBlue: `${ESC}[44m`, bgCyan: `${ESC}[46m`, bgGray: `${ESC}[100m`,
  bgWhite: `${ESC}[47m`, bgGreen: `${ESC}[42m`,
};

const CELL_WIDTH = 14; // chars per cell
const ROW_HEADER_WIDTH = 5;

export function enterAltScreen(): void {
  process.stdout.write(`${ESC}[?1049h${ESC}[?25l`);
}

export function exitAltScreen(): void {
  process.stdout.write(`${ESC}[?25h${ESC}[?1049l`);
}

export function renderSpreadsheet(wb: Workbook, sheet: Sheet, vp: ViewportState): string {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const lines: string[] = [];

  // Calculate visible columns based on terminal width
  vp.visibleCols = Math.max(2, Math.floor((cols - ROW_HEADER_WIDTH - 2) / CELL_WIDTH));
  vp.visibleRows = Math.max(3, rows - 5); // 5 = topbar + formulabar + colheader + statusbar + 1

  // ── Top Bar ──────────────────────────────────
  const saveStatus = wb.dirty ? `${c.yellow}\u25cf Unsaved${c.reset}` : `${c.green}\u25cf Saved${c.reset}`;
  const sheetName = sheet.name;
  const topLeft = `${c.cyan}${c.bold} termxl${c.reset} ${c.dim}\u2502${c.reset} ${c.bold}${wb.name}${c.reset}`;
  const topRight = `${c.bold}${sheetName}${c.reset} ${c.dim}\u2502${c.reset} ${saveStatus} `;
  const topPad = Math.max(0, cols - stripAnsi(topLeft).length - stripAnsi(topRight).length);
  lines.push(topLeft + " ".repeat(topPad) + topRight);

  // ── Formula Bar ──────────────────────────────
  const activeLabel = `${colToLabel(vp.activeCol)}${vp.activeRow}`;
  const activeCell = getCell(sheet, vp.activeRow, vp.activeCol);
  const rawContent = activeCell?.raw || "";
  const formulaDisplay = vp.mode === "EDIT" || vp.mode === "FORMULA" ? vp.editBuffer : rawContent;

  const nameBox = `${c.dim} ${activeLabel.padEnd(6)}${c.reset}`;
  const fxLabel = `${c.yellow}${c.bold}fx${c.reset}`;
  const fxContent = ` ${formulaDisplay}`;
  const fbPad = Math.max(0, cols - stripAnsi(nameBox).length - stripAnsi(fxLabel).length - fxContent.length - 3);
  lines.push(`${nameBox}${c.dim}\u2502${c.reset} ${fxLabel}${fxContent}${" ".repeat(fbPad)}`);

  // ── Separator ────────────────────────────────
  lines.push(c.dim + "\u2500".repeat(cols) + c.reset);

  // ── Column Headers ───────────────────────────
  let colHeader = c.bold + " ".repeat(ROW_HEADER_WIDTH) + c.dim + "\u2502" + c.reset;
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    const colNum = vp.startCol + ci;
    const label = colToLabel(colNum);
    const isActive = colNum === vp.activeCol;
    const padded = centerPad(label, CELL_WIDTH - 1);
    if (isActive) {
      colHeader += `${c.cyan}${c.bold}${padded}${c.reset}${c.dim}\u2502${c.reset}`;
    } else {
      colHeader += `${c.dim}${padded}\u2502${c.reset}`;
    }
  }
  lines.push(colHeader);

  // ── Separator ────────────────────────────────
  let sepLine = c.dim + "\u2500".repeat(ROW_HEADER_WIDTH) + "\u253c";
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    sepLine += "\u2500".repeat(CELL_WIDTH - 1) + "\u253c";
  }
  lines.push(sepLine + c.reset);

  // ── Grid Rows ────────────────────────────────
  for (let ri = 0; ri < vp.visibleRows; ri++) {
    const rowNum = vp.startRow + ri;
    const isActiveRow = rowNum === vp.activeRow;

    // Row header
    let rowLine = "";
    if (isActiveRow) {
      rowLine += `${c.cyan}${c.bold}${String(rowNum).padStart(ROW_HEADER_WIDTH - 1)} ${c.reset}${c.dim}\u2502${c.reset}`;
    } else {
      rowLine += `${c.dim}${String(rowNum).padStart(ROW_HEADER_WIDTH - 1)} \u2502${c.reset}`;
    }

    // Cells
    for (let ci = 0; ci < vp.visibleCols; ci++) {
      const colNum = vp.startCol + ci;
      const isActive = rowNum === vp.activeRow && colNum === vp.activeCol;

      const cell = getCell(sheet, rowNum, colNum);
      let display = "";

      if (isActive && (vp.mode === "EDIT" || vp.mode === "FORMULA")) {
        display = vp.editBuffer;
      } else {
        display = cell?.display || "";
      }

      // Truncate and pad
      const truncated = display.slice(0, CELL_WIDTH - 3);

      // Alignment: numbers right, text left, errors left
      let cellContent: string;
      const val = cell?.value;
      if (val && val.kind === "number") {
        cellContent = truncated.padStart(CELL_WIDTH - 2);
      } else if (val && val.kind === "error") {
        cellContent = `${c.red}${truncated.padEnd(CELL_WIDTH - 2)}${c.reset}`;
      } else {
        cellContent = truncated.padEnd(CELL_WIDTH - 2);
      }

      if (isActive) {
        rowLine += `${c.inverse}${c.cyan} ${cellContent} ${c.reset}${c.dim}\u2502${c.reset}`;
      } else {
        rowLine += ` ${cellContent} ${c.dim}\u2502${c.reset}`;
      }
    }

    lines.push(rowLine);
  }

  // ── Status Bar ───────────────────────────────
  lines.push(c.dim + "\u2500".repeat(cols) + c.reset);

  const modeDisplay = vp.mode === "NAVIGATION" ? `${c.green}NAV${c.reset}` : vp.mode === "EDIT" ? `${c.yellow}EDIT${c.reset}` : `${c.magenta}FORMULA${c.reset}`;
  const cellVal = activeCell?.value;
  const valDisplay = cellVal?.kind === "number" ? String(cellVal.value) : cellVal?.kind === "string" ? `"${cellVal.value}"` : cellVal?.kind === "error" ? `${c.red}${activeCell?.display}${c.reset}` : cellVal?.kind === "boolean" ? String(cellVal.value) : "";
  const typeDisplay = cellVal?.kind || "blank";

  const statusLeft = ` ${c.dim}Value:${c.reset} ${valDisplay}  ${c.dim}Type:${c.reset} ${typeDisplay}  ${c.dim}Mode:${c.reset} ${modeDisplay}`;
  const statusRight = `${c.dim}Arrows:move  Enter:edit  =:formula  Esc:cancel  Ctrl+S:save  Ctrl+Q:quit${c.reset} `;
  const statusPad = Math.max(0, cols - stripAnsi(statusLeft).length - stripAnsi(statusRight).length);
  lines.push(statusLeft + " ".repeat(statusPad) + statusRight);

  return `${ESC}[2J${ESC}[H` + lines.join("\n");
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function centerPad(s: string, width: number): string {
  const pad = Math.max(0, width - s.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return " ".repeat(left) + s + " ".repeat(right);
}
