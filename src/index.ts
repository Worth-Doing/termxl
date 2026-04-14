import * as fs from "node:fs";
import * as path from "node:path";
import { Workbook, ViewportState } from "./spreadsheet/types";
import { createWorkbook, activeSheet } from "./spreadsheet/workbook";
import { setCellRaw, deleteCell, getCell } from "./spreadsheet/sheet";
import { renderSpreadsheet, enterAltScreen, exitAltScreen } from "./tui/renderer";
import { importCSV, exportCSV } from "./io/csv";
import { saveWorkbook, loadWorkbook } from "./io/txl";
import { colToLabel } from "./formula/types";

// ── CLI Arguments ───────────────────────────────────
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log("termxl v1.0.0");
  process.exit(0);
}

function printHelp(): void {
  console.log(`
  termxl - Terminal-native spreadsheet

  USAGE
    termxl                     Open a new blank workbook
    termxl <file.csv>          Import a CSV file
    termxl <file.txl>          Open a native termxl file
    cat data.csv | termxl      Import CSV from stdin

  KEYBOARD
    Arrow keys       Move active cell
    Enter            Enter edit mode
    =                Enter formula mode
    Escape           Cancel editing
    Delete / Backspace (nav)  Clear cell
    Ctrl+S           Save workbook
    Ctrl+Q           Quit
    Page Up/Down     Scroll vertically
    Home             Go to cell A1
    End              Go to last cell with data
    Tab              Move right
    Shift+Tab        Move left

  OPTIONS
    --help, -h       Show this help
    --version, -v    Show version
`);
}

// ── Initialize Workbook ─────────────────────────────
let wb: Workbook;
const filePath = args.find(a => !a.startsWith("-"));

if (filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") {
    const content = fs.readFileSync(filePath, "utf-8");
    wb = createWorkbook(path.basename(filePath, ext));
    wb.sheets[0] = importCSV(content, "Sheet1");
    wb.filePath = filePath.replace(/\.csv$/, ".txl");
  } else if (ext === ".txl" || ext === ".json") {
    wb = loadWorkbook(filePath);
  } else {
    // Try to load as CSV
    const content = fs.readFileSync(filePath, "utf-8");
    wb = createWorkbook(path.basename(filePath));
    wb.sheets[0] = importCSV(content, "Sheet1");
  }
} else if (!process.stdin.isTTY) {
  // Piped input - read as CSV
  const chunks: Buffer[] = [];
  const fd = fs.openSync("/dev/stdin", "r");
  const buf = Buffer.alloc(65536);
  let bytesRead: number;
  while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
    chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
  }
  fs.closeSync(fd);
  const content = Buffer.concat(chunks).toString("utf-8");
  wb = createWorkbook("stdin");
  wb.sheets[0] = importCSV(content, "Sheet1");
} else {
  wb = createWorkbook("Book1");
}

// ── Viewport State ──────────────────────────────────
const vp: ViewportState = {
  startRow: 1,
  startCol: 1,
  activeRow: 1,
  activeCol: 1,
  visibleRows: 20,
  visibleCols: 6,
  mode: "NAVIGATION",
  editBuffer: "",
};

// ── Main Loop ───────────────────────────────────────
enterAltScreen();
render();

// Configure raw mode for keypress handling
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding("utf-8");

process.stdin.on("data", (data: string) => {
  handleKeypress(data);
  render();
});

// Handle terminal resize
process.stdout.on("resize", () => {
  render();
});

// Cleanup on exit
process.on("exit", () => {
  exitAltScreen();
});

process.on("SIGINT", () => {
  exitAltScreen();
  process.exit(0);
});

process.on("SIGTERM", () => {
  exitAltScreen();
  process.exit(0);
});

// ── Render ──────────────────────────────────────────
function render(): void {
  const sheet = activeSheet(wb);
  const output = renderSpreadsheet(wb, sheet, vp);
  process.stdout.write(output);
}

// ── Keypress Handler ────────────────────────────────
function handleKeypress(data: string): void {
  const sheet = activeSheet(wb);

  // Ctrl+Q - quit
  if (data === "\x11") {
    exitAltScreen();
    process.exit(0);
  }

  // Ctrl+S - save
  if (data === "\x13") {
    if (wb.filePath) {
      saveWorkbook(wb, wb.filePath);
    } else {
      // Default save path
      const savePath = path.join(process.cwd(), `${wb.name}.txl`);
      saveWorkbook(wb, savePath);
    }
    return;
  }

  // Ctrl+C - also quit
  if (data === "\x03") {
    exitAltScreen();
    process.exit(0);
  }

  if (vp.mode === "NAVIGATION") {
    handleNavigationMode(data);
  } else {
    handleEditMode(data);
  }
}

