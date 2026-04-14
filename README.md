<p align="center">
  <img src="https://raw.githubusercontent.com/Worth-Doing/brand-assets/main/png/variants/04-horizontal.png" alt="WorthDoing.ai" width="600" />
</p>

<h1 align="center">termxl</h1>

<p align="center">
  <strong>Terminal-native spreadsheet. Excel in your terminal.</strong><br />
  <em>Full formula engine, real-time recalculation, keyboard-first interaction, premium TUI.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Built_by-WorthDoing.ai-5C4EE5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=" alt="Built by WorthDoing.ai" />
  <img src="https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 18+" />
  <img src="https://img.shields.io/badge/npm-termxl-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm termxl" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=for-the-badge" alt="Zero Dependencies" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Formula_Engine-blue?style=flat-square" alt="Formula Engine" />
  <img src="https://img.shields.io/badge/23_Built--in_Functions-blue?style=flat-square" alt="23 Functions" />
  <img src="https://img.shields.io/badge/CSV_Import%2FExport-blue?style=flat-square" alt="CSV Import/Export" />
  <img src="https://img.shields.io/badge/Dependency_Graph-green?style=flat-square" alt="Dependency Graph" />
  <img src="https://img.shields.io/badge/Cycle_Detection-green?style=flat-square" alt="Cycle Detection" />
  <img src="https://img.shields.io/badge/Viewport_Virtualization-green?style=flat-square" alt="Viewport Virtualization" />
  <img src="https://img.shields.io/badge/Interactive_TUI-purple?style=flat-square" alt="Interactive TUI" />
</p>

---

<details>
<summary><strong>TUI Preview (click to expand)</strong></summary>

```
  termxl | Book1                              Sheet1 | * Unsaved
  A1        fx: =SUM(A1:A5)
  --------------------------------------------------------------
       |      A       |      B       |      C       |      D
  -----+--------------+--------------+--------------+----------
   1   |          120 |          200 |     [=A1+B1] |
   2   |           50 |           30 |          80  |
   3   |           75 |          100 |         175  |
   4   |              |              |              |
   5   |              |              |              |
  --------------------------------------------------------------
  Value: 320  Type: number  Mode: NAV  | Arrows:move Enter:edit
```

</details>

<p align="center"><em>termxl running in terminal -- a full spreadsheet with formulas, live recalculation, and keyboard-first navigation.</em></p>

---

## Quick Start

```bash
npm install -g termxl
termxl                    # New blank workbook
termxl data.csv           # Open CSV file
termxl budget.txl         # Open native format
cat report.csv | termxl   # Import from pipe
```

That's it. No config files, no setup, no browser. Just install and run.

---

## What Makes termxl Different

| Feature | Excel | Google Sheets | VisiData | sc-im | **termxl** |
|---------|-------|---------------|----------|-------|------------|
| Formula engine | Yes | Yes | No | Partial | **Yes (23 functions)** |
| Real-time recalculation | Yes | Yes | No | Yes | **Yes** |
| Dependency tracking | Yes | Yes | No | No | **Yes** |
| Cycle detection | Yes | Yes | No | No | **Yes** |
| Terminal-native | No | No | Yes | Yes | **Yes** |
| Zero dependencies | No | No | No | No | **Yes** |
| npm installable | No | No | No | No | **Yes** |
| CSV import/export | Yes | Yes | Yes | Yes | **Yes** |
| Native save format | .xlsx | Cloud | No | .sc | **.txl (JSON)** |
| Keyboard-first | Partial | No (mouse) | Yes | Yes | **Yes** |
| Cross-platform | Windows | Browser | Yes | Unix | **Yes (Node.js)** |
| Viewport virtualization | Yes | Yes | Yes | Yes | **Yes** |
| No account required | Yes | No | Yes | Yes | **Yes** |
| File size | 2 GB+ | N/A | 40 MB | 5 MB | **< 100 KB** |

termxl combines the formula power of desktop spreadsheets with the speed and simplicity of a terminal tool. No GUI, no Electron, no browser -- just your data and your keyboard.

---

## Formula Engine

termxl includes a complete formula engine built from scratch. Every formula goes through a four-stage pipeline:

```
Input:  =SUM(A1:A5) + B1 * 2

  Tokenizer  -->  [IDENT:SUM, LPAREN, CELL:A1, COLON, CELL:A5, RPAREN, PLUS, CELL:B1, STAR, NUMBER:2]

  Parser     -->  BinaryOp(+)
                  ├── FunctionCall(SUM, [RangeRef(A1:A5)])
                  └── BinaryOp(*)
                      ├── CellRef(B1)
                      └── NumberLiteral(2)

  Evaluator  -->  320 + 200 * 2 = 720

  Display    -->  720
```

