export type RequestGroup = 'pending' | 'accepted' | 'rejected'

export type RequestGroupFilter = RequestGroup | 'all'

export type IncomingRequest = {
  id: string
  group: RequestGroup
  booking_status: string
  pet_name: string | null
  customer_name: string | null
  service_name: string | null
  scheduled_at: string
  customer_location: string | null
  price: number | null
}

export type IncomingRequestsPayload = {
  timezone: string
  group: RequestGroupFilter
  page: number
  limit: number
  pending_today_count: number
  requests: IncomingRequest[]
}
