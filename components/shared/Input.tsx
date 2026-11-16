import { useState } from "react";
import { StyleSheet, Text, TextInputProps, TouchableOpacity, View } from "react-native";
import { borderRadius, fonts, spacing, textStyles } from "../../constants/theme";
import {Eye, EyeClosed} from 'lucide-react-native'
import PhoneInput, { PhoneInputProps } from "react-native-phone-number-input";
import { useTheme } from "../../context/ThemeContext";
import MGTextField, { MG_FIELD_HEIGHT } from "../../design-system/components/MGTextField";

export type InputProps = TextInputProps & {
    label: string
    error?: string
}

export type BoamePhoneInputProps = PhoneInputProps & {
    label: string
    error?: string
    onChangeFormattedText: (text: string) => void
}

function fieldBorder(colors: { border: string; error: string; focus: string }, error: string | undefined, focused: boolean) {
    if (error) return colors.error
    if (focused) return colors.focus
    return colors.border
}

export function BoamePhoneInput({label, error, onChangeFormattedText, textInputProps, ...props}: BoamePhoneInputProps) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <PhoneInput
                {...props}
                defaultCode="BR"
                layout="first"
                placeholder="Digite seu telefone"
                onChangeFormattedText={onChangeFormattedText}
                containerStyle={{...styles.phoneContainer, borderColor: fieldBorder(colors, error, focused), backgroundColor: colors.surface}}
                textContainerStyle={{...styles.phoneTextContainer, backgroundColor: colors.surface}}
                textInputStyle={{...styles.phoneTextInput, color: colors.text, backgroundColor: colors.surface}}
                codeTextStyle={{...styles.phoneCodeText, color: colors.text}}
                textInputProps={{
                    accessibilityLabel: label,
                    placeholderTextColor: colors.textSecondary,
                    ...textInputProps,
                    onFocus: (event) => { setFocused(true); textInputProps?.onFocus?.(event) },
                    onBlur: (event) => { setFocused(false); textInputProps?.onBlur?.(event) },
                }}
                flagButtonStyle={styles.flagHidden}
            />
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    )
}

/** @deprecated Prefer MGTextField from design-system/components for new UI. */
export default function BoameInput({ label, error, style, ...props }: InputProps) {
    return <MGTextField label={label} error={error} style={style} {...props} />
}

export function ToggleInput({label, error, style, value, ...props}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { colors } = useTheme();
    return (
        <MGTextField
            {...props}
            label={label}
            error={error}
            style={style}
            value={value}
            secureTextEntry={!showPassword}
            trailing={(
                <TouchableOpacity
                    style={styles.togglePassword}
                    onPress={() => setShowPassword(prev => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                    {showPassword
                        ? <EyeClosed color={colors.primary} size={20} />
                        : <Eye color={colors.primary} size={20} />
                    }
                </TouchableOpacity>
            )}
        />
    )
}




const styles = StyleSheet.create({
    fieldGroup: {
        marginBottom: spacing.base,
    },
    label: {
        fontSize: textStyles.label.fontSize,
        lineHeight: textStyles.label.lineHeight,
        fontFamily: fonts.semibold,
        marginBottom: spacing.sm,
    },
    togglePassword: {
        height: MG_FIELD_HEIGHT,
        justifyContent: 'center',
        paddingLeft: spacing.sm,
    },
    error: {
        fontSize: textStyles.caption.fontSize,
        lineHeight: textStyles.caption.lineHeight,
        marginTop: spacing.xs,
    },

    phoneContainer: {
        width: '100%',
        borderWidth: 2,
        borderRadius: borderRadius.md,
        height: MG_FIELD_HEIGHT,
        minHeight: MG_FIELD_HEIGHT,
        maxHeight: MG_FIELD_HEIGHT,
    },
    phoneTextContainer: {
        borderRadius: borderRadius.md,
        paddingVertical: 0,
        height: MG_FIELD_HEIGHT,
    },
    phoneTextInput: {
        fontFamily: fonts.regular,
        fontSize: textStyles.body.fontSize,
        height: MG_FIELD_HEIGHT,
        minHeight: MG_FIELD_HEIGHT,
        maxHeight: MG_FIELD_HEIGHT,
        paddingVertical: 0,
    },
    phoneCodeText: {
        fontFamily: fonts.regular,
        fontSize: textStyles.body.fontSize,
    },
    flagHidden: {
        width: 0,
        // opacity: 0,
    },
})