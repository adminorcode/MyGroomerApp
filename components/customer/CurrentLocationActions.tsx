import { View } from 'react-native'
import { MGButton, MGIcon, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { CurrentPlaceStatus } from '../../hooks/useCurrentPlace'

type Props = {
    status: CurrentPlaceStatus
    onPress: () => void
}

export default function CurrentLocationActions({ status, onPress }: Props) {
    const { colors, spacing } = useMGTheme()
    return (
        <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
            <MGButton
                label="Usar minha localização"
                accessibilityLabel="Usar minha localização"
                variant="tertiary"
                fullWidth={false}
                loading={status === 'locating'}
                iconLeft={<MGIcon name="locate" size={18} color={colors.action.primary} />}
                onPress={onPress}
            />
            {status === 'denied' ? (
                <MGText variant="bodySmall" color="secondary">
                    A localização atual não foi permitida.
                </MGText>
            ) : null}
            {status === 'unavailable' ? (
                <MGText variant="bodySmall" color="error" accessibilityRole="alert">
                    Não foi possível localizar você agora.
                </MGText>
            ) : null}
        </View>
    )
}
