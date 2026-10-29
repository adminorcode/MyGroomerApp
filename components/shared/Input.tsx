import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { borderRadius, fonts, typography } from "../../constants/theme";
import {Eye, EyeClosed} from 'lucide-react-native'
import PhoneInput, { PhoneInputProps } from "react-native-phone-number-input";
import { useTheme } from "../../context/ThemeContext";

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

export function BoamePhoneInput({label, error, onChangeFormattedText, ...props}: BoamePhoneInputProps) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
            <PhoneInput
                {...props}
                defaultCode="GH"
                layout="first"
                placeholder="Enter your phone number"
                onChangeFormattedText={onChangeFormattedText}
                containerStyle={{...styles.phoneContainer, borderColor: fieldBorder(colors, error, focused)}}
                textContainerStyle={{...styles.phoneTextContainer, backgroundColor: colors.background}}
                textInputStyle={{...styles.phoneTextInput, color: colors.text}}
                codeTextStyle={{...styles.phoneCodeText, color: colors.text}}
                textInputProps={{
                    onFocus: () => setFocused(true),
                    onBlur: () => setFocused(false),
                }}
                flagButtonStyle={styles.flagHidden}
            />
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    )
}

export default function BoameInput({label, error, style, ...props}: InputProps) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
            <TextInput
                {...props}
                onFocus={(event) => { setFocused(true); props.onFocus?.(event) }}
                onBlur={(event) => { setFocused(false); props.onBlur?.(event) }}
                style={[styles.input, style, { borderColor: fieldBorder(colors, error, focused), backgroundColor: colors.background, color: colors.text }]}
            />
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    )
}

export function ToggleInput({label, error, style, ...props}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const { colors } = useTheme();
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
            <View style={[styles.passwordRow, { borderColor: fieldBorder(colors, error, focused) }]}>
                <TextInput
                    {...props}
                    onFocus={(event) => { setFocused(true); props.onFocus?.(event) }}
                    onBlur={(event) => { setFocused(false); props.onBlur?.(event) }}
                    style={[styles.passwordInput, style, { color: colors.text }]}
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
        marginBottom: 12,
    },
    label: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginBottom: 4
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontFamily: fonts.regular,
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    passwordInput: {
        flex: 1,
        fontFamily: fonts.regular,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    togglePassword: {
        marginLeft: 8
    },
    error: {
        fontSize: typography.sizes.xs,
        marginTop: 4,
    },

    phoneContainer: {
        width: '100%',
        borderWidth: 1,
        borderRadius: borderRadius.lg,
    },
    phoneTextContainer: {
        borderRadius: borderRadius.lg,
        paddingVertical: 0,
    },
    phoneTextInput: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        height: 42,
    },
    phoneCodeText: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md
    },
    flagHidden: {
        width: 0,
        // opacity: 0,
    },
})