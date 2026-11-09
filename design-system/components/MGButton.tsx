import { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type MGButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'teal' | 'destructive'

export type MGButtonProps = Omit<PressableProps, 'children'> & {
  label: string
  variant?: MGButtonVariant
  loading?: boolean
  fullWidth?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export default function MGButton({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  iconLeft,
  iconRight,
  style,
  ...props
}: MGButtonProps) {
  const { colors, spacing, radius, elevation } = useMGTheme()
  const blocked = disabled || loading
  // CMP-03: só o primário em repouso recebe a sombra tingida; pressed e bloqueado ficam sem sombra.
  const shadowStyle: ViewStyle | null = variant === 'primary' && !blocked ? elevation.actionPrimary : null

  const contentColor = (pressed: boolean) => {
    if (blocked) return colors.state.disabledText
    if (variant === 'secondary' || variant === 'tertiary') return colors.action.primaryOutline
    if (variant === 'destructive') return colors.feedback.error
    if (variant === 'teal') return colors.onAction.secondary
    return colors.onAction.primary
  }

  const variantStyle = (pressed: boolean): ViewStyle => {
    if (blocked) {
      // Revisão UI (027): link e contorno desabilitados não viram caixa cinza com borda.
      if (variant === 'tertiary') return { backgroundColor: 'transparent', borderWidth: 0 }
      if (variant === 'secondary') return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.default }
      return {
        backgroundColor: colors.state.disabledSurface,
        borderWidth: 1,
        borderColor: colors.border.strong,
      }
    }

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: pressed ? colors.surface.pinkSubtle : 'transparent',
          borderWidth: 1,
          borderColor: colors.action.primaryOutline,
        }
      case 'tertiary':
        return {
          backgroundColor: pressed ? colors.surface.pinkSubtle : 'transparent',
          borderWidth: 0,
        }
      case 'teal':
        return {
          backgroundColor: pressed ? colors.action.secondaryPressed : colors.action.secondary,
        }
      case 'destructive':
        // R1: ação destrutiva não concorre com o CTA rosa; contorno e texto em erro.
        return {
          backgroundColor: pressed ? colors.feedback.errorSurface : 'transparent',
          borderWidth: 1,
          borderColor: colors.feedback.error,
        }
      case 'primary':
      default:
        return {
          backgroundColor: pressed ? colors.action.primaryPressed : colors.action.primary,
        }
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      aria-busy={loading}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: 40,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.base,
          columnGap: spacing.sm,
        },
        fullWidth && styles.fullWidth,
        variantStyle(pressed),
        !pressed && shadowStyle,
        style as ViewStyle,
      ]}
      {...props}
    >
      {({ pressed }) =>
        loading ? (
          <ActivityIndicator color={contentColor(pressed)} size="small" />
        ) : (
          <View style={styles.row}>
            {iconLeft}
            <MGText variant="button" style={{ color: contentColor(pressed), flexShrink: 1, textAlign: 'center' }}>
              {label}
            </MGText>
            {iconRight}
          </View>
        )
      }
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    maxWidth: '100%',
    flexShrink: 1,
  },
})
