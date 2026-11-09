import { ActivityIndicator, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGErrorState, MGScreen, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ScreenHeader from '../../components/shared/ScreenHeader'
import GroomerPublicProfileView from '../../components/groomer/GroomerPublicProfileView'
import { useGetOwnPublicProfile, useGetPublicProfile } from '../../hooks/useProviders'
import { ProfileStackParamList } from '../../navigation/types'
import { getErrorMessage } from '../../utils/error'

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'PublicProfilePreview'>
}

export default function PublicProfilePreviewScreen({ navigation }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const own = useGetOwnPublicProfile()
  const serviceId = own.data?.services[0]?.id ?? ''
  const published = useGetPublicProfile(serviceId, Boolean(serviceId))
  const profile = serviceId ? published.data : own.data
  const loading = own.isLoading || (Boolean(serviceId) && (published.isLoading || (!published.data && published.isFetching)))
  const failed = own.isError || (Boolean(serviceId) && published.isError)

  const retry = () => {
    void own.refetch()
    if (serviceId) void published.refetch()
  }

  return (
    <MGScreen
      safeArea={false}
      scrollable
      footer={(
        <View style={{ gap: spacing.xs }}>
          <MGButton label="Agendar serviço" disabled onPress={() => {}} />
          <MGText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
            A prévia não inicia um agendamento.
          </MGText>
        </View>
      )}
    >
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <ScreenHeader title="Perfil do profissional" showBackButton onBack={() => navigation.goBack()} />

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl }} accessibilityLabel="Carregando perfil">
            <ActivityIndicator size="large" color={colors.brand.teal} />
            <MGText variant="body">Carregando perfil</MGText>
          </View>
        ) : failed || !profile ? (
          <MGErrorState
            message={getErrorMessage(own.error ?? published.error) || 'Não foi possível carregar este perfil.'}
            onRetry={retry}
          />
        ) : (
          <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
            <View
              style={{
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: colors.surface.tealSubtle,
              }}
            >
              <MGText variant="bodySmall">
                Você está vendo o perfil como o tutor vê na busca. Nada aqui pode ser editado.
              </MGText>
            </View>
            <GroomerPublicProfileView profile={profile} mode="preview" />
          </View>
        )}
      </View>
    </MGScreen>
  )
}
