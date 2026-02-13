/**
 * Combine a prefix with an index, with optional zero-padding.
 *
 * @param index   - The index number (0 or above)
 * @param prefix  - A string prefix to prepend
 * @param padding - Minimum number of digits for the index (zero-padded). Defaults to 0 (no padding).
 *
 * @example
 * // Basic concatenation
 * getIndexWithPrefix(0, 'A')              // 'A0'
 * getIndexWithPrefix(10, 'C')             // 'C10'
 * getIndexWithPrefix(1, 'DAY1_')          // 'DAY1_1'
 * getIndexWithPrefix(100, 'SESSIONA-')    // 'SESSIONA-100'
 *
 * // Empty prefix
 * getIndexWithPrefix(5, '')               // '5'
 *
 * // With padding
 * getIndexWithPrefix(1, 'A', 3)           // 'A001'
 * getIndexWithPrefix(1, '', 3)            // '001'
 * getIndexWithPrefix(72, '', 2)           // '72'
 * getIndexWithPrefix(72, '', 4)           // '0072'
 * getIndexWithPrefix(1000, 'ITEM-', 2)    // 'ITEM-1000'
 */
export function getIndexWithPrefix(index: number, prefix: string, padding: number = 0): string {
  const str = String(index)
  const padded = padding > 0
    ? '0'.repeat(Math.max(0, padding - str.length)) + str
    : str

  return `${prefix}${padded}`
}