### Operator Precedence

Operators are evaluated in strict precedence order, matching Excel behavior:

| Precedence | Operator | Description |
|:---:|:---:|---|
| 1 (highest) | `^` | Exponentiation (right-associative) |
| 2 | `+` `-` (unary) | Unary plus, unary minus |
| 3 | `*` `/` | Multiplication, division |
| 4 | `+` `-` | Addition, subtraction |
| 5 (lowest) | `>` `<` `>=` `<=` `=` `<>` | Comparison operators |

Parentheses override precedence: `=(2+3)*4` evaluates to `20`, not `14`.

### Built-in Functions

termxl ships with 23 built-in functions organized by category:

#### Math

| Function | Syntax | Description |
|----------|--------|-------------|
| `SUM` | `=SUM(A1:A10)` | Sum all numeric values in a range |
| `ABS` | `=ABS(A1)` | Absolute value |
| `ROUND` | `=ROUND(A1, 2)` | Round to N decimal places |
| `INT` | `=INT(3.7)` | Floor to nearest integer |
| `MOD` | `=MOD(10, 3)` | Modulo (remainder) |
| `POWER` | `=POWER(2, 8)` | Raise base to exponent |
| `SQRT` | `=SQRT(144)` | Square root |
| `PI` | `=PI()` | Returns 3.14159... |

#### Statistics

| Function | Syntax | Description |
|----------|--------|-------------|
| `AVERAGE` | `=AVERAGE(A1:A10)` | Arithmetic mean (alias: `AVG`) |
| `COUNT` | `=COUNT(A1:A10)` | Count cells containing numbers |
| `COUNTA` | `=COUNTA(A1:A10)` | Count non-blank cells |
| `MIN` | `=MIN(A1:A10)` | Smallest numeric value |
| `MAX` | `=MAX(A1:A10)` | Largest numeric value |

#### Logic

| Function | Syntax | Description |
|----------|--------|-------------|
| `IF` | `=IF(A1>10, "High", "Low")` | Conditional evaluation |
| `AND` | `=AND(A1>0, B1>0)` | Logical AND |
| `OR` | `=OR(A1>0, B1>0)` | Logical OR |
| `NOT` | `=NOT(A1)` | Logical negation |

#### Text

| Function | Syntax | Description |
|----------|--------|-------------|
| `CONCAT` | `=CONCAT(A1, " ", B1)` | Concatenate values (alias: `CONCATENATE`) |
| `LEN` | `=LEN(A1)` | String length |
| `UPPER` | `=UPPER(A1)` | Convert to uppercase |
| `LOWER` | `=LOWER(A1)` | Convert to lowercase |

### Formula Examples

```
=A1+B1                         # Basic arithmetic
=SUM(A1:A10)                   # Range aggregation
=AVERAGE(B2:B100)              # Statistical mean
=IF(A1>100, "Over", "Under")   # Conditional logic
=ROUND(A1/B1, 2)               # Division with rounding
=POWER(2, 10)                  # Exponentiation (1024)
=AND(A1>0, A1<100)             # Compound condition
=CONCAT(A1, " ", B1)           # String joining
=IF(MOD(A1,2)=0,"Even","Odd")  # Nested functions
=SQRT(POWER(A1,2)+POWER(B1,2)) # Pythagorean distance
```

### Error System

When a formula cannot be evaluated, termxl returns a typed error code identical to Excel conventions:

| Error | Meaning |
|-------|---------|
| `#REF!` | Reference to an invalid cell |
| `#NAME?` | Unknown function name |
| `#VALUE!` | Wrong argument type (e.g., text where number expected) |
| `#DIV/0!` | Division by zero |
| `#CYCLE!` | Circular reference detected |
| `#PARSE!` | Formula syntax error (unmatched parentheses, bad tokens) |

---

## Keyboard Controls

termxl is designed for keyboard-first interaction. Every action is reachable without a mouse.

