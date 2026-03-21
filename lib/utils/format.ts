/**
 * Shared formatting utilities used across server-side context builders
 * and client-side components.
 */

/**
 * Formats a dollar value in compact notation (K/M).
 * Handles negative values with a leading minus before the $ sign.
 * Returns 'N/A' for null/undefined.
 *
 * Examples: 1_500_000 → '$1.50M', -75_000 → '-$75.0K', 500 → '$500'
 */
export function formatDollar(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Calculates percentage change from `from` to `to`.
 * Returns null when inputs are null or `from` is zero (division undefined).
 */
export function pctChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}
