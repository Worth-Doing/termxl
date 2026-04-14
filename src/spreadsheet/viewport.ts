import { ViewportState } from "./types";

export function createViewport(): ViewportState {
  return {
    startRow: 1,
    startCol: 1,
    visibleRows: 20,
    visibleCols: 8,
    activeRow: 1,
    activeCol: 1,
    mode: "NAVIGATION",
    editBuffer: "",
  };
}

export function moveActive(vp: ViewportState, dRow: number, dCol: number): void {
  vp.activeRow = Math.max(1, vp.activeRow + dRow);
  vp.activeCol = Math.max(1, vp.activeCol + dCol);

  // Scroll viewport if active cell moves out of view
  if (vp.activeRow < vp.startRow) vp.startRow = vp.activeRow;
  if (vp.activeRow >= vp.startRow + vp.visibleRows) vp.startRow = vp.activeRow - vp.visibleRows + 1;
  if (vp.activeCol < vp.startCol) vp.startCol = vp.activeCol;
  if (vp.activeCol >= vp.startCol + vp.visibleCols) vp.startCol = vp.activeCol - vp.visibleCols + 1;
}

export function pageDown(vp: ViewportState): void {
  const jump = Math.max(1, vp.visibleRows - 1);
  vp.activeRow += jump;
  vp.startRow += jump;
}

export function pageUp(vp: ViewportState): void {
  const jump = Math.max(1, vp.visibleRows - 1);
  vp.activeRow = Math.max(1, vp.activeRow - jump);
  vp.startRow = Math.max(1, vp.startRow - jump);
}

export function goToCell(vp: ViewportState, row: number, col: number): void {
  vp.activeRow = Math.max(1, row);
  vp.activeCol = Math.max(1, col);
  // Center in viewport if possible
  vp.startRow = Math.max(1, vp.activeRow - Math.floor(vp.visibleRows / 2));
  vp.startCol = Math.max(1, vp.activeCol - Math.floor(vp.visibleCols / 2));
}
