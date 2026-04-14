import {
  Token,
  TokenType,
  FormulaNode,
  CellRefNode,
  RangeRefNode,
  parseCellLabel,
} from "./types";

/**
 * Recursive-descent parser for spreadsheet formulas.
 *
 * Grammar (informal):
 *   expr       → comparison
 *   comparison → addition ( ( ">" | "<" | ">=" | "<=" | "=" | "<>" ) addition )*
 *   addition   → multiply ( ( "+" | "-" ) multiply )*
 *   multiply   → power ( ( "*" | "/" ) power )*
 *   power      → unary ( "^" unary )*
 *   unary      → ( "+" | "-" ) unary | primary
 *   primary    → NUMBER | STRING | BOOLEAN | cellOrRange | functionCall | "(" expr ")"
 *   cellOrRange→ CELL ( ":" CELL )?
 *   functionCall→ IDENT "(" ( expr ( "," expr )* )? ")"
 */
export function parse(tokens: Token[]): FormulaNode {
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function advance(): Token {
    return tokens[pos++];
  }

  function expect(type: TokenType): Token {
    const tok = peek();
    if (tok.type !== type) {
      throw new Error(`Expected ${type} but got ${tok.type} ("${tok.value}") at position ${tok.pos}`);
    }
    return advance();
  }

  // ── expr → comparison ──────────────────────────
  function expr(): FormulaNode {
    return comparison();
  }

  // ── comparison ─────────────────────────────────
  function comparison(): FormulaNode {
    let node = addition();
    while (true) {
      const tok = peek();
      if (
        tok.type === "GT" || tok.type === "LT" ||
        tok.type === "GTE" || tok.type === "LTE" ||
        tok.type === "EQ" || tok.type === "NEQ"
      ) {
        advance();
        const right = addition();
        node = { kind: "BinaryOp", op: tok.value, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  // ── addition ───────────────────────────────────
  function addition(): FormulaNode {
    let node = multiply();
    while (true) {
      const tok = peek();
      if (tok.type === "PLUS" || tok.type === "MINUS") {
        advance();
        const right = multiply();
        node = { kind: "BinaryOp", op: tok.value, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  // ── multiply ───────────────────────────────────
  function multiply(): FormulaNode {
    let node = power();
    while (true) {
      const tok = peek();
      if (tok.type === "STAR" || tok.type === "SLASH") {
        advance();
        const right = power();
        node = { kind: "BinaryOp", op: tok.value, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  // ── power (right-associative) ──────────────────
  function power(): FormulaNode {
    let node = unary();
    if (peek().type === "CARET") {
      advance();
      const right = power(); // right-associative recursion
      node = { kind: "BinaryOp", op: "^", left: node, right };
    }
    return node;
  }

  // ── unary ──────────────────────────────────────
  function unary(): FormulaNode {
    const tok = peek();
    if (tok.type === "PLUS" || tok.type === "MINUS") {
      advance();
      const arg = unary();
      return { kind: "UnaryOp", op: tok.value as "+" | "-", argument: arg };
    }
    return primary();
  }

  // ── primary ────────────────────────────────────
  function primary(): FormulaNode {
    const tok = peek();

    // Number literal
    if (tok.type === "NUMBER") {
      advance();
      return { kind: "NumberLiteral", value: parseFloat(tok.value) };
    }

    // String literal
    if (tok.type === "STRING") {
      advance();
      return { kind: "StringLiteral", value: tok.value };
    }

    // Boolean literal
    if (tok.type === "BOOLEAN") {
      advance();
      return { kind: "BooleanLiteral", value: tok.value === "TRUE" };
    }

    // Cell reference (possibly range)
    if (tok.type === "CELL") {
      return cellOrRange();
    }

    // Function call
    if (tok.type === "IDENT") {
      return functionCall();
    }

    // Parenthesised expression
    if (tok.type === "LPAREN") {
      advance();
      const node = expr();
      expect("RPAREN");
      return node;
    }

    throw new Error(`Unexpected token ${tok.type} ("${tok.value}") at position ${tok.pos}`);
  }

  // ── cellOrRange ────────────────────────────────
  function cellOrRange(): FormulaNode {
    const startTok = expect("CELL");
    const startAddr = parseCellLabel(startTok.value);
    if (!startAddr) {
      throw new Error(`Invalid cell reference "${startTok.value}" at position ${startTok.pos}`);
    }

    // Check for range  A1:B2
    if (peek().type === "COLON") {
      advance();
      const endTok = expect("CELL");
      const endAddr = parseCellLabel(endTok.value);
      if (!endAddr) {
        throw new Error(`Invalid cell reference "${endTok.value}" at position ${endTok.pos}`);
      }
      return {
        kind: "RangeRef",
        start: { row: startAddr.row, col: startAddr.col },
        end: { row: endAddr.row, col: endAddr.col },
        label: `${startTok.value}:${endTok.value}`,
      } as RangeRefNode;
    }

    return {
      kind: "CellRef",
      row: startAddr.row,
      col: startAddr.col,
      label: startTok.value,
    } as CellRefNode;
  }

  // ── functionCall ───────────────────────────────
  function functionCall(): FormulaNode {
    const nameTok = expect("IDENT");
    expect("LPAREN");

    const args: FormulaNode[] = [];
    if (peek().type !== "RPAREN") {
      args.push(expr());
      while (peek().type === "COMMA") {
        advance();
        args.push(expr());
      }
    }

    expect("RPAREN");
    return { kind: "FunctionCall", name: nameTok.value, args };
  }

  // ── Parse entry point ─────────────────────────
  const result = expr();

  // Make sure we consumed all tokens (except EOF)
  if (peek().type !== "EOF") {
    const tok = peek();
    throw new Error(`Unexpected token ${tok.type} ("${tok.value}") at position ${tok.pos} — expected end of formula`);
  }

  return result;
}
