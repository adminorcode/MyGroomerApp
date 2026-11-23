import { useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { CheckCheck, Check } from 'lucide-react-native'
import MGEnter from '../../design-system/components/MGEnter'
import MGText from '../../design-system/components/MGText'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { motion } from '../../design-system/tokens'

type Props = {
    content: string
    timestamp: string
    isOwn: boolean
    /** Papel autenticado. Define a cor da bolha própria (R8): tutor rosa, profissional teal. */
    ownRole?: 'customer' | 'provider'
    isSeen?: boolean
    isEdited?: boolean
    isPending?: boolean
    /** Só o balão que acabou de entrar anima. Mensagens já vistas montam paradas. */
    entering?: boolean
}

function formatBubbleTime(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' })
}

export default function MessageBubble({ content, timestamp, isOwn, ownRole = 'customer', isSeen, isEdited, isPending, entering = false }: Props) {
    const { colors, spacing, radius } = useMGTheme()
    const enterOnMount = useRef(entering).current

    const ownIsTeal = ownRole === 'provider'
    const bubbleColor = isOwn ? (ownIsTeal ? colors.brand.teal : colors.action.primary) : colors.surface.default
    const metaColor = isOwn ? colors.onAction.primary : colors.text.secondary

    const bubble = (
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
                <MGText variant="body" color={isOwn ? 'inverse' : 'primary'}>{content}</MGText>

                <View style={styles.metaRow}>
                    {isEdited && (
                        <MGText variant="caption" color={isOwn ? 'inverse' : 'secondary'}>editada</MGText>
                    )}
                    <MGText variant="caption" color={isOwn ? 'inverse' : 'secondary'}>
                        {formatBubbleTime(timestamp)}
                    </MGText>
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

    if (!enterOnMount) return bubble
    return (
        <MGEnter duration={motion.selection} offset={motion.bubbleOffset}>
            {bubble}
        </MGEnter>
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
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 4,
        marginTop: 2,
    },
})
