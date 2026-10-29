import { ReactNode } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MGErrorState from './MGErrorState'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  children: ReactNode
  scrollable?: boolean
  safeArea?: boolean
  background?: 'canvas' | 'default'
  footer?: ReactNode
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  contentStyle?: ViewStyle
}

export default function MGScreen({
  children,
  scrollable = false,
  safeArea = true,
  background = 'canvas',
  footer,
  loading = false,
  error,
  onRetry,
  contentStyle,
}: Props) {
  const { colors, spacing } = useMGTheme()
  const bg = background === 'default' ? colors.surface.default : colors.surface.canvas

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
      contentContainerStyle={[
        { paddingHorizontal: spacing.base, paddingBottom: spacing.xl, flexGrow: 1 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: spacing.base }, contentStyle]}>{children}</View>
  )

  const content = (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {body}
      {footer ? (
        <View style={[styles.footer, { padding: spacing.base, borderTopColor: colors.border.default }]}>
          {footer}
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
