import { ReactNode, useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native'

// O foco é indicado pela borda de 2 pt (plano 027); o contorno nativo do navegador não entra.
// outlineStyle é propriedade só do RN-Web: o cast evita o tipo nativo de TextStyle.
const WEB_FOCUS_RESET = { outlineStyle: 'none' } as unknown as TextStyle
import MGIcon, { MGIconName } from './MGIcon'
import MGText from './MGText'
import { useMGTheme } from '../theme/useMGTheme'

/** Campo de uma linha. Igual ao telefone. */
export const MG_FIELD_HEIGHT = 40
/** Chip e outros controles que não são o campo de texto. */
export const MG_CONTROL_HEIGHT = 48

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
  multiline = false,
  numberOfLines,
  textAlignVertical,
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

  // Campo comum: uma linha, texto e placeholder no centro. Área alta só quando a tela pede.
  const flat = StyleSheet.flatten(style)
  const askedHeight = typeof flat?.minHeight === 'number'
    ? flat.minHeight
    : typeof flat?.height === 'number'
      ? flat.height
      : undefined
  // Área de texto fica fora da altura padrão. Outro tamanho de linha só entra se a tela pedir height ou minHeight.
  const tall = multiline || textAlignVertical === 'top' || (numberOfLines ?? 1) > 1 || (askedHeight ?? 0) >= 80
  const box = !tall && askedHeight ? askedHeight : MG_FIELD_HEIGHT
  const lineHeight = textStyles.body.lineHeight
  const verticalPad = Math.max(0, Math.round((box - 4 - lineHeight) / 2))

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
          multiline={multiline}
          numberOfLines={tall ? numberOfLines : multiline ? 1 : undefined}
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
              fontSize: textStyles.body.fontSize,
              lineHeight: tall ? undefined : lineHeight,
              fontFamily: fonts.regular,
              fontWeight: '400',
              textAlignVertical: tall ? 'top' : 'center',
              includeFontPadding: false,
              borderColor,
              backgroundColor: disabled ? colors.state.disabledSurface : colors.surface.default,
              color: colors.text.primary,
            },
            style,
            tall ? null : {
              paddingTop: verticalPad,
              paddingBottom: verticalPad,
              minHeight: box,
              maxHeight: box,
              height: box,
              flexGrow: 0,
            },
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
    height: MG_FIELD_HEIGHT,
    justifyContent: 'center',
  },
  leading: {
    position: 'absolute',
    left: 14,
    top: 0,
    height: MG_FIELD_HEIGHT,
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
