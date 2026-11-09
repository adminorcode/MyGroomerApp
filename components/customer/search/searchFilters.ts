import { CoverageProvider } from '../../../types/provider.types'

export type SearchPanel = 'filtros' | 'ordenar' | 'preco' | 'avaliacao' | 'raio'
export type SearchSort = 'relevance' | 'price' | 'rating' | 'distance' | 'today'
export type SearchFilterValues = {
  categoryId: string
  serviceId: string
  minPrice: number | null
  maxPrice: number | null
  minRating: number | null
  onlyReviewed: boolean
  maxKm: number | null
  sortKey: SearchSort
}

export function filterSearchProviders(providers: CoverageProvider[], filters: SearchFilterValues, onlyToday: boolean) {
  const hasPrice = filters.minPrice != null || filters.maxPrice != null
  const matching: CoverageProvider[] = []
  for (const provider of providers) {
    if (onlyToday && !provider.available_today) continue
    if ((filters.onlyReviewed || filters.minRating != null) && provider.review_count <= 0) continue
    if (filters.minRating != null && Number(provider.average_rating) < filters.minRating) continue
    if (filters.maxKm != null && provider.distance_km > filters.maxKm) continue
    if (!hasPrice) {
      matching.push(provider)
      continue
    }
    const offers = provider.services.filter(service => {
      const price = Number(service.price)
      return Number.isFinite(price) && (filters.minPrice == null || price >= filters.minPrice) && (filters.maxPrice == null || price <= filters.maxPrice)
    })
    if (!offers.length) continue
    const cheapest = offers.reduce((left, right) => Number(left.price) <= Number(right.price) ? left : right)
    matching.push({ ...provider, services: offers, price: cheapest.price, id: cheapest.id, service_id: cheapest.service_id ?? provider.service_id, service_name: cheapest.service_name })
  }
  // Relevância preserva a ordem da API: não há score personalizado no contrato.
  if (filters.sortKey === 'relevance') return matching
  return matching.sort((left, right) => {
    if (filters.sortKey === 'price') return Number(left.price) - Number(right.price) || left.distance_km - right.distance_km
    if (filters.sortKey === 'rating') return Number(right.average_rating) - Number(left.average_rating) || right.review_count - left.review_count
    if (filters.sortKey === 'today') return Number(Boolean(right.available_today)) - Number(Boolean(left.available_today)) || left.distance_km - right.distance_km
    return left.distance_km - right.distance_km
  })
}

/** Campos aceitam valores monetários pt-BR sem arredondamento implícito. */
export function parseFilterPrice(value: string): number | null | 'invalid' {
  const trimmed = value.trim().replace(/^R\$\s*/i, '')
  if (!trimmed) return null
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(trimmed)) return 'invalid'
  const number = Number(trimmed.replaceAll('.', '').replace(',', '.'))
  return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER / 100 ? number : 'invalid'
}
