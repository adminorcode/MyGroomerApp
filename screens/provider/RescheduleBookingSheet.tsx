import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { MGButton, MGChip, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useRescheduleBooking, useRescheduleBookingSlots } from '../../hooks/useBooking'
import { getErrorMessage } from '../../utils/error'

type Props = {
  visible: boolean
  bookingId: string
  providerServiceId: string
  petId?: string | null
  onClose: () => void
  onSuccess: () => void
}

const timezone = 'America/Sao_Paulo'

function calendarDates(count: number) {
  const items: string[] = []
  const now = new Date()
  for (let offset = 0; offset < count; offset += 1) {
    const probe = new Date(now.getTime() + offset * 86400000)
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(probe).map(part => [part.type, part.value]))
    items.push(`${parts.year}-${parts.month}-${parts.day}`)
  }
  return items
}

function dateChipLabel(value: string) {
  const date = new Date(`${value}T12:00:00-03:00`)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

function slotLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(date)
}

export default function RescheduleBookingSheet({
  visible,
  bookingId,
  providerServiceId,
  petId,
  onClose,
  onSuccess,
}: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const dates = useMemo(() => calendarDates(14), [])
  const [date, setDate] = useState(dates[0] ?? '')
  const [slot, setSlot] = useState<string | null>(null)
  const slots = useRescheduleBookingSlots(bookingId, providerServiceId, petId, date, visible)
  const reschedule = useRescheduleBooking()
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!slot) return
    setError(null)
    try {
      await reschedule.mutateAsync({ bookingId, scheduled_at: slot })
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface.default, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.base }]}
          onPress={event => event.stopPropagation()}
        >
          <MGText variant="heading3" accessibilityRole="header">Reagendar atendimento</MGText>
          <MGText variant="bodySmall" color="secondary" style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            Escolha uma nova data e horário disponíveis.
          </MGText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
            {dates.map(item => (
              <MGChip
                key={item}
                label={dateChipLabel(item)}
                selected={item === date}
                onPress={() => { setDate(item); setSlot(null) }}
              />
            ))}
          </ScrollView>
          {slots.isLoading ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={colors.action.primary} />
            </View>
          ) : slots.isError ? (
            <MGText variant="bodySmall" color="error">Não foi possível carregar os horários.</MGText>
          ) : (slots.data?.length ?? 0) === 0 ? (
            <MGText variant="bodySmall" color="secondary">Nenhum horário livre neste dia.</MGText>
          ) : (
            <View style={[styles.slotGrid, { gap: spacing.sm, marginTop: spacing.sm }]}>
              {slots.data!.map(item => (
                <MGChip
                  key={item}
                  label={slotLabel(item)}
                  selected={slot === item}
                  onPress={() => setSlot(item)}
                />
              ))}
            </View>
          )}
          {error ? (
            <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginTop: spacing.md }}>{error}</MGText>
          ) : null}
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <MGButton label="Confirmar novo horário" onPress={() => { void submit() }} loading={reschedule.isPending} disabled={!slot || reschedule.isPending} />
            <MGButton label="Cancelar" variant="secondary" onPress={onClose} disabled={reschedule.isPending} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '80%' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
})
