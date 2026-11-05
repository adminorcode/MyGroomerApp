/** Exibe telefone brasileiro a partir de E.164 ou dígitos locais. */
export function formatDisplayPhone(value?: string | null): string {
  if (!value?.trim()) return 'Telefone não informado'

  const digits = value.replace(/\D/g, '')
  if (!digits) return 'Telefone não informado'

  let ddd: string
  let subscriber: string
  let withCountry = false

  if (digits.startsWith('55') && digits.length >= 12) {
    withCountry = true
    ddd = digits.slice(2, 4)
    subscriber = digits.slice(4)
  } else if (digits.length === 10 || digits.length === 11) {
    ddd = digits.slice(0, 2)
    subscriber = digits.slice(2)
  } else {
    return value.trim()
  }

  let local: string
  if (subscriber.length === 9) {
    local = `(${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`
  } else if (subscriber.length === 8) {
    local = `(${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`
  } else {
    return value.trim()
  }

  return withCountry ? `+55 ${local}` : local
}
