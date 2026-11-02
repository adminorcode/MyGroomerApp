import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetPublicProfile } from '../../hooks/useProviders'
import ScreenHeader from '../../components/shared/ScreenHeader'
import GroomerPublicProfileView from '../../components/groomer/GroomerPublicProfileView'
import { MGButton, MGErrorState, MGScreen, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'

type Props = {
    navigation: StackNavigationProp<HomeStackParamList, 'GroomerProfile'>
    route: RouteProp<HomeStackParamList, 'GroomerProfile'>
}

export default function GroomerPublicProfileScreen({ navigation, route }: Props) {
    const { colors } = useMGTheme()
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
        navigation.navigate('BookService', {
            providerServiceId: selectedServiceId,
            customerLocation: route.params.customerLocation,
            customerLatitude: route.params.customerLatitude,
            customerLongitude: route.params.customerLongitude,
        })
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
            <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
            <ScreenHeader
                title="Perfil do profissional"
                showBackButton
                onBack={() => navigation.goBack()}
            />
            <GroomerPublicProfileView
                profile={profile}
                mode="booking"
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
            />
            </View>
        </MGScreen>
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
