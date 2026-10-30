import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetPublicProfile } from '../../hooks/useProviders'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { MGButton, MGEmptyState, MGErrorState, MGScreen, MGText } from '../../design-system/components'
import { GroomerProfileHeader } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { formatMoney } from '../../utils/formatMoney'
import { formatRating } from '../../utils/formatRating'
import { PublicProfileService } from '../../types/provider.types'

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'GroomerProfile'>
    route: RouteProp<HomeStackParamList, 'GroomerProfile'>
}

export default function GroomerPublicProfileScreen({ navigation, route }: Props) {
    const { colors, spacing } = useMGTheme()
    const { providerServiceId } = route.params
    const { data: profile, isLoading, isFetching, isError, refetch } = useGetPublicProfile(providerServiceId)
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)

    useEffect(() => {
        if (!profile || !selectedServiceId) return
        if (!profile.services.some(service => service.id === selectedServiceId)) {
            setSelectedServiceId(null)
        }
    }, [profile, selectedServiceId])

    const openBooking = () => {
        if (!selectedServiceId) return
        navigation.navigate('BookService', { providerServiceId: selectedServiceId })
    }

    if (isLoading || (!profile && isFetching)) {
        return (
            <MGScreen safeArea={false}>
                <ScreenHeader title="Perfil do profissional" showBackButton onBack={() => navigation.goBack()} />
                <View style={styles.centered} accessibilityLabel="Carregando perfil">
                    <ActivityIndicator size="large" color={colors.action.primary} />
                    <MGText variant="body">Carregando perfil</MGText>
                </View>
            </MGScreen>
        )
    }

    if (isError || !profile) {
        return (
            <MGScreen safeArea={false}>
                <ScreenHeader title="Perfil do profissional" showBackButton onBack={() => navigation.goBack()} />
                <MGErrorState
                    message="Não foi possível carregar este perfil."
                    onRetry={() => refetch()}
                />
            </MGScreen>
        )
    }

    const rating = formatRating(profile.average_rating)
    const reviews = profile.review_count === 1 ? '1 avaliação' : `${profile.review_count ?? 0} avaliações`
    const ratingLabel = rating === 'Sem avaliações' ? rating : `Avaliação ${rating} · ${reviews}`
    const rules = profile.attendance_rules?.trim()
        ? profile.attendance_rules
        : 'Este profissional ainda não publicou regras de atendimento.'

    return (
        <MGScreen
            safeArea={false}
            scrollable
            footer={(
                <MGButton
                    label="Agendar serviço"
                    disabled={!selectedServiceId}
                    onPress={openBooking}
                />
            )}
        >
            <ScreenHeader
                title="Perfil do profissional"
                showBackButton
                onBack={() => navigation.goBack()}
            />
            <GroomerProfileHeader
                name={profile.name}
                photoUrl={profile.photo_url}
                verified={profile.is_verified === true}
                ratingLabel={ratingLabel}
            />

            <MGText variant="heading3" style={{ marginTop: spacing.lg }}>
                Serviços disponíveis
            </MGText>
            {profile.services.length === 0 ? (
                <MGEmptyState
                    title="Nenhum serviço disponível"
                    description="Este profissional não tem serviços ativos para agendar."
                />
            ) : (
                <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Serviços disponíveis"
                    style={{ marginTop: spacing.sm }}
                >
                    {profile.services.map(service => (
                        <ServiceOption
                            key={service.id}
                            service={service}
                            selected={service.id === selectedServiceId}
                            onSelect={setSelectedServiceId}
                        />
                    ))}
                </View>
            )}
            {!selectedServiceId ? (
                <MGText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
                    Selecione um serviço para continuar.
                </MGText>
            ) : null}

            <MGText variant="heading3" style={{ marginTop: spacing.lg }}>
                Regras de atendimento
            </MGText>
            <MGText variant="body" style={{ marginTop: spacing.sm }}>
                {rules}
            </MGText>
        </MGScreen>
    )
}

function ServiceOption({ service, selected, onSelect }: {
    service: PublicProfileService
    selected: boolean
    onSelect: (id: string) => void
}) {
    const { colors, spacing, radius, fonts } = useMGTheme()
    const price = `A partir de ${formatMoney(service.price)}`
    const label = selected ? `${service.name}, selecionado, ${price}` : `${service.name}, ${price}`

    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => onSelect(service.id)}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 52,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                marginBottom: spacing.sm,
                borderRadius: radius.lg,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.action.primary : colors.border.default,
                backgroundColor: selected ? colors.surface.pinkSubtle : colors.surface.default,
                gap: spacing.sm,
            }}
        >
            <MGText variant="title" style={{ flex: 1 }}>{service.name}</MGText>
            <MGText variant="body" color="brand" style={{ fontFamily: fonts.bold }}>{price}</MGText>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
})