function handleNavigationMode(data: string): void {
  const sheet = activeSheet(wb);

  // Arrow keys (escape sequences)
  if (data === "\x1b[A") { // Up
    moveActive(0, -1);
    return;
  }
  if (data === "\x1b[B") { // Down
    moveActive(0, 1);
    return;
  }
  if (data === "\x1b[C") { // Right
    moveActive(1, 0);
    return;
  }
  if (data === "\x1b[D") { // Left
    moveActive(-1, 0);
    return;
  }

  // Page Up / Page Down
  if (data === "\x1b[5~") { // Page Up
    moveActive(0, -vp.visibleRows);
    return;
  }
  if (data === "\x1b[6~") { // Page Down
    moveActive(0, vp.visibleRows);
    return;
  }

  // Home - go to A1
  if (data === "\x1b[H" || data === "\x1b[1~") {
    vp.activeRow = 1;
    vp.activeCol = 1;
    vp.startRow = 1;
    vp.startCol = 1;
    return;
  }

  // End - go to last cell with data
  if (data === "\x1b[F" || data === "\x1b[4~") {
    vp.activeRow = Math.max(1, sheet.maxRow);
    vp.activeCol = Math.max(1, sheet.maxCol);
    ensureActiveVisible();
    return;
  }

  // Tab - move right
  if (data === "\t") {
    moveActive(1, 0);
    return;
  }

  // Shift+Tab - move left
  if (data === "\x1b[Z") {
    moveActive(-1, 0);
    return;
  }

  // Enter - start editing
  if (data === "\r" || data === "\n") {
    vp.mode = "EDIT";
    const cell = getCell(sheet, vp.activeRow, vp.activeCol);
    vp.editBuffer = cell?.raw || "";
    return;
  }

  // = - start formula mode
  if (data === "=") {
    vp.mode = "FORMULA";
    vp.editBuffer = "=";
    return;
  }

  // Delete / Backspace - clear cell
  if (data === "\x7f" || data === "\x1b[3~") {
    deleteCell(sheet, vp.activeRow, vp.activeCol);
    wb.dirty = true;
    return;
  }

  // Any printable character - start editing with that character
  if (data.length === 1 && data >= " " && data <= "~" && data !== "=") {
    vp.mode = "EDIT";
    vp.editBuffer = data;
    return;
  }
}

function handleEditMode(data: string): void {
  const sheet = activeSheet(wb);

  // Escape - cancel editing
  if (data === "\x1b" || data === "\x1b\x1b") {
    vp.mode = "NAVIGATION";
    vp.editBuffer = "";
    return;
  }

  // Enter - commit edit
  if (data === "\r" || data === "\n") {
    commitEdit();
    vp.mode = "NAVIGATION";
    moveActive(0, 1); // move down after commit (Excel behavior)
    return;
  }

  // Tab - commit and move right
  if (data === "\t") {
    commitEdit();
    vp.mode = "NAVIGATION";
    moveActive(1, 0);
    return;
  }

  // Backspace - delete last char
  if (data === "\x7f") {
    if (vp.editBuffer.length > 0) {
      vp.editBuffer = vp.editBuffer.slice(0, -1);
    }
    return;
  }

  // Arrow keys in edit mode - commit and move
  if (data === "\x1b[A") { // Up
    commitEdit();
    vp.mode = "NAVIGATION";
    moveActive(0, -1);
    return;
  }
  if (data === "\x1b[B") { // Down
    commitEdit();
    vp.mode = "NAVIGATION";
    moveActive(0, 1);
    return;
  }

  // Ignore other escape sequences in edit mode
  if (data.startsWith("\x1b")) {
    return;
  }

  // Printable characters - append to buffer
  for (const ch of data) {
    if (ch >= " " && ch <= "~") {
      vp.editBuffer += ch;
    }
  }
}

function commitEdit(): void {
  const sheet = activeSheet(wb);
  const raw = vp.editBuffer.trim();
  if (raw === "") {
    deleteCell(sheet, vp.activeRow, vp.activeCol);
  } else {
    setCellRaw(sheet, vp.activeRow, vp.activeCol, raw);
  }
  wb.dirty = true;
  vp.editBuffer = "";
}

function moveActive(dc: number, dr: number): void {
  vp.activeRow = Math.max(1, vp.activeRow + dr);
  vp.activeCol = Math.max(1, vp.activeCol + dc);
  ensureActiveVisible();
}

function ensureActiveVisible(): void {
  // Scroll viewport to keep active cell visible
  if (vp.activeRow < vp.startRow) {
    vp.startRow = vp.activeRow;
  }
  if (vp.activeRow >= vp.startRow + vp.visibleRows) {
    vp.startRow = vp.activeRow - vp.visibleRows + 1;
  }
  if (vp.activeCol < vp.startCol) {
    vp.startCol = vp.activeCol;
  }
  if (vp.activeCol >= vp.startCol + vp.visibleCols) {
    vp.startCol = vp.activeCol - vp.visibleCols + 1;
  }
}
