import { Pressable, StyleSheet, View } from 'react-native'
import { SendHorizontal } from 'lucide-react-native'
import { MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

type Props = {
    value: string
    onChangeText: (text: string) => void
    onSend: () => void
    disabled?: boolean
}

export default function ChatInputBar({ value, onChangeText, onSend, disabled }: Props) {
    const { colors, radius } = useMGTheme()
    const hasText = value.trim().length > 0
    const inactive = Boolean(disabled || !hasText)

    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <MGTextField
                    label="Mensagem"
                    hideLabel
                    compact
                    placeholder="Mensagem"
                    value={value}
                    onChangeText={onChangeText}
                    editable={!disabled}
                    multiline
                    style={styles.input}
                />
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar mensagem"
                onPress={hasText ? onSend : undefined}
                disabled={inactive}
                accessibilityState={{ disabled: inactive }}
                style={({ pressed }) => [
                    styles.sendBtn,
                    {
                        borderRadius: radius.control,
                        backgroundColor: inactive
                            ? colors.state.disabledSurface
                            : pressed
                              ? colors.action.primaryPressed
                              : colors.action.primary,
                    },
                ]}
            >
                <SendHorizontal size={22} color={inactive ? colors.state.disabledText : colors.onAction.primary} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    field: {
        flex: 1,
    },
    input: {
        maxHeight: 120,
    },
    sendBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
