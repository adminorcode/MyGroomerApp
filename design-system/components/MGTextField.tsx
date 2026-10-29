import { useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type MGTextFieldProps = TextInputProps & {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export default function MGTextField({
  label,
  error,
  helperText,
  required = false,
  style,
  editable = true,
  onFocus,
  onBlur,
  value,
  defaultValue: _defaultValue,
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
    <View style={[styles.fieldGroup, { marginBottom: spacing.base }]}>
      <MGText variant="label" style={{ marginBottom: spacing.sm }}>
        {required ? `${label} *` : label}
      </MGText>
      <TextInput
        {...props}
        value={controlledValue}
        editable={editable}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
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
          {
            borderWidth: 2,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            minHeight: 52,
            fontSize: textStyles.body.fontSize,
            fontFamily: fonts.regular,
            borderColor,
            backgroundColor: disabled ? colors.state.disabledSurface : colors.surface.default,
            color: disabled ? colors.state.disabledText : colors.text.primary,
          },
          style,
        ]}
      />
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
})