| Key | Navigation Mode | Edit Mode |
|-----|-----------------|-----------|
| `Arrow keys` | Move active cell | Commit and move (Up/Down) |
| `Enter` | Start editing current cell | Commit value, move down |
| `Escape` | -- | Cancel edit, return to navigation |
| `=` | Enter formula mode | -- |
| `Delete` / `Backspace` | Clear cell contents | Delete last character |
| `Tab` | Move one cell right | Commit value, move right |
| `Shift+Tab` | Move one cell left | -- |
| `Ctrl+S` | Save workbook | Save workbook |
| `Ctrl+Q` | Quit | Quit |
| `Ctrl+C` | Quit | Quit |
| `Page Up` | Scroll up one page | -- |
| `Page Down` | Scroll down one page | -- |
| `Home` | Go to cell A1 | -- |
| `End` | Go to last cell with data | -- |
| Any printable key | Start editing with that character | Append to edit buffer |

### Mode System

termxl operates in three distinct modes, shown in the status bar:

- **NAV** (Navigation) -- Arrow keys move between cells. Type to start editing. Press `=` to enter a formula.
- **EDIT** -- Free-form text entry. Press `Enter` to commit, `Escape` to cancel. The edit buffer appears both in the cell and the formula bar.
- **FORMULA** -- Formula entry mode. Starts with `=` pre-filled. Same commit/cancel behavior as edit mode.

---

## Architecture

```
User Input (keyboard)
    |
    v
Mode Manager (NAV / EDIT / FORMULA)
    |
    v
Spreadsheet Engine
+-- Cell Storage (Map<key, Cell>)
+-- Formula Engine
|   +-- Tokenizer
|   +-- Parser (recursive descent)
|   +-- AST
|   +-- Evaluator (23 functions)
+-- Dependency Graph
+-- Recalculation Engine
+-- Viewport Manager
    |
    v
TUI Renderer (ANSI)
+-- Top Bar (app name, workbook, sheet, save status)
+-- Formula Bar (cell label, fx content)
+-- Column/Row Headers (dynamic, scrollable)
+-- Cell Grid (virtualized, colored by type)
+-- Status Bar (value, type, mode, key hints)
```

termxl uses **zero npm runtime dependencies**. Every component -- tokenizer, parser, evaluator, renderer, file I/O -- is built from scratch using only Node.js built-in modules (`fs`, `path`, `process`). This means:

- No native bindings to compile
- No `node-gyp` headaches
- Works anywhere Node.js 18+ runs
- Instant install, instant run
- Total package size under 100 KB

---

## Spreadsheet Engine

### Cell Storage

Cells are stored in a `Map<string, Cell>` keyed by address label (e.g., `"A1"`, `"B2"`). Each cell tracks:

- **raw** -- the exact string the user typed
- **parsed** -- the AST node (for formulas) or `null` (for literals)
- **value** -- the computed `RuntimeValue` (number, string, boolean, blank, or error)
- **display** -- the rendered text shown in the grid
- **dependencies** -- set of cell keys this cell reads from
- **dependents** -- set of cell keys that read from this cell

### Dependency Tracking

When a formula is entered, termxl extracts all cell and range references from the AST and registers them as dependencies. The reverse mapping (dependents) is maintained simultaneously, forming a bidirectional dependency graph.

```
A1 = 100
B1 = 200
C1 = =A1+B1     -->  C1 depends on {A1, B1}
                      A1 has dependent {C1}
                      B1 has dependent {C1}
D1 = =C1*2      -->  D1 depends on {C1}
                      C1 has dependent {D1}
```

When A1 changes, the engine walks the dependent chain: A1 -> C1 -> D1, recalculating each cell in topological order.

### Incremental Recalculation

termxl does not recalculate the entire sheet on every edit. When a cell changes:

1. The cell's own value is recomputed
2. The engine walks the `dependents` set recursively
3. Only cells in the dependency chain are re-evaluated
4. A visited-set prevents infinite loops

This keeps recalculation time proportional to the affected subgraph, not the total sheet size.

### Cycle Detection

Circular references are detected at recalculation time. If the recalculation engine visits a cell that is already in the current walk path, it marks that cell with `#CYCLE!` and stops propagation. This prevents infinite loops while preserving all non-circular values.

```
A1 = =B1      A1 --> #CYCLE!
B1 = =A1      B1 --> #CYCLE!
C1 = =A1+1    C1 --> #CYCLE! (propagated from A1)
D1 = 42       D1 --> 42 (unaffected)
```

---

## Viewport Virtualization

termxl only renders cells visible in the current terminal window. The viewport manager tracks:

- **startRow / startCol** -- the top-left corner of the visible area
- **visibleRows / visibleCols** -- computed dynamically from terminal dimensions
- **activeRow / activeCol** -- the currently selected cell

When the active cell moves outside the visible area, the viewport scrolls to keep it on screen. Column count adjusts automatically on terminal resize. This means termxl can handle sheets with thousands of rows without any rendering overhead -- only the visible window is drawn each frame.

