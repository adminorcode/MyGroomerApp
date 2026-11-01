import { Pressable, StyleSheet, View } from 'react-native'
import { CalendarClock } from 'lucide-react-native'
import MGChip from '../components/MGChip'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type TimeSlotOption = {
  id: string
  label: string
  disabled?: boolean
}

type Props = {
  /** When slots are provided, shows selectable chips. */
  slots?: TimeSlotOption[]
  selectedSlotId?: string
  onSelectSlot?: (id: string) => void
  /** Fallback datetime summary (current BookService flow). */
  dateTimeLabel?: string
  onPressDateTime?: () => void
  helperText?: string
}

export default function TimeSlotPicker({
  slots,
  selectedSlotId,
  onSelectSlot,
  dateTimeLabel,
  onPressDateTime,
  helperText,
}: Props) {
  const { colors, spacing, radius } = useMGTheme()

  if (slots && slots.length > 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        <MGText variant="label">Horários disponíveis</MGText>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {slots.map((slot) => (
            <View key={slot.id} style={{ width: '30%', flexGrow: 1, maxWidth: '33%' }}>
            <MGChip
              label={slot.label}
              minHeight={48}
              density="compact"
              appearance="solid"
              selected={selectedSlotId === slot.id}
              disabled={slot.disabled}
              onPress={slot.disabled ? undefined : () => onSelectSlot?.(slot.id)}
            />
            </View>
          ))}
        </View>
        {helperText ? (
          <MGText variant="caption" color="secondary">
            {helperText}
          </MGText>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <MGText variant="label">Data e horário</MGText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dateTimeLabel ?? 'Escolher data e horário'}
        onPress={onPressDateTime}
        style={({ pressed }) => [
          styles.datetime,
          {
            borderColor: colors.border.default,
            backgroundColor: pressed ? colors.state.pressedSurface : colors.surface.default,
            borderRadius: radius.md,
            padding: spacing.md,
            minHeight: 52,
            gap: spacing.sm,
          },
        ]}
      >
        <CalendarClock size={20} color={colors.action.primary} />
        <MGText variant="body">{dateTimeLabel ?? 'Escolher data e horário'}</MGText>
      </Pressable>
      {helperText ? (
        <MGText variant="caption" color="secondary">
          {helperText}
        </MGText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  datetime: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
  },
})
