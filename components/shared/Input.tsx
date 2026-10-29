import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { borderRadius, fonts, spacing, textStyles } from "../../constants/theme";
import {Eye, EyeClosed} from 'lucide-react-native'
import PhoneInput, { PhoneInputProps } from "react-native-phone-number-input";
import { useTheme } from "../../context/ThemeContext";
import MGTextField from "../../design-system/components/MGTextField";

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
    const [focused, setFocused] = useState(false);
    const { colors } = useTheme();
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <View style={[styles.passwordRow, { borderColor: fieldBorder(colors, error, focused), backgroundColor: colors.surface }]}>
                <TextInput
                    {...props}
                    value={value ?? ''}
                    placeholderTextColor={colors.textSecondary}
                    onFocus={(event) => { setFocused(true); props.onFocus?.(event) }}
                    onBlur={(event) => { setFocused(false); props.onBlur?.(event) }}
                    style={[styles.passwordInput, style, { color: colors.text, backgroundColor: colors.surface }]}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                    style={styles.togglePassword}
                    onPress={() => setShowPassword(prev => !prev)}
                    accessibilityRole="button"
                >
                    {showPassword 
                        ? <EyeClosed color={colors.primary} size={20} /> 
                        : <Eye color={colors.primary} size={20} />
                    }
                </TouchableOpacity>
            </View>
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
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
    input: {
        borderWidth: 2,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        minHeight: 52,
        fontSize: textStyles.body.fontSize,
        fontFamily: fonts.regular,
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        minHeight: 52,
    },
    passwordInput: {
        flex: 1,
        fontFamily: fonts.regular,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    togglePassword: {
        marginLeft: spacing.sm
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
        minHeight: 52,
    },
    phoneTextContainer: {
        borderRadius: borderRadius.md,
        paddingVertical: 0,
    },
    phoneTextInput: {
        fontFamily: fonts.regular,
        fontSize: textStyles.body.fontSize,
        minHeight: 48,
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