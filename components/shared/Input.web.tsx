import { useState } from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native'
import type { PhoneInputProps } from 'react-native-phone-number-input'
import { Eye, EyeClosed } from 'lucide-react-native'
import { borderRadius, fonts, typography } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'

export type InputProps = TextInputProps & { label: string; error?: string }
export type BoamePhoneInputProps = PhoneInputProps & { label: string; error?: string; onChangeFormattedText: (text: string) => void }

export function BoamePhoneInput({ label, error, value, defaultValue, onChangeFormattedText }: BoamePhoneInputProps) {
  return <BoameInput label={label} error={error} value={value} defaultValue={defaultValue} onChangeText={onChangeFormattedText} keyboardType="phone-pad" placeholder="+5511999999999" />
}

export default function BoameInput({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const borderColor = error ? colors.error : focused ? colors.focus : colors.border
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        {...props}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event) }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event) }}
        style={[styles.input, { borderColor, backgroundColor: colors.background, color: colors.text }, style]}
      />
      {error && <Text style={{ color: colors.error }}>{error}</Text>}
    </View>
  )
}

export function ToggleInput({ label, error, style, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const { colors } = useTheme()
  const borderColor = error ? colors.error : focused ? colors.focus : colors.border
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
      <View style={[styles.passwordRow, { borderColor }]}>
        <TextInput
          accessibilityLabel={label}
          {...props}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event) }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event) }}
          secureTextEntry={!visible}
          style={[styles.passwordInput, { color: colors.text, backgroundColor: colors.background }, style]}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={{ padding: 12 }}>
          {visible ? <EyeClosed color={colors.primary} /> : <Eye color={colors.primary} />}
        </TouchableOpacity>
      </View>
      {error && <Text style={{ color: colors.error }}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { fontSize: typography.sizes.sm, fontFamily: fonts.regular, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fonts.regular },
  passwordRow: { borderWidth: 1, borderRadius: borderRadius.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  passwordInput: { flex: 1, minWidth: 0, padding: 12, fontFamily: fonts.regular },
})
