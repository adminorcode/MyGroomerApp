import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'
import { BookingStatus } from '../../types/booking.types'

export type BookingStatusFilterOption = {
    label: string
    value?: BookingStatus
}

export const BOOKING_STATUS_FILTERS: BookingStatusFilterOption[] = [
    { label: 'All' },
    { label: 'Pending Payment', value: BookingStatus.PENDING_PAYMENT },
    { label: 'Awaiting Confirmation', value: BookingStatus.PENDING_CONFIRMATION },
    { label: 'Confirmed', value: BookingStatus.CONFIRMED },
    { label: 'In Progress', value: BookingStatus.IN_PROGRESS },
    { label: 'Completed', value: BookingStatus.COMPLETED },
    { label: 'Cancelled', value: BookingStatus.CANCELLED },
]

type Props = {
    selected?: BookingStatus
    onSelect: (value?: BookingStatus) => void
    options?: BookingStatusFilterOption[]
}

export default function BookingStatusFilter({ selected, onSelect, options = BOOKING_STATUS_FILTERS }: Props) {
    const { colors } = useTheme()

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.content}
        >
            {options.map((option) => {
                const isActive = selected === option.value
                return (
                    <Pressable
                        key={option.label}
                        onPress={() => onSelect(option.value)}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isActive ? colors.selection : colors.surface,
                                borderColor: isActive ? colors.selection : colors.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                { color: isActive ? colors.onSelection : colors.textSecondary },
                            ]}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                )
            })}
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
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    chipText: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.medium,
    },
})
