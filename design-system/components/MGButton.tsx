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
  const { colors, spacing, radius } = useMGTheme()
  const blocked = disabled || loading

  const contentColor = (pressed: boolean) => {
    if (blocked) return colors.state.disabledText
    if (variant === 'secondary' || variant === 'tertiary') return colors.action.primaryOutline
    if (variant === 'destructive') return colors.onAction.error
    if (variant === 'teal') return colors.onAction.secondary
    return colors.onAction.primary
  }

  const variantStyle = (pressed: boolean): ViewStyle => {
    if (blocked) {
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
        return {
          backgroundColor: pressed ? colors.feedback.error : colors.feedback.error,
          opacity: pressed ? 0.9 : 1,
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
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: 52,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.base,
          columnGap: spacing.sm,
        },
        fullWidth && styles.fullWidth,
        variantStyle(pressed),
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
