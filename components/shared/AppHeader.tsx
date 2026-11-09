import { StyleSheet, View } from 'react-native'
import { APP_NAME } from '../../constants/brand'
import { layout } from '../../constants/theme'
import MGArtwork from '../../design-system/components/MGArtwork'
import MGText from '../../design-system/components/MGText'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { HeaderTone } from '../../navigation/headerTone'
import ProfileHeaderButton from './ProfileHeaderButton'

type Props = {
    onProfilePress: () => void
    tone: HeaderTone
}

/**
 * Topo autenticado (plano 028): marca à esquerda e conta à direita.
 * Uma instância por tela, acima das faixas contextuais de cada fluxo.
 */
export default function AppHeader({ onProfilePress, tone }: Props) {
    const { colors, spacing, radius } = useMGTheme()
    const backgroundColor = tone === 'pink' ? colors.action.primary : colors.brand.teal

    return (
        <View style={[styles.bar, { backgroundColor, paddingHorizontal: spacing.base, paddingVertical: spacing.sm }]}>
            <View style={[styles.row, { maxWidth: layout.contentMaxWidth, gap: spacing.sm }]}>
                <View style={[styles.brand, { gap: spacing.sm }]}>
                    <View style={[styles.markRing, { borderRadius: radius.md, backgroundColor: colors.surface.default }]}>
                        <View style={[styles.mark, { borderRadius: radius.sm, backgroundColor: colors.brand.pink }]}>
                            <MGArtwork name="brand-symbol" width={32} height={32} />
                        </View>
                    </View>
                    <MGText variant="heading3" color="inverse" numberOfLines={1} style={styles.name}>{APP_NAME}</MGText>
                </View>
                <ProfileHeaderButton size={48} onColor onPress={onProfilePress} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    bar: {},
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