---

## File Formats

### CSV (Import/Export)

termxl reads and writes standard CSV files with full quoting support:

- Comma-delimited fields
- Double-quote escaping for fields containing commas, quotes, or newlines
- Automatic type detection on import (numbers, booleans, strings)

```bash
termxl data.csv              # Open CSV in the TUI
cat data.csv | termxl        # Pipe CSV from stdin
```

CSV export writes computed values (not formulas) -- what you see is what you get.

### .txl (Native Format)

The `.txl` format is a simple JSON file that preserves formulas, cell addresses, and workbook structure:

```json
{
  "name": "Budget",
  "sheets": [
    {
      "name": "Sheet1",
      "cells": {
        "A1": "Revenue",
        "B1": "120000",
        "A2": "Expenses",
        "B2": "85000",
        "A3": "Profit",
        "B3": "=B1-B2"
      }
    }
  ]
}
```

Benefits of the `.txl` format:

- Human-readable and version-control friendly
- Preserves formulas (CSV exports only computed values)
- Supports multiple sheets per workbook
- Lightweight -- stores only non-empty cells

---

## Project Structure

```
termxl/
├── src/
│   ├── index.ts                # CLI entry point, main loop, keypress handler
│   ├── formula/
│   │   ├── types.ts            # Token types, AST nodes, RuntimeValue, ErrorCode
│   │   ├── tokenizer.ts        # Lexer: string --> Token[]
│   │   ├── parser.ts           # Recursive-descent parser: Token[] --> AST
│   │   ├── evaluator.ts        # AST evaluator, 23 built-in functions
│   │   ├── functions.ts        # Function registry, isKnownFunction()
│   │   └── index.ts            # Barrel export
│   ├── spreadsheet/
│   │   ├── types.ts            # Cell, Sheet, Workbook, ViewportState interfaces
│   │   ├── sheet.ts            # Cell CRUD, dependency graph, recalculation
│   │   ├── workbook.ts         # Workbook/sheet management
│   │   ├── viewport.ts         # Viewport scrolling and navigation
│   │   └── index.ts            # Barrel export
│   ├── io/
│   │   ├── csv.ts              # CSV import/export with quote handling
│   │   └── txl.ts              # Native .txl JSON format read/write
│   └── tui/
│       └── renderer.ts         # ANSI TUI renderer (alt screen, grid, status bar)
├── dist/                       # Compiled output (tsup)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── LICENSE
└── README.md
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript 5.5+ (strict mode) |
| **Runtime** | Node.js 18+ |
| **Build** | tsup (esbuild under the hood) |
| **Test** | Vitest |
| **Type checking** | tsc --noEmit |
| **Module format** | CommonJS (for CLI compatibility) |
| **Terminal rendering** | Raw ANSI escape sequences |
| **Formula parsing** | Hand-written recursive-descent parser |
| **Cell storage** | ES Map with string keys |
| **Dependencies** | Zero runtime dependencies |

---

## CLI Options

```bash
termxl                    # Interactive spreadsheet (default)
termxl <file.csv>         # Import CSV file
termxl <file.txl>         # Open native termxl workbook
cat data.csv | termxl     # Import CSV from stdin pipe
termxl --help             # Show help and keyboard reference
termxl -h                 # Short alias for --help
termxl --version          # Show version
termxl -v                 # Short alias for --version
```

---

## Development

```bash
# Clone the repository
git clone https://github.com/Worth-Doing/termxl.git
cd termxl

# Install dev dependencies
npm install

# Build the project
npm run build

# Run the CLI
npm start

# Type check
npm run typecheck

# Run tests
npm test
```

---

## Contributing

Contributions are welcome. termxl is built and maintained by [WorthDoing AI](https://worthdoing.ai).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

### Guidelines

- All code must pass `npm run typecheck` with zero errors
- Maintain zero runtime dependencies -- use only Node.js built-ins
- Follow the existing code style (strict TypeScript, no `any`)
- Add tests for new formula functions or engine features
- Keep the formula engine Excel-compatible where possible

---

## License

[MIT](./LICENSE) -- Copyright (c) 2026 [WorthDoing AI](https://worthdoing.ai)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Worth-Doing/brand-assets/main/png/variants/04-horizontal.png" alt="WorthDoing.ai" width="300" />
</p>

<p align="center">
  Built with precision by <a href="https://worthdoing.ai"><strong>WorthDoing AI</strong></a><br />
  <em>Tools worth using. Software worth building.</em>
</p>
