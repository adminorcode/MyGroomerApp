const WEIGHT = /^\d{1,3}(,\d{1,2})?$/

export function maskWeightKg(input: string): string {
    const cleaned = input.replace(/\./g, ',').replace(/[^\d,]/g, '')
    const comma = cleaned.indexOf(',')
    const wholeRaw = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/\D/g, '')
    const fraction = comma === -1 ? '' : cleaned.slice(comma + 1).replace(/\D/g, '').slice(0, 2)
    const whole = wholeRaw.replace(/^0+(?=\d)/, '').slice(0, 3)
    if (comma === -1) return whole
    return `${whole || '0'},${fraction}`
}

/** Keeps the caret on the edited digit. Backspace or Delete on the comma removes the adjacent digit. */
export function editWeightKg(previous: string, next: string, forwardDelete = false): { value: string, caret: number } {
    const previousDigits = previous.replace(/\D/g, '')
    const nextDigits = next.replace(/\D/g, '')
    if (next.length < previous.length && nextDigits === previousDigits && previous.includes(',')) {
        const comma = previous.indexOf(',')
        const whole = previous.slice(0, comma).replace(/\D/g, '')
        const fraction = previous.slice(comma + 1).replace(/\D/g, '')
        if (!forwardDelete) {
            const nextWhole = whole.slice(0, -1)
            const value = maskWeightKg(fraction.length ? `${nextWhole},${fraction}` : nextWhole)
            const caret = maskWeightKg(nextWhole === '' && fraction.length ? '0' : nextWhole).length
            return { value, caret: Math.min(caret, value.length) }
        }
        const nextFraction = fraction.slice(1)
        const value = maskWeightKg(nextFraction.length ? `${whole},${nextFraction}` : whole)
        const caret = maskWeightKg(nextFraction.length ? `${whole},` : whole).length
        return { value, caret: Math.min(caret, value.length) }
    }

    // "0,5" cannot drop the leading zero and stay a decimal. Deleting that zero clears the field.
    if (previous.startsWith('0,') && next === previous.slice(1)) return { value: '', caret: 0 }

    let prefix = 0
    while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix++
    let suffix = 0
    while (
        suffix < previous.length - prefix &&
        suffix < next.length - prefix &&
        previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) suffix++
    const value = maskWeightKg(next)
    const rawCaret = next.length - suffix
    const maskedBefore = maskWeightKg(next.slice(0, rawCaret))
    let caret = 0
    while (caret < maskedBefore.length && caret < value.length && maskedBefore[caret] === value[caret]) caret++
    return { value, caret }
}

export function parseWeightKg(masked: string): number | null {
    const trimmed = masked.trim()
    if (!WEIGHT.test(trimmed)) return null
    const value = Number(trimmed.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0 || value > 999.99) return null
    return value
}

export function weightKgError(masked: string): string | null {
    const trimmed = masked.trim()
    if (!trimmed) return 'Informe o peso em kg'
    if (!WEIGHT.test(trimmed)) return 'Informe o peso em kg'
    const value = Number(trimmed.replace(',', '.'))
    if (!(value > 0)) return 'O peso precisa ser maior que zero'
    if (value > 999.99) return 'Informe um peso de até 999,99 kg'
    return null
}

export function formatWeightKg(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value) || value <= 0) return ''
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatWeightLabel(value: number | null | undefined): string {
    const formatted = formatWeightKg(value)
    return formatted ? `${formatted} kg` : 'Não informado'
}
