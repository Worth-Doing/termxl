import { Token, TokenType } from "./types";

/**
 * Tokenizes a formula string (without the leading '=') into a Token array.
 *
 * Recognizes:
 *   - Numbers:      123, 3.14, .5
 *   - Strings:      "hello world"
 *   - Booleans:     TRUE, FALSE
 *   - Cell refs:    A1, B2, AA10, XFD1048576
 *   - Identifiers:  SUM, AVERAGE, IF (function names — letters not followed by digits)
 *   - Operators:    + - * / ^ ( ) , : > < >= <= = <>
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const len = input.length;
  let pos = 0;

  while (pos < len) {
    const ch = input[pos];

    // ── Skip whitespace ───────────────────────────
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      pos++;
      continue;
    }

    // ── String literal ────────────────────────────
    if (ch === '"') {
      const start = pos;
      pos++; // skip opening quote
      let value = "";
      while (pos < len && input[pos] !== '"') {
        // Support escaped quotes inside strings
        if (input[pos] === "\\" && pos + 1 < len && input[pos + 1] === '"') {
          value += '"';
          pos += 2;
        } else {
          value += input[pos];
          pos++;
        }
      }
      if (pos >= len) {
        throw new Error(`Unterminated string literal at position ${start}`);
      }
      pos++; // skip closing quote
      tokens.push({ type: "STRING", value, pos: start });
      continue;
    }

    // ── Number literal ────────────────────────────
    // Starts with a digit or a dot followed by a digit
    if (isDigit(ch) || (ch === "." && pos + 1 < len && isDigit(input[pos + 1]))) {
      const start = pos;
      let numStr = "";

      // Integer part
      while (pos < len && isDigit(input[pos])) {
        numStr += input[pos];
        pos++;
      }

      // Decimal part
      if (pos < len && input[pos] === "." && (pos + 1 >= len || !isAlpha(input[pos + 1]))) {
        numStr += ".";
        pos++;
        while (pos < len && isDigit(input[pos])) {
          numStr += input[pos];
          pos++;
        }
      }

      tokens.push({ type: "NUMBER", value: numStr, pos: start });
      continue;
    }

    // ── Alphabetic: cell ref, identifier, or boolean ──
    if (isAlpha(ch)) {
      const start = pos;
      let word = "";
      while (pos < len && isAlpha(input[pos])) {
        word += input[pos];
        pos++;
      }

      const upper = word.toUpperCase();

      // Check for boolean literals
      if (upper === "TRUE" || upper === "FALSE") {
        tokens.push({ type: "BOOLEAN", value: upper, pos: start });
        continue;
      }

      // Determine if this is a cell reference or a function/identifier name.
      // Cell ref: 1-3 uppercase letters followed immediately by 1+ digits.
      // Function name / identifier: letters only (possibly followed by "(").
      if (upper.length <= 3 && pos < len && isDigit(input[pos])) {
        // It's a cell reference — consume the digits
        let digits = "";
        while (pos < len && isDigit(input[pos])) {
          digits += input[pos];
          pos++;
        }
        tokens.push({ type: "CELL", value: upper + digits, pos: start });
      } else {
        // It's an identifier (function name)
        tokens.push({ type: "IDENT", value: upper, pos: start });
      }
      continue;
    }

    // ── Two-character operators ───────────────────
    if (ch === ">" && pos + 1 < len && input[pos + 1] === "=") {
      tokens.push({ type: "GTE", value: ">=", pos });
      pos += 2;
      continue;
    }
    if (ch === "<" && pos + 1 < len && input[pos + 1] === "=") {
      tokens.push({ type: "LTE", value: "<=", pos });
      pos += 2;
      continue;
    }
    if (ch === "<" && pos + 1 < len && input[pos + 1] === ">") {
      tokens.push({ type: "NEQ", value: "<>", pos });
      pos += 2;
      continue;
    }

    // ── Single-character operators ────────────────
    const singleOps: Record<string, TokenType> = {
      "+": "PLUS",
      "-": "MINUS",
      "*": "STAR",
      "/": "SLASH",
      "^": "CARET",
      "(": "LPAREN",
      ")": "RPAREN",
      ",": "COMMA",
      ":": "COLON",
      ">": "GT",
      "<": "LT",
      "=": "EQ",
    };

    const tokenType = singleOps[ch];
    if (tokenType) {
      tokens.push({ type: tokenType, value: ch, pos });
      pos++;
      continue;
    }

    // ── Unknown character ─────────────────────────
    throw new Error(`Unexpected character '${ch}' at position ${pos}`);
  }

  tokens.push({ type: "EOF", value: "", pos });
  return tokens;
}

// ── Character classification helpers ──────────────
function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isAlpha(ch: string): boolean {
  return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
}
