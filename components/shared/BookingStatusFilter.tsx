import { ScrollView, StyleSheet } from 'react-native'
import { BookingStatus } from '../../types/booking.types'
import { MGChip } from '../../design-system/components'
import { spacing } from '../../design-system/tokens'

export type BookingStatusFilterOption = {
    label: string
    value?: BookingStatus
}

export const BOOKING_STATUS_FILTERS: BookingStatusFilterOption[] = [
    { label: 'Todos' },
    { label: 'Pagamento pendente', value: BookingStatus.PENDING_PAYMENT },
    { label: 'Aguardando confirmação', value: BookingStatus.PENDING_CONFIRMATION },
    { label: 'Confirmado', value: BookingStatus.CONFIRMED },
    { label: 'Em andamento', value: BookingStatus.IN_PROGRESS },
    { label: 'Concluído', value: BookingStatus.COMPLETED },
    { label: 'Cancelado', value: BookingStatus.CANCELLED },
]

type Props = {
    selected?: BookingStatus
    onSelect: (value?: BookingStatus) => void
    options?: BookingStatusFilterOption[]
}

/**
 * Filtro por status da lista de agendamentos (R1: selecionado sempre em `action.primary`).
 * Usa MGChip, que aplica a regra de ação rosa e o texto branco no estado selecionado.
 */
export default function BookingStatusFilter({ selected, onSelect, options = BOOKING_STATUS_FILTERS }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.content}
        >
            {options.map((option) => (
                <MGChip
                    key={option.label}
                    label={option.label}
                    selected={selected === option.value}
                    onPress={() => onSelect(option.value)}
                />
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 0,
    },
    content: {
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
})
