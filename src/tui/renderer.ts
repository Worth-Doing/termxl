import type { Workbook, Sheet, ViewportState } from "../spreadsheet/types";
import { getCell, getCellValue } from "../spreadsheet/sheet";
import { colToLabel, cellKey } from "../formula/types";

const ESC = "\x1b";

// ── Professional Spreadsheet Color System ─────────────────────────────────
const COLORS = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  inverse: `${ESC}[7m`,

  // Title bar
  titleBg: `${ESC}[44m`,
  titleFg: `${ESC}[97m`,
  titleBrand: `${ESC}[97m${ESC}[1m`,

  // Formula bar
  nameBoxBg: `${ESC}[48;5;238m`,
  nameBoxFg: `${ESC}[97m${ESC}[1m`,
  fxLabel: `${ESC}[33m${ESC}[1m`,
  fxContent: `${ESC}[37m`,
  formulaBarBg: `${ESC}[48;5;235m`,
  formulaBarFg: `${ESC}[37m`,

  // Headers
  headerBg: `${ESC}[48;5;236m`,
  headerFg: `${ESC}[97m${ESC}[1m`,
  activeHeaderBg: `${ESC}[48;5;24m`,
  activeHeaderFg: `${ESC}[36m${ESC}[1m`,

  // Grid structural
  gridLine: `${ESC}[38;5;240m`,
  gridLineDim: `${ESC}[38;5;237m`,

  // Cell content
  cellDefault: `${ESC}[37m`,
  cellNumber: `${ESC}[38;5;114m`,
  cellText: `${ESC}[37m`,
  cellBoolean: `${ESC}[38;5;75m`,
  cellError: `${ESC}[91m${ESC}[1m`,
  cellFormula: `${ESC}[35m`,

  // Active cell
  activeCellBg: `${ESC}[46m`,
  activeCellFg: `${ESC}[97m${ESC}[1m`,

  // Crosshair highlight
  crosshairBg: `${ESC}[48;5;236m`,

  // Alternating rows
  evenRowBg: `${ESC}[48;5;234m`,

  // Row numbers
  rowNumDim: `${ESC}[38;5;245m`,
  rowNumActive: `${ESC}[36m${ESC}[1m`,

  // Status bar
  statusBg: `${ESC}[48;5;235m`,
  statusFg: `${ESC}[37m`,
  statusDim: `${ESC}[38;5;245m`,
  statusKey: `${ESC}[38;5;75m`,

  // Mode badges
  modeNav: `${ESC}[42m${ESC}[97m${ESC}[1m`,
  modeEdit: `${ESC}[43m${ESC}[30m${ESC}[1m`,
  modeFormula: `${ESC}[45m${ESC}[97m${ESC}[1m`,

  // Save indicator
  unsaved: `${ESC}[33m`,
  saved: `${ESC}[32m`,

  // Cursor
  cursor: `${ESC}[97m${ESC}[1m`,
};

// ── Box Drawing Characters ────────────────────────────────────────────────
const BOX = {
  topLeft: "┏", topRight: "┓", botLeft: "┗", botRight: "┛",
  hBold: "━", vBold: "┃",
  topLeftLight: "┌", topRightLight: "┐", botLeftLight: "└", botRightLight: "┘",
  h: "─", v: "│",
  tDown: "┬", tUp: "┴", tRight: "├", tLeft: "┤", cross: "┼",
  // Rounded corners for formula bar
  rTopLeft: "╭", rTopRight: "╮", rBotLeft: "╰", rBotRight: "╯",
};

// ── Dynamic Cell Width ────────────────────────────────────────────────────
function getCellWidth(termCols: number): number {
  if (termCols > 120) return 16;
  if (termCols < 80) return 12;
  return 14;
}

const ROW_NUM_WIDTH = 6;

// ── Screen Control ────────────────────────────────────────────────────────
export function enterAltScreen(): void {
  process.stdout.write(`${ESC}[?1049h${ESC}[?25l`);
}

export function exitAltScreen(): void {
  process.stdout.write(`${ESC}[?25h${ESC}[?1049l`);
}

// ── Utility Functions ─────────────────────────────────────────────────────
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function centerPad(s: string, width: number): string {
  const len = stripAnsi(s).length;
  const pad = Math.max(0, width - len);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return " ".repeat(left) + s + " ".repeat(right);
}

function rightPad(s: string, width: number): string {
  const len = stripAnsi(s).length;
  return s + " ".repeat(Math.max(0, width - len));
}

function fillLine(content: string, totalWidth: number): string {
  const len = stripAnsi(content).length;
  return content + " ".repeat(Math.max(0, totalWidth - len));
}

