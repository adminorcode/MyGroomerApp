import { useState } from 'react'
import { StyleSheet, TextInputProps, TouchableOpacity } from 'react-native'
import type { PhoneInputProps } from 'react-native-phone-number-input'
import { Eye, EyeClosed } from 'lucide-react-native'
import { spacing } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'
import MGTextField, { MG_FIELD_HEIGHT } from '../../design-system/components/MGTextField'

export type InputProps = TextInputProps & { label: string; error?: string }
export type BoamePhoneInputProps = PhoneInputProps & { label: string; error?: string; onChangeFormattedText: (text: string) => void }

export function BoamePhoneInput({ label, error, value, defaultValue, onChangeFormattedText }: BoamePhoneInputProps) {
  return (
    <BoameInput
      label={label}
      error={error}
      value={value}
      defaultValue={defaultValue}
      onChangeText={onChangeFormattedText}
      keyboardType="phone-pad"
      placeholder="Digite seu telefone"
      autoComplete="tel"
      textContentType="telephoneNumber"
    />
  )
}

export default function BoameInput({ label, error, style, value, ...props }: InputProps) {
  return <MGTextField label={label} error={error} style={style} value={value} {...props} />
}

export function ToggleInput({ label, error, style, value, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)
  const { colors } = useTheme()
  return (
    <MGTextField
      {...props}
      label={label}
      error={error}
      style={style}
      value={value}
      secureTextEntry={!visible}
      trailing={(
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onPress={() => setVisible(current => !current)}
          style={styles.eye}
        >
          {visible ? <EyeClosed color={colors.primary} size={20} /> : <Eye color={colors.primary} size={20} />}
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  eye: {
    height: MG_FIELD_HEIGHT,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
})
