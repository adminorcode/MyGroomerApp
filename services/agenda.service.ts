import api from './api'
import { AgendaPayload } from '../types/agenda.types'

export const getProviderAgenda = async (from: string, to: string) => {
  const response = await api.get('/providers/agenda', { params: { from, to } })
  return response.data.data as AgendaPayload
}

export const createAgendaBlock = async (starts_at: string, ends_at: string) => {
  const response = await api.post('/providers/agenda-blocks', { starts_at, ends_at })
  return response.data
}

export const deleteAgendaBlock = async (blockId: string) => {
  await api.delete(`/providers/agenda-blocks/${blockId}`)
}
