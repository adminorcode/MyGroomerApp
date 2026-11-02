import { Modal, Platform, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native'
import { useEffect, useState } from 'react'
import { MGButton, MGText, MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { palette } from '../../design-system/tokens'
import { blockInstants, blockRangeError } from './agendaPeriod'

type Props = {
  visible: boolean
  initialDate: string
  submitting: boolean
  onClose: () => void
  onConfirm: (starts_at: string, ends_at: string) => void
}

export default function BlockTimeSheet({ visible, initialDate, submitting, onClose, onConfirm }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const [date, setDate] = useState(initialDate)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('09:00')

  useEffect(() => {
    if (!visible) return
    setDate(initialDate)
    setStart('09:00')
    setEnd('09:00')
  }, [visible, initialDate])

  const error = blockRangeError(date, start, end)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: palette.overlay.scrim }}
      >
        <View
          style={{
            height: '78%',
            width: '100%',
            backgroundColor: colors.surface.default,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.base }}>
            <MGText variant="heading3">Bloquear horário</MGText>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
              <MGText variant="label" color="brand">Fechar</MGText>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, paddingTop: spacing.md }}>
            <MGTextField label="Data" value={date} onChangeText={setDate} autoCapitalize="none" helperText="AAAA-MM-DD" />
            <MGTextField label="Início" value={start} onChangeText={setStart} autoCapitalize="none" helperText="Intervalos de 15 minutos" />
            <MGTextField
              label="Fim"
              value={end}
              onChangeText={setEnd}
              autoCapitalize="none"
              error={error ?? undefined}
            />
          </ScrollView>
          <View style={{ padding: spacing.base, paddingTop: 0 }}>
            <MGButton
              label="Confirmar bloqueio"
              loading={submitting}
              disabled={!!error || submitting}
              onPress={() => {
                if (error || submitting) return
                const range = blockInstants(date, start, end)
                onConfirm(range.starts_at, range.ends_at)
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
