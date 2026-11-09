import MGBadge, { MGBadgeTone } from '../../design-system/components/MGBadge'
import { TransactionStatus } from '../../types/transaction.types'

// CMP-18 / R6: status com semântica de feedback e texto (migrado para MGBadge).
const TONE: Record<TransactionStatus, { label: string; tone: MGBadgeTone }> = {
    [TransactionStatus.PENDING]: { label: 'Pendente', tone: 'pending' },
    [TransactionStatus.COMPLETED]: { label: 'Concluído', tone: 'success' },
    [TransactionStatus.CANCELLED]: { label: 'Cancelado', tone: 'error' },
}

export default function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
    const config = TONE[status] ?? { label: String(status), tone: 'neutral' as MGBadgeTone }
    return <MGBadge label={config.label} tone={config.tone} />
}
