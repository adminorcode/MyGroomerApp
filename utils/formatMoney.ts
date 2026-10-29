const brl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

export function formatMoney(amount: number | string | null | undefined) {
    const value = typeof amount === 'number' ? amount : Number(amount)
    return brl.format(Number.isFinite(value) ? value : 0)
}
