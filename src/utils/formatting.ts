/**
 * Centralized formatting utilities for consistent display across the app.
 * 
 * DATABASE CONVENTION: Percentages are stored as decimals (0.233 = 23.3%).
 * Always use these utilities to display them correctly.
 */

/**
 * Format a percentage value for display.
 * Value is displayed as-is — callers must pass the final display number.
 * E.g. pass 23.3 to display "23.3%", NOT 0.233.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Convert a decimal percentage (0.233) to display percentage (23.3).
 * Use this when preparing chart data so axes/tooltips work with whole numbers.
 * Caller must know the value is a decimal (0–1 range meaning 0–100%).
 */
export function toDisplayPercent(value: number): number {
  return value * 100;
}

/**
 * Format a currency value for display.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a compact currency value (e.g., $12.3K).
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    notation: 'compact',
  }).format(value);
}
