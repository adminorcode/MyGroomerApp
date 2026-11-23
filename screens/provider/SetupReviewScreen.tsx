import { View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGCard, MGScreen, MGText } from '../../design-system/components'
import { OnboardingStepper } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useGetProviderMenu, useGetServiceLocation, useGetWeeklyAvailability } from '../../hooks/useProviders'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { useRegistrationNavigation } from '../../store/registrationNavigation'
import { formatMoney } from '../../utils/formatMoney'
import { getErrorMessage } from '../../utils/error'
import { WeekdayKey } from '../../design-system/patterns/WeeklyAvailabilityEditor'
import { FEE_OPTIONS } from './serviceLocationModel'
import { WEEKDAY_KEYS } from './weeklyAvailabilityModel'
import { providerOnboardingSteps } from './providerOnboardingSteps'
import ProviderSetupIntro from './ProviderSetupIntro'

const DAY_LABEL: Record<WeekdayKey, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
}

type Props = {
  navigation: StackNavigationProp<ProviderServicesStackParamList, 'SetupReview'>
}

export default function SetupReviewScreen({ navigation }: Props) {
  const { spacing } = useMGTheme()
  const menu = useGetProviderMenu()
  const location = useGetServiceLocation()
  const routine = useGetWeeklyAvailability()
  const waiting = menu.isLoading || location.isLoading || routine.isLoading
  const failed = menu.isError || location.isError || routine.isError
  const error = menu.error ?? location.error ?? routine.error

  const finish = () => {
    useRegistrationNavigation.getState().setUserId(null)
    navigation.getParent()?.navigate('BookingsTab')
  }

  const activeOffers = (menu.data?.offers ?? []).filter(offer => offer.is_active)
  const days = routine.data
    ? WEEKDAY_KEYS.flatMap(key => {
        const day = routine.data?.days[key]
        if (!day?.enabled) return []
        const range = day.start && day.end ? `${day.start} às ${day.end}` : 'horário a definir'
        return [`${DAY_LABEL[key]}, ${range}`]
      })
    : []
  const fee = FEE_OPTIONS.find(option => option.id === location.data?.travel_fee_mode)
  const feeLabel = location.data?.travel_fee_mode === 'per_km' && location.data.travel_fee_per_km != null
    ? `${formatMoney(location.data.travel_fee_per_km)} por km`
    : fee?.label ?? 'Taxa não informada'
  const address = location.data?.address?.trim() || 'Endereço não informado'
  const radius = location.data?.radius_km != null ? `Raio de ${location.data.radius_km} km` : 'Raio não informado'

  return (
    <MGScreen
      safeArea={false}
      scrollable
      loading={waiting}
      error={!waiting && failed ? getErrorMessage(error) : null}
      onRetry={() => {
        void menu.refetch()
        void location.refetch()
        void routine.refetch()
      }}
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <MGButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
          <View style={{ flex: 1 }}>
            <MGButton label="Concluir" onPress={finish} />
          </View>
        </View>
      )}
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <OnboardingStepper steps={providerOnboardingSteps} currentStepId="review" />
        <ProviderSetupIntro
          title="Revisão"
          description="Confira o que o tutor vai encontrar. Você pode voltar e ajustar antes de concluir."
        />
        {routine.data?.travel_gap_minutes ? (
          <View style={{ gap: spacing.xs }}>
            <MGText variant="bodySmall" color="success" accessibilityRole="alert">Rotina salva.</MGText>
            <MGText variant="bodySmall" color="secondary">
              {`Entre atendimentos: ${routine.data.travel_gap_minutes} minutos.`}
            </MGText>
          </View>
        ) : null}
        <Summary title="Serviços" lines={activeOffers.length ? activeOffers.map(offer => offer.name) : ['Nenhum serviço ativo.']} />
        <Summary title="Local de atendimento" lines={[address, radius, feeLabel]} />
        <Summary
          title="Horários"
          lines={days.length ? days : ['Nenhum dia ligado.']}
        />
      </View>
    </MGScreen>
  )
}

function Summary({ title, lines }: { title: string; lines: string[] }) {
  const { spacing } = useMGTheme()
  return (
    <MGCard>
      <View style={{ gap: spacing.xs }}>
        <MGText variant="heading3">{title}</MGText>
        {lines.map((line, index) => (
          <MGText key={`${title}-${index}`} variant="bodySmall" color="secondary">{line}</MGText>
        ))}
      </View>
    </MGCard>
  )
}
