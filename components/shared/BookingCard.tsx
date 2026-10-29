import { BookingCardTypes } from '../../types/booking.types'
import AgendaAppointmentCard from '../../design-system/patterns/AgendaAppointmentCard'

/** @deprecated Prefer AgendaAppointmentCard from design-system/patterns. */
export function BookingCard({
  service_name,
  provider_name,
  price,
  scheduled_at,
  customer_location,
  booking_status,
  showChevron,
  onPress,
  perspective,
  customer_name,
}: BookingCardTypes) {
  return (
    <AgendaAppointmentCard
      service_name={service_name}
      provider_name={provider_name}
      price={price}
      scheduled_at={scheduled_at}
      customer_location={customer_location}
      booking_status={booking_status}
      showChevron={showChevron}
      onPress={onPress}
      perspective={perspective}
      customer_name={customer_name}
    />
  )
}
