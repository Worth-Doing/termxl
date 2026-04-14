/**
 * Formula function registry.
 *
 * In this implementation, all built-in functions are defined directly
 * in the evaluator (evaluator.ts) to avoid circular dependencies.
 * This module re-exports function-related utilities for external use.
 *
 * If you need to check whether a function name is valid, use
 * `isKnownFunction()`.
 */

const KNOWN_FUNCTIONS = new Set([
  "SUM", "AVERAGE", "AVG", "COUNT", "COUNTA",
  "MIN", "MAX", "ABS", "ROUND", "IF",
  "AND", "OR", "NOT", "CONCAT", "CONCATENATE",
  "LEN", "INT", "MOD", "POWER", "SQRT",
  "PI", "UPPER", "LOWER",
]);

export function isKnownFunction(name: string): boolean {
  return KNOWN_FUNCTIONS.has(name.toUpperCase());
}

export function listFunctions(): string[] {
  return Array.from(KNOWN_FUNCTIONS).sort();
}
