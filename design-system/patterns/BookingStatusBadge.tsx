import { BookingStatus } from '../../types/booking.types'
import MGBadge, { MGBadgeTone } from '../components/MGBadge'

const CONFIG: Record<BookingStatus, { label: string; tone: MGBadgeTone }> = {
  [BookingStatus.PENDING_PAYMENT]: { label: 'Pagamento pendente', tone: 'warning' },
  [BookingStatus.PENDING_CONFIRMATION]: { label: 'Aguardando confirmação', tone: 'pending' },
  [BookingStatus.CONFIRMED]: { label: 'Confirmado', tone: 'confirmed' },
  [BookingStatus.IN_PROGRESS]: { label: 'Em andamento', tone: 'info' },
  [BookingStatus.COMPLETED]: { label: 'Concluído', tone: 'success' },
  [BookingStatus.CANCELLED]: { label: 'Cancelado', tone: 'neutral' },
}

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = CONFIG[status] ?? { label: String(status), tone: 'neutral' as MGBadgeTone }
  return <MGBadge label={label} tone={tone} />
}
