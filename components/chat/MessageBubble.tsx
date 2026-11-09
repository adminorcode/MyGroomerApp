import { StyleSheet, Text, View } from 'react-native'
import { CheckCheck, Check } from 'lucide-react-native'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

type Props = {
    content: string
    timestamp: string
    isOwn: boolean
    /** Papel autenticado. Define a cor da bolha própria (R8): tutor rosa, profissional teal. */
    ownRole?: 'customer' | 'provider'
    isSeen?: boolean
    isEdited?: boolean
    isPending?: boolean
}

function formatBubbleTime(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' })
}

export default function MessageBubble({ content, timestamp, isOwn, ownRole = 'customer', isSeen, isEdited, isPending }: Props) {
    const { colors, spacing, radius, fonts, textStyles } = useMGTheme()

    const ownIsTeal = ownRole === 'provider'
    const bubbleColor = isOwn ? (ownIsTeal ? colors.brand.teal : colors.action.primary) : colors.surface.default
    const textColor = isOwn ? colors.onAction.primary : colors.text.primary
    const metaColor = isOwn ? colors.onAction.primary : colors.text.secondary

    return (
        <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
            <View
                style={[
                    styles.bubble,
                    {
                        backgroundColor: bubbleColor,
                        borderColor: colors.border.default,
                        borderWidth: isOwn ? 0 : 1,
                        borderRadius: radius.lg,
                        paddingHorizontal: spacing.md,
                        paddingTop: spacing.sm,
                        paddingBottom: spacing.sm,
                    },
                    isOwn
                        ? { borderBottomRightRadius: radius.sm }
                        : { borderBottomLeftRadius: radius.sm },
                ]}
            >
                <Text style={[styles.content, { color: textColor, fontFamily: fonts.regular, fontSize: textStyles.body.fontSize, lineHeight: 21 }]}>{content}</Text>

                <View style={styles.metaRow}>
                    {isEdited && (
                        <Text style={[styles.meta, { color: metaColor, fontFamily: fonts.regular }]}>editada</Text>
                    )}
                    <Text style={[styles.meta, { color: metaColor, fontFamily: fonts.regular }]}>
                        {formatBubbleTime(timestamp)}
                    </Text>
                    {isOwn && (
                        isPending ? (
                            <Check size={14} color={metaColor} />
                        ) : (
                            <CheckCheck size={14} color={metaColor} />
                        )
                    )}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    rowOwn: {
        justifyContent: 'flex-end',
    },
    rowOther: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
    },
    content: {},
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 4,
        marginTop: 2,
    },
    meta: {
        // Revisão UI (027): horário e status em caption (12 pt), não em 10 pt.
        fontSize: 12,
    },
})
