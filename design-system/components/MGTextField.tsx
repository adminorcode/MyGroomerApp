import { ReactNode, useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native'

// O foco é indicado pela borda de 2 pt (plano 027); o contorno nativo do navegador não entra.
// outlineStyle é propriedade só do RN-Web: o cast evita o tipo nativo de TextStyle.
const WEB_FOCUS_RESET = { outlineStyle: 'none' } as unknown as TextStyle
import MGIcon, { MGIconName } from './MGIcon'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type MGTextFieldProps = TextInputProps & {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  menu?: ReactNode
  trailing?: ReactNode
  compact?: boolean
  hideLabel?: boolean
  icon?: MGIconName
}

export default function MGTextField({
  label,
  error,
  helperText,
  required = false,
  menu,
  trailing,
  compact = false,
  hideLabel = false,
  icon,
  accessibilityLabel: accessibilityLabelProp,
  style,
  editable = true,
  onFocus,
  onBlur,
  value,
  defaultValue: _defaultValue,
  accessibilityState,
  ...props
}: MGTextFieldProps) {
  const { colors, spacing, radius, textStyles, fonts } = useMGTheme()
  const [focused, setFocused] = useState(false)
  const disabled = editable === false
  // Keep the field controlled for the whole lifetime (RHF may start with undefined).
  const controlledValue = value ?? ''

  const borderColor = error
    ? colors.feedback.error
    : focused
      ? colors.action.focus
      : colors.border.default

  return (
    <View style={[styles.fieldGroup, { marginBottom: compact ? 0 : spacing.base, zIndex: menu ? 2 : 0 }]}>
      {hideLabel ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          {icon ? <MGIcon name={icon} size={18} color={colors.action.primary} /> : null}
          <MGText variant="label" numberOfLines={compact ? 1 : undefined} style={{ flexShrink: 1 }}>
            {required ? `${label} *` : label}
          </MGText>
        </View>
      )}
      <View style={styles.inputSlot}>
        {hideLabel && icon ? (
          <View style={styles.leading} pointerEvents="none">
            <MGIcon name={icon} size={18} color={colors.text.secondary} />
          </View>
        ) : null}
        <TextInput
          {...props}
          value={controlledValue}
          editable={editable}
          accessibilityLabel={accessibilityLabelProp ?? label}
          accessibilityState={{ disabled, ...accessibilityState }}
          aria-disabled={disabled}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          placeholderTextColor={colors.text.secondary}
          style={[
            WEB_FOCUS_RESET,
            {
              borderWidth: 2,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingLeft: hideLabel && icon ? spacing.xl + spacing.md : spacing.md,
              paddingRight: trailing ? spacing.xl + spacing.sm : spacing.md,
              minHeight: 40,
              fontSize: textStyles.body.fontSize,
              fontFamily: fonts.regular,
              borderColor,
              backgroundColor: disabled ? colors.state.disabledSurface : colors.surface.default,
              color: colors.text.primary,
            },
            style,
          ]}
        />
        {trailing ? <View style={styles.trailing} pointerEvents="box-none">{trailing}</View> : null}
        {menu ? <View style={[styles.menu, { marginTop: spacing.xs }]}>{menu}</View> : null}
      </View>
      {error ? (
        <MGText variant="caption" color="error" style={{ marginTop: spacing.xs }}>
          {error}
        </MGText>
      ) : helperText ? (
        <MGText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
          {helperText}
        </MGText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldGroup: {},
  inputSlot: {
    position: 'relative',
    zIndex: 1,
  },
  trailing: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 40,
    justifyContent: 'center',
  },
  leading: {
    position: 'absolute',
    left: 14,
    top: 0,
    height: 40,
    justifyContent: 'center',
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2,
  },
})
