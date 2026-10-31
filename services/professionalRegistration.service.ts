import api from './api'
import { ProfessionalRegistration } from '../screens/provider/professionalRegistrationModel'

export type ProfessionalType = { id: string; name: string }
export type RegistrationResponse = ProfessionalRegistration & { status: 'not_started' | 'draft' | 'completed' }

export async function getPublicProfessionalTypes(): Promise<ProfessionalType[]> {
  return (await api.get('/professional-types/public')).data.data
}

export async function getProfessionalRegistration(): Promise<RegistrationResponse> {
  return (await api.get('/providers/registration')).data.data
}

export async function saveProfessionalRegistration(value: ProfessionalRegistration, mode: 'draft' | 'continue', token?: string): Promise<RegistrationResponse> {
  return (await api.put('/providers/registration', { ...value, mode }, { timeout: 60000, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) })).data.data
}

export async function createProfessionalAccount(value: ProfessionalRegistration, password: string): Promise<{ email: string; requires_verification: boolean }> {
  const { name, email, phone_number, ...registration } = value
  return (await api.post('/auth/register', { name, email, phone_number, password, role: 'provider', registration }, { timeout: 60000 })).data
}