// ── Main Renderer ─────────────────────────────────────────────────────────
export function renderSpreadsheet(wb: Workbook, sheet: Sheet, vp: ViewportState): string {
  const termCols = process.stdout.columns || 80;
  const termRows = process.stdout.rows || 24;
  const cellW = getCellWidth(termCols);
  const lines: string[] = [];

  // Calculate visible area
  vp.visibleCols = Math.max(2, Math.floor((termCols - ROW_NUM_WIDTH - 2) / cellW));
  vp.visibleRows = Math.max(3, termRows - 9); // reserves room for bars

  const gridWidth = ROW_NUM_WIDTH + 1 + vp.visibleCols * cellW + 1;
  const fullWidth = Math.max(gridWidth, termCols);

  // ════════════════════════════════════════════════════════════════════════
  // 1. TITLE BAR — premium solid background
  // ════════════════════════════════════════════════════════════════════════
  const titleBorder = `  ${COLORS.gridLine}${BOX.topLeft}${BOX.hBold.repeat(fullWidth - 4)}${BOX.topRight}${COLORS.reset}`;
  lines.push(titleBorder);

  const saveIndicator = wb.dirty
    ? `${COLORS.unsaved}\u25cf Unsaved${COLORS.reset}${COLORS.titleBg}${COLORS.titleFg}`
    : `${COLORS.saved}\u25cf Saved${COLORS.reset}${COLORS.titleBg}${COLORS.titleFg}`;
  const titleLeft = `  ${COLORS.titleBrand}termxl${COLORS.reset}${COLORS.titleBg}${COLORS.titleFg}   ${wb.name}`;
  const titleRight = `${sheet.name}    ${saveIndicator}  `;
  const titlePad = Math.max(0, fullWidth - 4 - stripAnsi(titleLeft).length - stripAnsi(titleRight).length);
  const titleLine = `  ${COLORS.gridLine}${BOX.vBold}${COLORS.reset}${COLORS.titleBg}${COLORS.titleFg}${titleLeft}${" ".repeat(titlePad)}${titleRight}${COLORS.reset}${COLORS.gridLine}${BOX.vBold}${COLORS.reset}`;
  lines.push(titleLine);

  const titleBorderBot = `  ${COLORS.gridLine}${BOX.botLeft}${BOX.hBold.repeat(fullWidth - 4)}${BOX.botRight}${COLORS.reset}`;
  lines.push(titleBorderBot);

  // ════════════════════════════════════════════════════════════════════════
  // 2. FORMULA BAR — name box + fx indicator + content
  // ════════════════════════════════════════════════════════════════════════
  const activeLabel = `${colToLabel(vp.activeCol)}${vp.activeRow}`;
  const activeCell = getCell(sheet, vp.activeRow, vp.activeCol);
  const rawContent = activeCell?.raw || "";
  const isEditing = vp.mode === "EDIT" || vp.mode === "FORMULA";
  const formulaDisplay = isEditing ? vp.editBuffer : rawContent;
  const cursorChar = isEditing ? `${COLORS.cursor}\u2588${COLORS.reset}` : "";

  const nameBoxInner = ` ${activeLabel} `;
  const nameBoxPadded = centerPad(nameBoxInner, 6);
  const nameBox = `  ${COLORS.gridLine}${BOX.rTopLeft}${BOX.h} ${COLORS.nameBoxBg}${COLORS.nameBoxFg}${nameBoxPadded}${COLORS.reset} ${COLORS.gridLine}${BOX.rTopRight}${COLORS.reset}  ${COLORS.fxLabel}fx${COLORS.reset} ${COLORS.gridLine}${BOX.v}${COLORS.reset} ${COLORS.fxContent}${formulaDisplay}${cursorChar}${COLORS.reset}`;
  const nameBoxBot = `  ${COLORS.gridLine}${BOX.rBotLeft}${BOX.h.repeat(8)}${BOX.rBotRight}${COLORS.reset}    ${COLORS.gridLine}${BOX.v}${COLORS.reset}`;

  lines.push(nameBox);
  lines.push(nameBoxBot);

  // ════════════════════════════════════════════════════════════════════════
  // 3. COLUMN HEADERS — bold, centered, with grid lines
  // ════════════════════════════════════════════════════════════════════════
  // Top border of header
  let headerTopBorder = `  ${COLORS.gridLine}${BOX.topLeftLight}${BOX.h.repeat(ROW_NUM_WIDTH)}`;
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    headerTopBorder += `${BOX.tDown}${BOX.h.repeat(cellW - 1)}`;
  }
  headerTopBorder += `${BOX.topRightLight}${COLORS.reset}`;
  lines.push(headerTopBorder);

  // Header content
  let headerLine = `  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.headerBg}${" ".repeat(ROW_NUM_WIDTH)}${COLORS.reset}`;
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    const colNum = vp.startCol + ci;
    const label = colToLabel(colNum);
    const isActiveCol = colNum === vp.activeCol;
    const padded = centerPad(label, cellW - 1);
    if (isActiveCol) {
      headerLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.activeHeaderBg}${COLORS.activeHeaderFg}${padded}${COLORS.reset}`;
    } else {
      headerLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.headerBg}${COLORS.headerFg}${padded}${COLORS.reset}`;
    }
  }
  headerLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}`;
  lines.push(headerLine);

  // Header bottom separator
  let headerSep = `  ${COLORS.gridLine}${BOX.tRight}${BOX.h.repeat(ROW_NUM_WIDTH)}`;
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    headerSep += `${BOX.cross}${BOX.h.repeat(cellW - 1)}`;
  }
  headerSep += `${BOX.tLeft}${COLORS.reset}`;
  lines.push(headerSep);

  // ════════════════════════════════════════════════════════════════════════
  // 4. GRID ROWS — proper borders, crosshair, alternating backgrounds
  // ════════════════════════════════════════════════════════════════════════
  for (let ri = 0; ri < vp.visibleRows; ri++) {
    const rowNum = vp.startRow + ri;
    const isActiveRow = rowNum === vp.activeRow;
    const isEvenRow = ri % 2 === 1;

    // Determine row background
    const rowBg = isActiveRow ? COLORS.crosshairBg : isEvenRow ? COLORS.evenRowBg : "";

    // Row number
    let rowLine = "  ";
    const rowNumStr = String(rowNum).padStart(ROW_NUM_WIDTH - 1);
    if (isActiveRow) {
      rowLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}${rowBg}${COLORS.rowNumActive} ${rowNumStr}${COLORS.reset}`;
    } else {
      rowLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}${rowBg}${COLORS.rowNumDim} ${rowNumStr}${COLORS.reset}`;
    }

    // Cells
    for (let ci = 0; ci < vp.visibleCols; ci++) {
      const colNum = vp.startCol + ci;
      const isActive = rowNum === vp.activeRow && colNum === vp.activeCol;
      const isInCrosshair = (rowNum === vp.activeRow || colNum === vp.activeCol) && !isActive;

      const cell = getCell(sheet, rowNum, colNum);
      let display = "";

      if (isActive && isEditing) {
        display = vp.editBuffer;
      } else {
        display = cell?.display || "";
      }

      // Truncate to fit cell
      const maxContent = cellW - 3;
      const truncated = display.length > maxContent ? display.slice(0, maxContent - 1) + "\u2026" : display;

      // Determine alignment and color
      const val = cell?.value;
      let cellContent: string;
      let contentColor = COLORS.cellDefault;

      if (val && val.kind === "number") {
        contentColor = COLORS.cellNumber;
        cellContent = truncated.padStart(cellW - 3);
      } else if (val && val.kind === "error") {
        contentColor = COLORS.cellError;
        cellContent = truncated.padEnd(cellW - 3);
      } else if (val && val.kind === "boolean") {
        contentColor = COLORS.cellBoolean;
        cellContent = centerPad(truncated, cellW - 3);
      } else {
        contentColor = COLORS.cellText;
        cellContent = truncated.padEnd(cellW - 3);
      }

      // Render cell with styling
      if (isActive) {
        // Active cell: bold inverse cyan — must POP
        rowLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.activeCellBg}${COLORS.activeCellFg} ${cellContent} ${COLORS.reset}`;
      } else if (isInCrosshair) {
        // Crosshair: subtle dark background
        rowLine += `${COLORS.gridLineDim}${BOX.v}${COLORS.reset}${COLORS.crosshairBg}${contentColor} ${cellContent} ${COLORS.reset}`;
      } else {
        // Normal cell
        const bg = isEvenRow ? COLORS.evenRowBg : "";
        rowLine += `${COLORS.gridLineDim}${BOX.v}${COLORS.reset}${bg}${contentColor} ${cellContent} ${COLORS.reset}`;
      }
    }

    // Right border
    rowLine += `${COLORS.gridLine}${BOX.v}${COLORS.reset}`;
    lines.push(rowLine);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. GRID BOTTOM BORDER
  // ════════════════════════════════════════════════════════════════════════
  let gridBottom = `  ${COLORS.gridLine}${BOX.botLeftLight}${BOX.h.repeat(ROW_NUM_WIDTH)}`;
  for (let ci = 0; ci < vp.visibleCols; ci++) {
    gridBottom += `${BOX.tUp}${BOX.h.repeat(cellW - 1)}`;
  }
  gridBottom += `${BOX.botRightLight}${COLORS.reset}`;
  lines.push(gridBottom);

  // ════════════════════════════════════════════════════════════════════════
  // 6. STATUS BAR — two-line info bar with rounded border
  // ════════════════════════════════════════════════════════════════════════
  const statusWidth = fullWidth - 4;

  // Status top border
  lines.push(`  ${COLORS.gridLine}${BOX.rTopLeft}${BOX.h.repeat(statusWidth)}${BOX.rTopRight}${COLORS.reset}`);

  // Status line 1: cell info + mode + sheet info
  const cellVal = activeCell?.value;
  const valDisplay = cellVal?.kind === "number"
    ? String(cellVal.value)
    : cellVal?.kind === "string"
      ? `"${cellVal.value}"`
      : cellVal?.kind === "error"
        ? `${COLORS.cellError}${activeCell?.display}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}`
        : cellVal?.kind === "boolean"
          ? String(cellVal.value)
          : "";

  const typeStr = cellVal?.kind || "blank";

  // Mode badge
  let modeBadge: string;
  if (vp.mode === "NAVIGATION") {
    modeBadge = `${COLORS.modeNav} NAV ${COLORS.reset}`;
  } else if (vp.mode === "EDIT") {
    modeBadge = `${COLORS.modeEdit} EDIT ${COLORS.reset}`;
  } else {
    modeBadge = `${COLORS.modeFormula} FORMULA ${COLORS.reset}`;
  }

  const sheetCount = wb.sheets.length;
  const sheetIdx = wb.activeSheetIndex + 1;
  const cellCount = `${sheet.maxRow}\u00d7${sheet.maxCol} cells`;
  const saveStr = wb.dirty
    ? `${COLORS.unsaved}\u25cf Unsaved${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}`
    : `${COLORS.saved}\u25cf Saved${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}`;

  const s1Left = `  ${activeLabel}: ${valDisplay}`;
  const s1Mid = `  ${COLORS.statusDim}${typeStr}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}  ${modeBadge}${COLORS.statusBg}${COLORS.statusFg}  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}  Sheet ${sheetIdx}/${sheetCount}  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}  ${cellCount}  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}  ${saveStr}`;
  const status1Content = s1Left + s1Mid;
  const status1Visible = stripAnsi(status1Content).length;
  const status1Pad = Math.max(0, statusWidth - status1Visible);
  const statusLine1 = `  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}${status1Content}${" ".repeat(status1Pad)}${COLORS.reset}${COLORS.gridLine}${BOX.v}${COLORS.reset}`;
  lines.push(statusLine1);

  // Status separator
  lines.push(`  ${COLORS.gridLine}${BOX.tRight}${BOX.h.repeat(statusWidth)}${BOX.tLeft}${COLORS.reset}`);

  // Status line 2: keyboard shortcuts
  const shortcuts = [
    `${COLORS.statusKey}\u2191\u2193\u2190\u2192${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} move`,
    `${COLORS.statusKey}Enter${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} edit`,
    `${COLORS.statusKey}=${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} formula`,
    `${COLORS.statusKey}Del${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} clear`,
    `${COLORS.statusKey}^S${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} save`,
    `${COLORS.statusKey}^Q${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg} quit`,
  ];
  const shortcutsStr = `  ${shortcuts.join("   ")}`;
  const s2Visible = stripAnsi(shortcutsStr).length;
  const s2Pad = Math.max(0, statusWidth - s2Visible);
  const statusLine2 = `  ${COLORS.gridLine}${BOX.v}${COLORS.reset}${COLORS.statusBg}${COLORS.statusFg}${shortcutsStr}${" ".repeat(s2Pad)}${COLORS.reset}${COLORS.gridLine}${BOX.v}${COLORS.reset}`;
  lines.push(statusLine2);

  // Status bottom border
  lines.push(`  ${COLORS.gridLine}${BOX.rBotLeft}${BOX.h.repeat(statusWidth)}${BOX.rBotRight}${COLORS.reset}`);

  // ════════════════════════════════════════════════════════════════════════
  // Compose final output — clear screen & home cursor
  // ════════════════════════════════════════════════════════════════════════
  return `${ESC}[2J${ESC}[H` + lines.join("\n");
}
