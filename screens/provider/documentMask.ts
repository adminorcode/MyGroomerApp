export const documentDigits = (value: string) => value.replace(/\D/g, '').slice(0, 14)

export function formatDocument(value: string) {
  const digits = documentDigits(value)
  const groups = digits.length <= 11 ? [3, 3, 3, 2] : [2, 3, 3, 4, 2]
  const separators = digits.length <= 11 ? ['.', '.', '-'] : ['.', '.', '/', '-']
  let offset = 0
  return groups.reduce((formatted, size, index) => {
    const part = digits.slice(offset, offset + size)
    offset += size
    return part ? formatted + (index ? separators[index - 1] : '') + part : formatted
  }, '')
}

/** Keep the caret at the edited digit, including when a separator is deleted. */
export function editDocument(previous: string, next: string, forwardDelete = false) {
  let prefix = 0
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix++
  let suffix = 0
  while (suffix < previous.length - prefix && suffix < next.length - prefix && previous[previous.length - suffix - 1] === next[next.length - suffix - 1]) suffix++
  let digits = documentDigits(next)
  let digitPosition = documentDigits(next.slice(0, next.length - suffix)).length
  if (next.length < previous.length && digits === documentDigits(previous)) {
    // Removing only a mask character must still remove an adjacent digit.
    const before = documentDigits(previous.slice(0, prefix)).length
    const index = Math.max(0, before - (forwardDelete ? 0 : 1))
    digits = digits.slice(0, index) + digits.slice(index + 1)
    digitPosition = index
  }
  const formatted = formatDocument(digits)
  const target = Math.min(digitPosition, digits.length)
  let caret = 0
  let seen = 0
  while (caret < formatted.length && seen < target) {
    if (/\d/.test(formatted[caret])) seen++
    caret++
  }
  return { digits, caret }
}
