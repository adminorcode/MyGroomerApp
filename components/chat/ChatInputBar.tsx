import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Mic, Paperclip, SendHorizontal, Smile } from 'lucide-react-native'
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

    return (
        <View style={styles.container}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable hitSlop={spacing.xs}>
                    <Smile size={22} color={colors.textSecondary} />
                </Pressable>

                <TextInput
                    accessibilityLabel="Message"
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Message"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChangeText}
                    multiline
                />

                <Pressable hitSlop={spacing.xs}>
                    <Paperclip size={20} color={colors.textSecondary} />
                </Pressable>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                onPress={hasText ? onSend : undefined}
                disabled={disabled}
                style={({ pressed }) => [
                    styles.sendBtn,
                    {
                        backgroundColor: disabled
                            ? colors.disabled
                            : pressed
                              ? colors.primaryPressed
                              : colors.primary,
                    },
                ]}
            >
                {hasText ? (
                    <SendHorizontal size={22} color={disabled ? colors.onDisabled : colors.onPrimary} />
                ) : (
                    <Mic size={22} color={disabled ? colors.onDisabled : colors.onPrimary} />
                )}
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
        borderRadius: borderRadius.full,
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
        width: 46,
        height: 46,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
