/**
 * Sanitizes a cell value by ensuring it's a trimmed string.
 *
 * @param {unknown} cell - The cell value to sanitize
 * @returns {string} A trimmed string or empty string if input is not a string
 */
function sanitizeCellValue (cell: unknown): string {
  // Ensure cell is a trimmed string, otherwise return empty string
  return typeof cell === 'string' ? cell.trim() : ''
}

/**
 * Normalizes a cue number based on the previous cue number and the current cell value.
 *
 * This function implements the following rules:
 * - If no previous cue number exists, returns '1'
 * - If the current cell value contains a dot (e.g., '1.4'), it's treated as part of a group:
 *   - If the previous cue was already part of a group, continues that group with incremented group number
 *   - If the previous cue was not part of a group, starts a new group with the previous cue as the parent
 * - If the current cell value doesn't contain a dot, increments the main cue number
 *
 * This means that cues with a group separator (dot) always get added to the previous cue's group
 * regardless of the actual number in the input. If no group separator is present, then they
 * are given the next sequential number.
 *
 * @param {unknown} cell - The cell value to normalize
 * @param {string} [previousCueNumber] - The previous normalized cue number
 * @returns {string} The normalized cue number
 */
function normalizeCueNumber (cell: unknown, previousCueNumber?: string) {
  if (!previousCueNumber) return '1'

  const cellValue = sanitizeCellValue(cell)
  const [, cellGroup] = cellValue.split('.')

  const [prevCue, prevGroup] = previousCueNumber.split('.')

  if (cellGroup) {
    // Always group with the previous cue, regardless of whether previous was a group
    if (prevGroup) {
      // Continue group
      return `${prevCue}.${parseInt(prevGroup) + 1}`
    }
    // Start new group
    return `${prevCue}.1`
  }

  // Not a group, increment main cue
  return `${parseInt(prevCue) + 1}`
}

/**
 * Parses a column of cue numbers and normalizes them according to a consistent numbering scheme.
 *
 * This function processes each cell in the column sequentially and normalizes the cue numbers
 * based on the following rules:
 *
 * 1. The first cue is always numbered '1'
 * 2. Cues with a group separator (dot) are always added to the previous cue's group
 *    regardless of the actual number in the input
 * 3. If no group separator is present, the cue gets the next sequential number
 *
 * Examples:
 * - Input: 1, 2, 3, 3.1, 3.2 → Output: 1, 2, 3, 3.1, 3.2
 *   (Ideal input from user, properly formatted groups)
 *
 * - Input: 12, 64, 23, 1.2 → Output: 1, 2, 3, 3.1
 *   (Chaotic input from user, normalized according to our logic)
 *   Note: If input includes a dot, it's treated as part of a group
 *
 * @param {Record<string, unknown>} column - Object containing row IDs as keys and cell values as values
 * @returns {Record<string, string>} Object with row IDs as keys and normalized cue numbers as values
 */
export function parseCueNumbersColumn (
  column: Record<string, unknown>,
): Record<string, string> {
  const cueNumbers = new Map<string, string>()
  const rowIds = Object.keys(column)

  rowIds.forEach((rowId, index) => {
    const previousCueNumber = cueNumbers.get(rowIds[index - 1])
    const cell = column[rowId]

    cueNumbers.set(rowId, normalizeCueNumber(cell, previousCueNumber))
  })

  return Object.fromEntries(cueNumbers)
}
