function parseCell (cell: unknown): string {
  // Ensure cell is a trimmed string, otherwise return empty string
  return typeof cell === 'string' ? cell.trim() : ''
}

/**
 * Normalizes the cue number based on the previous cue number and current cell value.
 */
function normalizeCueNumber (cell: unknown, previousCueNumber?: string) {
  if (!previousCueNumber) return '1'

  const cellValue = parseCell(cell)
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
 * Parses and normalizes a column of cue numbers.
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
