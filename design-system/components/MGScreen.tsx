import { ReactNode, Ref } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MGErrorState from './MGErrorState'
import { useMGTheme } from '../theme/useMGTheme'
import { layout } from '../../constants/theme'

type Props = {
  children: ReactNode
  scrollable?: boolean
  safeArea?: boolean
  background?: 'canvas' | 'default'
  /**
   * CMP-05 / R4: `teal` mostra a faixa de cabeçalho teal com `headerSlot` (saudação, busca…).
   * Só nos hubs (Início, Busca, Agenda, Solicitações, Conversas). Formulários e transações ficam em `plain`.
   */
  header?: 'plain' | 'teal'
  headerSlot?: ReactNode
  footer?: ReactNode
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  contentStyle?: ViewStyle
  scrollRef?: Ref<ScrollView>
}

export default function MGScreen({
  children,
  scrollable = false,
  safeArea = true,
  background = 'canvas',
  header = 'plain',
  headerSlot,
  footer,
  loading = false,
  error,
  onRetry,
  contentStyle,
  scrollRef,
}: Props) {
  const { colors, spacing } = useMGTheme()
  const bg = background === 'default' ? colors.surface.default : colors.surface.canvas
  const isTealHeader = header === 'teal'

  const body = loading ? (
    <View style={styles.centered} accessibilityLabel="Carregando">
      <ActivityIndicator size="large" color={colors.action.primary} />
    </View>
  ) : error ? (
    <View style={styles.centered}>
      <MGErrorState message={error} onRetry={onRetry} />
    </View>
  ) : scrollable ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[
        { paddingHorizontal: spacing.base, paddingBottom: footer ? spacing.xl + spacing.lg : spacing.xl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: spacing.base, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }, contentStyle]}>{children}</View>
  )

  const tealBand = isTealHeader ? (
    <View
      style={[
        styles.tealBand,
        { backgroundColor: colors.brand.teal, paddingHorizontal: spacing.base, paddingBottom: spacing.lg, paddingTop: spacing.base },
      ]}
    >
      <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>{headerSlot}</View>
    </View>
  ) : null

  const content = (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {tealBand}
      {body}
      {footer ? (
        // Revisão UI (027): a faixa do rodapé ocupa a largura toda; só o conteúdo segue a coluna máxima.
        <View style={[styles.footer, { borderTopColor: colors.border.default, backgroundColor: colors.surface.default }]}>
          <View style={{ padding: spacing.base, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
    </View>
  )

  if (!safeArea) return content

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tealBand: {},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
