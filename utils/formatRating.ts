export function formatRating(value: number | string | null | undefined) {
    const rating = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(rating) || rating <= 0) return 'Sem avaliações'
    return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
