import api from './api'
import { IncomingRequestsPayload, RequestGroupFilter } from '../types/request.types'

// 100 é o máximo aceito pelo contrato da lista.
export const REQUESTS_PAGE_LIMIT = 100

export const getProviderRequests = async (group: RequestGroupFilter) => {
  const response = await api.get('/providers/requests', { params: { group, limit: REQUESTS_PAGE_LIMIT } })
  return response.data.data as IncomingRequestsPayload
}
