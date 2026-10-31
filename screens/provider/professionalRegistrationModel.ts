export type RegistrationAttachment = {
  id?: string
  name: string
  mime_type: string
  size: number
  base64?: string
}

export type ProfessionalRegistration = {
  name: string
  email: string
  phone_number: string
  document: string
  experience: string
  certifications: string
  professional_type_ids: string[]
  attachments: RegistrationAttachment[]
}

export type ProfessionalRegistrationDraft = ProfessionalRegistration & {
  // Nonsecret recovery metadata only. Credentials never enter a draft.
  registered_email?: string
}

export const emptyRegistration: ProfessionalRegistration = {
  name: '', email: '', phone_number: '', document: '', experience: '', certifications: '',
  professional_type_ids: [], attachments: [],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FILES = 5
export const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits ? `+${digits.length > 11 && digits.startsWith('55') ? digits : `55${digits}`}` : ''
}

export function isValidDocument(value: string) {
  const digits = value.replace(/\D/g, '')
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false
  const numbers = [...digits].map(Number)
  const check = (length: number, weights: number[]) => {
    const sum = numbers.slice(0, length).reduce((total, digit, index) => total + digit * weights[index], 0)
    const remainder = sum % 11
    return (remainder < 2 ? 0 : 11 - remainder) === numbers[length]
  }
  if (digits.length === 11) {
    return check(9, [10, 9, 8, 7, 6, 5, 4, 3, 2]) && check(10, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  }
  return check(12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) && check(13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
}

export function registrationErrors(value: ProfessionalRegistration, password?: string) {
  const errors: Partial<Record<keyof ProfessionalRegistration | 'password', string>> = {}
  if (value.name.trim().split(/\s+/).length < 2 || value.name.trim().length > 150) errors.name = 'Informe seu nome completo (até 150 caracteres).'
  if (!isValidDocument(value.document)) errors.document = 'Informe um CPF ou CNPJ válido.'
  if (!/^\+55[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(normalizePhone(value.phone_number))) errors.phone_number = 'Informe um telefone brasileiro válido com DDD.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!value.experience.trim()) errors.experience = 'Conte sua experiência profissional.'
  if (!value.certifications.trim()) errors.certifications = 'Informe suas certificações ou formação.'
  if (!value.professional_type_ids.length) errors.professional_type_ids = 'Selecione pelo menos um tipo de atuação.'
  if (password !== undefined && (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password))) {
    errors.password = 'Use 8 ou mais caracteres, com maiúscula, minúscula, número e símbolo.'
  }
  return errors
}

export function registrationPayload(value: ProfessionalRegistration): ProfessionalRegistration {
  return {
    name: value.name.trim(), email: value.email.trim().toLowerCase(),
    phone_number: normalizePhone(value.phone_number), document: value.document.replace(/\D/g, ''),
    experience: value.experience.trim(), certifications: value.certifications.trim(),
    professional_type_ids: value.professional_type_ids, attachments: value.attachments,
  }
}
