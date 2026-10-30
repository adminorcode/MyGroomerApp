import { parseMoney, moneyToInput } from './serviceMenuModel'

export const RADIUS_OPTIONS = [3, 5, 8, 10] as const
export type RadiusKm = (typeof RADIUS_OPTIONS)[number]
export type TravelFeeMode = 'included' | 'on_request' | 'per_km'

export type ServiceLocation = {
  address: string | null
  postal_code: string | null
  complement: string | null
  latitude: number | null
  longitude: number | null
  label: string | null
  radius_km: RadiusKm | null
  travel_fee_mode: TravelFeeMode | null
  travel_fee_per_km: number | null
}

export type LocatedPoint = {
  latitude: number
  longitude: number
  label: string
}

export const FEE_OPTIONS: { id: TravelFeeMode; label: string }[] = [
  { id: 'included', label: 'Inclusa' },
  { id: 'on_request', label: 'Sob consulta' },
  { id: 'per_km', label: 'Por km' },
]

export function cepDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function formatCep(value: string) {
  const digits = cepDigits(value)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function canSaveLocation(input: {
  address: string
  postalCode: string
  picked: boolean
  radiusKm: RadiusKm | null
  travelFeeMode: TravelFeeMode | null
  travelFeePerKm: string
  located: boolean
}) {
  if (input.address.trim().length < 3 && cepDigits(input.postalCode).length !== 8) return false
  if (cepDigits(input.postalCode).length !== 8 && !input.picked) return false
  if (input.radiusKm == null) return false
  if (!input.travelFeeMode) return false
  if (!input.located) return false
  if (input.travelFeeMode === 'per_km') {
    const parsed = parseMoney(input.travelFeePerKm)
    if (!parsed.ok || parsed.value == null || parsed.value <= 0) return false
  }
  return true
}

export function feeAmount(mode: TravelFeeMode | null, value: string) {
  if (mode !== 'per_km') return null
  const parsed = parseMoney(value)
  return parsed.ok ? parsed.value : null
}

export function feeInput(value: number | null) {
  return moneyToInput(value)
}
