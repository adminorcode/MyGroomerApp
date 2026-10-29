import { StyleSheet, Text, View } from 'react-native'
import { Check, CheckCheck } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type Props = {
    content: string
    timestamp: string
    isOwn: boolean
    isSeen?: boolean
    isEdited?: boolean
    isPending?: boolean
}

function formatBubbleTime(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function MessageBubble({ content, timestamp, isOwn, isSeen, isEdited, isPending }: Props) {
    const { colors } = useTheme()

    const bubbleColor = isOwn ? colors.primary : colors.surface
    const textColor = isOwn ? colors.onPrimary : colors.text
    const metaColor = isOwn ? colors.onPrimary : colors.textSecondary

    return (
        <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
            <View
                style={[
                    styles.bubble,
                    { backgroundColor: bubbleColor, borderColor: colors.border },
                    isOwn ? styles.bubbleOwn : styles.bubbleOther,
                    !isOwn && styles.bubbleOtherBorder,
                ]}
            >
                <Text style={[styles.content, { color: textColor }]}>{content}</Text>

                <View style={styles.metaRow}>
                    {isEdited && (
                        <Text style={[styles.meta, { color: metaColor }]}>edited</Text>
                    )}
                    <Text style={[styles.meta, { color: metaColor }]}>
                        {formatBubbleTime(timestamp)}
                    </Text>
                    {isOwn && (
                        isPending ? (
                            <Check size={14} color={metaColor} />
                        ) : isSeen ? (
                            <CheckCheck size={14} color={metaColor} />
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
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    rowOwn: {
        justifyContent: 'flex-end',
    },
    rowOther: {
        justifyContent: 'flex-start',
        // marginTop:15
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: spacing.sm + 2,
        paddingTop: spacing.xs + 2,
        paddingBottom: spacing.xs,
        borderRadius: borderRadius.lg,
    },
    bubbleOwn: {
        borderBottomRightRadius: borderRadius.sm,
    },
    bubbleOther: {
        borderBottomLeftRadius: borderRadius.sm,
    },
    bubbleOtherBorder: {
        borderWidth: 1,
    },
    content: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
        lineHeight: 21,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: spacing.xs,
        marginTop: 2,
    },
    meta: {
        fontSize: typography.sizes.xs - 2,
        fontFamily: fonts.regular,
    },
})
