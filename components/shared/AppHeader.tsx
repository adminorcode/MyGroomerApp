import { StyleSheet, View } from 'react-native'
import { APP_NAME } from '../../constants/brand'
import { layout } from '../../constants/theme'
import MGArtwork from '../../design-system/components/MGArtwork'
import MGText from '../../design-system/components/MGText'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ProfileHeaderButton from './ProfileHeaderButton'

type Props = {
    onProfilePress: () => void
}

/**
 * Topo autenticado (plano 028): marca à esquerda e conta à direita.
 * Uma instância por tela, acima das faixas contextuais de cada fluxo.
 */
export default function AppHeader({ onProfilePress }: Props) {
    const { colors, spacing, radius } = useMGTheme()

    return (
        <View style={[styles.bar, { backgroundColor: colors.surface.canvas, borderBottomColor: colors.border.default, paddingHorizontal: spacing.base, paddingVertical: spacing.sm }]}>
            <View style={[styles.row, { maxWidth: layout.contentMaxWidth, gap: spacing.sm }]}>
                <View style={[styles.brand, { gap: spacing.sm }]}>
                    <View style={[styles.markRing, { borderRadius: radius.md, backgroundColor: colors.surface.default }]}>
                        <View style={[styles.mark, { borderRadius: radius.sm, backgroundColor: colors.brand.pink }]}>
                            <MGArtwork name="brand-symbol" width={32} height={32} />
                        </View>
                    </View>
                    <MGText variant="heading3" numberOfLines={1} style={styles.name}>{APP_NAME}</MGText>
                </View>
                <ProfileHeaderButton size={48} onPress={onProfilePress} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brand: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
    },
    markRing: {
        padding: 2,
    },
    mark: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    name: {
        flexShrink: 1,
    },
})
