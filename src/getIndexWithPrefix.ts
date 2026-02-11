/**
 * Combine a prefix with an index.
 *
 * If the prefix consists entirely of zeroes (e.g. "0", "00") it is treated as
 * padding — the index is zero-padded so the total digit count is at least
 * `prefix.length + 1`.
 *
 * Otherwise the prefix and index are simply concatenated.
 *
 * @example
 * // Basic concatenation
 * getIndexWithPrefix(0, 'A')           // 'A0'
 * getIndexWithPrefix(10, 'C')          // 'C10'
 * getIndexWithPrefix(1, 'DAY1_')       // 'DAY1_1'
 * getIndexWithPrefix(100, 'SESSIONA-') // 'SESSIONA-100'
 *
 * // Empty prefix
 * getIndexWithPrefix(5, '')            // '5'
 *
 * // Padding (prefix is all zeroes)
 * getIndexWithPrefix(1, '0')           // '01'
 * getIndexWithPrefix(10, '0')          // '10'
 * getIndexWithPrefix(1, '00')          // '001'
 * getIndexWithPrefix(72, '00')         // '072'
 * getIndexWithPrefix(72, '000')        // '0072'
 * getIndexWithPrefix(0, '00')          // '000'
 * getIndexWithPrefix(1000, '00')       // '1000'
 *
 * // Zeroes mixed with other chars (no padding, just concatenation)
 * getIndexWithPrefix(5, 'A0')          // 'A05'
 * getIndexWithPrefix(12, 'A0')         // 'A012'
 * getIndexWithPrefix(3, 'ITEM0')       // 'ITEM03'
 * getIndexWithPrefix(12, 'ITEM0')      // 'ITEM012'
 */
export function getIndexWithPrefix(index: number, prefix: string): string {
  if (/^0+$/.test(prefix)) {
    const width = prefix.length + 1
    const str = String(index)
    const padding = '0'.repeat(Math.max(0, width - str.length))
    return padding + str
  }

  return `${prefix}${index}`
}
