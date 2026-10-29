import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetProviderServiceById } from '../../hooks/useProviders'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGErrorState, MGText } from '../../design-system/components'
import { GroomerProfileHeader } from '../../design-system/patterns'
import { fonts, spacing, typography } from '../../constants/theme'
import { formatMoney } from '../../utils/formatMoney'
import { formatRating } from '../../utils/formatRating'

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'GroomerProfile'>
    route: RouteProp<HomeStackParamList, 'GroomerProfile'>
}

type PublicOffer = {
    provider_name?: string
    service_name?: string
    price?: number | string
    average_rating?: number | string
    review_count?: number
    photo_url?: string | null
}

export default function GroomerPublicProfileScreen({ navigation, route }: Props) {
    const { colors } = useTheme()
    const { providerServiceId } = route.params
    const { data, isLoading, isError, refetch } = useGetProviderServiceById(providerServiceId)
    const offer = data as PublicOffer | undefined

    if (isLoading) {
        return (
            <ScreenContainer>
                <View style={styles.centered} accessibilityLabel="Carregando perfil">
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.message, { color: colors.text }]}>Carregando perfil</Text>
                </View>
            </ScreenContainer>
        )
    }

    if (isError || !offer) {
        return (
            <ScreenContainer>
                <ScreenHeader title="Perfil do groomer" showBackButton onBack={() => navigation.goBack()} />
                <MGErrorState
                    message="Não foi possível carregar este perfil."
                    onRetry={() => refetch()}
                />
            </ScreenContainer>
        )
    }

    const rating = formatRating(offer.average_rating)
    const reviews = offer.review_count === 1 ? '1 avaliação' : `${offer.review_count ?? 0} avaliações`
    const price = `A partir de ${formatMoney(offer.price)}`
    const ratingLabel = rating === 'Sem avaliações' ? rating : `${rating} · ${reviews}`
    const hasHeader = Boolean(offer.provider_name)

    return (
        <ScreenContainer>
            <ScreenHeader
                title={offer.provider_name || 'Perfil do groomer'}
                description="Perfil público"
                showBackButton
                onBack={() => navigation.goBack()}
            />
            {hasHeader ? (
                <View style={styles.headerBlock}>
                    <GroomerProfileHeader
                        name={offer.provider_name!}
                        photoUrl={offer.photo_url}
                        ratingLabel={ratingLabel}
                    />
                </View>
            ) : (
                <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Avaliação</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{ratingLabel}</Text>
                </>
            )}
            <MGText variant="label" color="secondary" style={styles.label}>
                Preço indicativo
            </MGText>
            <MGText variant="body" style={styles.value}>
                {price}
            </MGText>
            <MGText variant="label" color="secondary" style={styles.label}>
                Serviço
            </MGText>
            <MGText variant="body" style={styles.value}>
                {offer.service_name}
            </MGText>
            <MGButton
                label="Agendar este serviço"
                onPress={() => navigation.navigate('BookService', { providerServiceId })}
            />
        </ScreenContainer>
    )
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    headerBlock: {
        marginBottom: spacing.md,
    },
    label: {
        fontFamily: fonts.semibold,
        fontSize: typography.sizes.sm,
        marginTop: spacing.md,
    },
    value: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    message: {
        fontFamily: fonts.regular,
        fontSize: typography.sizes.md,
        textAlign: 'center',
    },
})
