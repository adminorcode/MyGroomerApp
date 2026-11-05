export type RequestProfile = {
  booking: {
    id: string
    booking_status: string
    scheduled_at: string
    service_name: string
    customer_location: string | null
  }
  customer: {
    name: string
    phone_number: string | null
    previous_bookings_with_provider: number
  }
  pet: {
    id: string
    name: string
    species: string
    breed: string
    size: string
    age_years: number
    notes: string | null
    photo_url: string | null
  } | null
  anamnesis: {
    allergies: string | null
    medications: string | null
    health_conditions: string | null
    vaccination_up_to_date: boolean | null
    behavior: string | null
    special_care: string | null
  } | null
  notes: {
    id: string
    booking_id: string
    note: string
    created_at: string
  }[]
  history: {
    booking_id: string
    completed_at: string
    service_name: string
    provider_name: string
    own: boolean
    price: number | null
  }[]
}
