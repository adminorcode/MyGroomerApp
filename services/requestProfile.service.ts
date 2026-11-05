import { RequestProfile } from '../types/requestProfile.types'
import api from './api'

export const getRequestProfile = async (bookingId: string) => {
  const response = await api.get(`/providers/requests/${bookingId}/profile`)
  return response.data.data as RequestProfile
}

export const saveAnamnesisNote = async (bookingId: string, note: string) => {
  const response = await api.put(`/providers/requests/${bookingId}/anamnesis-note`, { note })
  return response.data.data as RequestProfile['notes'][number]
}
