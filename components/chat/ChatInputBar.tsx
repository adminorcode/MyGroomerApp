import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, TextStyle, View } from 'react-native'
import { SendHorizontal } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type Props = {
    value: string
    onChangeText: (text: string) => void
    onSend: () => void
    disabled?: boolean
}

export default function ChatInputBar({ value, onChangeText, onSend, disabled }: Props) {
    const { colors } = useTheme()
    const hasText = value.trim().length > 0
    const [focused, setFocused] = useState(false)

    return (
        <View style={styles.container}>
            {/* Revisão UI (027): foco no contorno do campo (2 pt, action.focus, como MGTextField), sem o contorno nativo do navegador. */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: focused ? colors.focus : colors.border, borderWidth: focused ? 2 : 1 }]}>

                <TextInput
                    accessibilityLabel="Mensagem"
                    style={[styles.input, { color: colors.text, outline: 'none' } as TextStyle]}
                    placeholder="Mensagem"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    multiline
                />

            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar mensagem"
                onPress={hasText ? onSend : undefined}
                disabled={disabled || !hasText}
                accessibilityState={{ disabled: Boolean(disabled || !hasText) }}
                style={({ pressed }) => [
                    styles.sendBtn,
                    {
                        backgroundColor: disabled || !hasText
                            ? colors.disabled
                            : pressed
                              ? colors.primaryPressed
                              : colors.primary,
                    },
                ]}
            >
                <SendHorizontal size={22} color={disabled || !hasText ? colors.onDisabled : colors.onPrimary} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
        maxHeight: 120,
        paddingVertical: spacing.xs,
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
