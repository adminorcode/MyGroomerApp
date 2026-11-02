export type AgendaAppointment = {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  booking_status: string
  customer_name: string | null
  customer_location: string | null
  service_name: string | null
  pet_name: string | null
  pet_photo_url: string | null
}

export type AgendaInterval = {
  id: string
  starts_at: string
  ends_at: string
}

export type AgendaPayload = {
  timezone: string
  appointments: AgendaAppointment[]
  blocks: AgendaInterval[]
  manual_appointments: AgendaInterval[]
}
