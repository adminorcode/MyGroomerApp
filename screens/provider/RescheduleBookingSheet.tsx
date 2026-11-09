import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { MGButton, MGCard, MGChip, MGIcon, MGText } from '../../design-system/components'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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

/**
 * Data da lista: selecionada em action.primary (R1); data atual não selecionada em tealSubtle com texto
 * text.primary (plano 027, tela 41). Mesma medida do MGChip, que não aceita fundo próprio.
 */
function DateOption({ label, selected, isToday, onPress }: { label: string; selected: boolean; isToday: boolean; onPress: () => void }) {
  const { colors, spacing, radius } = useMGTheme()
  const textColor = selected ? colors.onAction.primary : colors.text.primary
  const background = selected ? colors.action.primary : isToday ? colors.surface.tealSubtle : colors.surface.default

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateOption,
        {
          minHeight: 44,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? colors.action.primary : colors.action.primaryOutline,
          backgroundColor: pressed && !selected ? colors.surface.pinkSubtle : background,
        },
      ]}
    >
      <View style={[styles.dateRow, { gap: spacing.xs }]}>
        {selected ? <MGIcon name="check" size={14} color={textColor} /> : null}
        <MGText variant="label" numberOfLines={1} style={{ color: textColor }}>{label}</MGText>
      </View>
    </Pressable>
  )
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
  const insets = useSafeAreaInsets()
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
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay.scrim }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          onPress={event => event.stopPropagation()}
        >
          {/* CMP-05 / Q1: cabeçalho teal da folha, com texto inverso (branco) sobre a faixa. */}
          <View style={{ backgroundColor: colors.brand.teal, paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
            <MGText variant="heading2" color="inverse" accessibilityRole="header">Reagendar atendimento</MGText>
            <MGText variant="bodySmall" color="inverse" style={{ marginTop: spacing.xs }}>
              Escolha uma nova data e horário disponíveis.
            </MGText>
          </View>
          <View style={{ flexShrink: 1, padding: spacing.base, paddingBottom: spacing.base + insets.bottom }}>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: spacing.sm }} keyboardShouldPersistTaps="handled">
              <MGCard>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                  <MGIcon name="calendar-days" color={colors.action.primary} size={20} />
                  <MGText variant="title">Nova data</MGText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
                  {dates.map(item => (
                    <DateOption
                      key={item}
                      label={dateChipLabel(item)}
                      selected={item === date}
                      isToday={item === dates[0]}
                      onPress={() => { setDate(item); setSlot(null) }}
                    />
                  ))}
                </ScrollView>
              </MGCard>
              <View style={{ marginTop: spacing.md }}>
                <MGCard>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                    <MGIcon name="clock-3" color={colors.action.primary} size={20} />
                    <MGText variant="title">Novo horário</MGText>
                  </View>
                  {slots.isLoading ? (
                    <View accessibilityRole="progressbar" accessibilityLabel="Carregando horários disponíveis" style={{ paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
                      <ActivityIndicator color={colors.action.primary} />
                      <MGText variant="bodySmall" color="secondary">Carregando horários disponíveis</MGText>
                    </View>
                  ) : slots.isError ? (
                    <View style={{ gap: spacing.sm }}>
                      <MGText variant="bodySmall" color="error" accessibilityRole="alert">Não foi possível carregar os horários.</MGText>
                      <MGButton label="Tentar novamente" variant="secondary" onPress={() => { void slots.refetch() }} />
                    </View>
                  ) : (slots.data?.length ?? 0) === 0 ? (
                    <MGText variant="bodySmall" color="secondary">Nenhum horário livre neste dia.</MGText>
                  ) : (
                    <View style={[styles.slotGrid, { gap: spacing.sm, marginTop: spacing.sm }]}>
                      {slots.data!.map(item => (
                        <MGChip
                          key={item}
                          label={slotLabel(item)}
                          selected={slot === item}
                          minHeight={44}
                          onPress={() => setSlot(item)}
                        />
                      ))}
                    </View>
                  )}
                </MGCard>
              </View>
              {error ? (
                <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginTop: spacing.md }}>{error}</MGText>
              ) : null}
            </ScrollView>
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <MGButton label="Confirmar novo horário" onPress={() => { void submit() }} loading={reschedule.isPending} disabled={!slot || reschedule.isPending} />
              <MGButton label="Cancelar" variant="secondary" onPress={onClose} disabled={reschedule.isPending} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { maxHeight: '85%', width: '100%', maxWidth: 720, overflow: 'hidden' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateOption: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
})
