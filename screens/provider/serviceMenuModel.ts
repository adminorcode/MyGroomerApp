export type SizeKey = 'small' | 'medium' | 'large'

export const SIZE_KEYS: SizeKey[] = ['small', 'medium', 'large']

export const SIZE_LABELS: Record<SizeKey, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
}

export type MenuSuggestion = {
  service_id: string
  name: string
  description: string | null
  category_id: string
  category_name: string
}

export type MenuType = { id: string; name: string }
export type MenuCategory = { id: string; name: string }

export type MenuOffer = {
  id: string
  service_id: string | null
  custom_name: string | null
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  is_active: boolean
  professional_type_id: string | null
  professional_type_name: string | null
  prices: Record<SizeKey, number | null>
  durations_minutes: Record<SizeKey, number | null>
}

export type ServiceMenu = {
  offers: MenuOffer[]
  suggestions: MenuSuggestion[]
  types: MenuType[]
  categories: MenuCategory[]
}

export type DraftOffer = {
  key: string
  id?: string
  service_id: string | null
  custom_name: string
  category_id: string | null
  name: string
  description: string
  is_active: boolean
  professional_type_id: string | null
  professionalTypeName: string | null
  prices: Record<SizeKey, string>
  durations: Record<SizeKey, string>
  suggestion: MenuSuggestion | null
}

export type DraftState = {
  offers: DraftOffer[]
  suggestions: MenuSuggestion[]
  types: MenuType[]
  categories: MenuCategory[]
}

export type ParsedNumber = { ok: true; value: number | null } | { ok: false }

const blankSizes = (): Record<SizeKey, string> => ({ small: '', medium: '', large: '' })

export function moneyToInput(value: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return ''
  return Number(value).toFixed(2).replace('.', ',')
}

export function parseMoney(input: string): ParsedNumber {
  const trimmed = input.trim()
  if (!trimmed) return { ok: true, value: null }
  const normalized = trimmed.replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false }
  const value = Number(normalized)
  if (!(value > 0) || value > 100000) return { ok: false }
  return { ok: true, value }
}

export function parseMinutes(input: string): ParsedNumber {
  const trimmed = input.trim()
  if (!trimmed) return { ok: true, value: null }
  if (!/^\d+$/.test(trimmed)) return { ok: false }
  const value = Number(trimmed)
  if (value < 1 || value > 600) return { ok: false }
  return { ok: true, value }
}

export function offerTitle(offer: DraftOffer): string {
  return offer.name.trim() || offer.custom_name.trim() || 'Novo serviço'
}

export function toDraftState(menu: ServiceMenu): DraftState {
  return {
    types: menu.types,
    categories: menu.categories,
    suggestions: menu.suggestions,
    offers: menu.offers.map(offer => ({
      key: offer.id,
      id: offer.id,
      service_id: offer.service_id,
      custom_name: offer.custom_name ?? '',
      category_id: offer.category_id,
      name: offer.name,
      description: offer.description ?? '',
      is_active: offer.is_active,
      professional_type_id: offer.professional_type_id,
      professionalTypeName: offer.professional_type_name,
      prices: {
        small: moneyToInput(offer.prices.small),
        medium: moneyToInput(offer.prices.medium),
        large: moneyToInput(offer.prices.large),
      },
      durations: {
        small: offer.durations_minutes.small == null ? '' : String(offer.durations_minutes.small),
        medium: offer.durations_minutes.medium == null ? '' : String(offer.durations_minutes.medium),
        large: offer.durations_minutes.large == null ? '' : String(offer.durations_minutes.large),
      },
      suggestion: null,
    })),
  }
}

function isEmpty(item: ParsedNumber) {
  return item.ok && item.value == null
}

export function menuIssue(offers: DraftOffer[], typeIds: Set<string>): string | null {
  for (const offer of offers) {
    const money = SIZE_KEYS.map(size => parseMoney(offer.prices[size]))
    const durations = SIZE_KEYS.map(size => parseMinutes(offer.durations[size]))
    if (money.some(item => !item.ok) || durations.some(item => !item.ok)) {
      return 'Informe preços maiores que zero, com no máximo duas casas decimais, e durações inteiras de 1 a 600 minutos.'
    }
    const untitled = !offer.service_id && !offer.custom_name.trim()
    const untouched = untitled && !offer.description.trim()
      && money.every(isEmpty)
      && durations.every(isEmpty)
    if (untouched && !offer.id) continue
    if (!offer.is_active) continue
    if (untitled) return 'Informe o nome do serviço.'
    if (!offer.service_id && !offer.category_id) return 'Escolha a categoria do serviço.'
    if (!offer.professional_type_id) return 'Escolha o tipo de cada serviço ativo antes de continuar.'
    if (!typeIds.has(offer.professional_type_id)) {
      return 'Não é possível publicar serviço em um tipo que a conta não escolheu ou que está inativo.'
    }
    if (!offer.description.trim() || money.some(isEmpty) || durations.some(isEmpty)) {
      return 'Complete a descrição, o preço e a duração de cada porte antes de continuar.'
    }
  }
  return null
}

export function toMenuPayload(offers: DraftOffer[]) {
  return offers.flatMap(offer => {
    const money = SIZE_KEYS.map(size => parseMoney(offer.prices[size]))
    const durations = SIZE_KEYS.map(size => parseMinutes(offer.durations[size]))
    const untitled = !offer.service_id && !offer.custom_name.trim()
    const untouched = untitled && !offer.id && !offer.description.trim()
      && money.every(isEmpty)
      && durations.every(isEmpty)
    if (untouched) return []
    const prices = {
      small: money[0].ok ? money[0].value : null,
      medium: money[1].ok ? money[1].value : null,
      large: money[2].ok ? money[2].value : null,
    }
    const durationsMinutes = {
      small: durations[0].ok ? durations[0].value : null,
      medium: durations[1].ok ? durations[1].value : null,
      large: durations[2].ok ? durations[2].value : null,
    }
    return [{
      ...(offer.id ? { id: offer.id } : {}),
      service_id: offer.service_id,
      custom_name: offer.service_id ? null : offer.custom_name.trim() || null,
      category_id: offer.category_id,
      professional_type_id: offer.professional_type_id,
      description: offer.description.trim() || null,
      is_active: offer.is_active,
      prices,
      durations_minutes: durationsMinutes,
    }]
  })
}

export function emptyCustom(key: string, categoryId: string | null, typeId: string | null, typeName: string | null): DraftOffer {
  return {
    key,
    service_id: null,
    custom_name: '',
    category_id: categoryId,
    name: '',
    description: '',
    is_active: true,
    professional_type_id: typeId,
    professionalTypeName: typeName,
    prices: blankSizes(),
    durations: blankSizes(),
    suggestion: null,
  }
}
