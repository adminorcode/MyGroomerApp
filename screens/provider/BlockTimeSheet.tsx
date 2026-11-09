import { Modal, Platform, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native'
import { useEffect, useState } from 'react'
import { MGButton, MGCard, MGIcon, MGText, MGTextField } from '../../design-system/components'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { palette } from '../../design-system/tokens'
import { blockInstants, blockRangeError } from './agendaPeriod'

// Data da folha: exibida e digitada como DD/MM/AAAA; a API recebe AAAA-MM-DD (conversão só na borda).
const isoToBrDate = (iso: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}

const maskBrDate = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const brDateToIso = (text: string): string | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const valid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
  return valid ? `${year}-${month}-${day}` : null
}

type Props = {
  visible: boolean
  initialDate: string
  submitting: boolean
  onClose: () => void
  onConfirm: (starts_at: string, ends_at: string) => void
}

export default function BlockTimeSheet({ visible, initialDate, submitting, onClose, onConfirm }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const insets = useSafeAreaInsets()
  const [date, setDate] = useState(isoToBrDate(initialDate))
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('09:00')

  useEffect(() => {
    if (!visible) return
    setDate(isoToBrDate(initialDate))
    setStart('09:00')
    setEnd('09:00')
  }, [visible, initialDate])

  const isoDate = brDateToIso(date)
  const error = blockRangeError(isoDate ?? date, start, end)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: palette.overlay.scrim }}
      >
        <View
          style={{
            height: '78%',
            width: '100%',
            maxWidth: 720,
            backgroundColor: colors.surface.canvas,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            overflow: 'hidden',
          }}
        >
          {/* CMP-05 / Q1: cabeçalho teal da folha, com texto inverso (branco) sobre a faixa. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.brand.teal, paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm }}>
            <MGText variant="heading2" color="inverse" accessibilityRole="header" style={{ flex: 1 }}>Bloquear horário</MGText>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <MGText variant="label" color="inverse">Fechar</MGText>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, paddingTop: spacing.md }}>
            <MGText variant="bodySmall" color="secondary" style={{ marginBottom: spacing.lg }}>Defina um intervalo indisponível na sua agenda.</MGText>
            <MGCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <MGIcon name="calendar-days" color={colors.action.primary} size={20} />
                <MGText variant="title">Período</MGText>
              </View>
              <MGTextField label="Data" value={date} onChangeText={text => setDate(maskBrDate(text))} autoCapitalize="none" keyboardType="numbers-and-punctuation" maxLength={10} helperText="DD/MM/AAAA" />
              <MGTextField label="Início" value={start} onChangeText={setStart} autoCapitalize="none" helperText="Intervalos de 15 minutos" />
              <MGTextField
                label="Fim"
                value={end}
                onChangeText={setEnd}
                autoCapitalize="none"
                error={error ?? undefined}
              />
            </MGCard>
          </ScrollView>
          <View style={{ padding: spacing.base, paddingTop: 0, paddingBottom: spacing.base + insets.bottom }}>
            <MGButton
              label="Confirmar bloqueio"
              loading={submitting}
              disabled={!!error || submitting}
              onPress={() => {
                if (!isoDate || error || submitting) return
                const range = blockInstants(isoDate, start, end)
                onConfirm(range.starts_at, range.ends_at)
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
