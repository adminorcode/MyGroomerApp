import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGButton, MGEmptyState, MGScreen, MGText } from '../../design-system/components'
import { OnboardingStepper, ServiceEditorCard } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useGetProviderMenu, useSaveProviderMenu } from '../../hooks/useProviders'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { formatMoney } from '../../utils/formatMoney'
import { getErrorMessage } from '../../utils/error'
import { useServiceMenuDraft } from './ServiceMenuDraft'
import {
  DraftOffer,
  menuIssue,
  offerTitle,
  parseMinutes,
  parseMoney,
  SIZE_KEYS,
  SIZE_LABELS,
  toMenuPayload,
} from './serviceMenuModel'

const steps = [
  { id: 'registration', label: 'Cadastro' },
  { id: 'services', label: 'Serviços' },
  { id: 'location', label: 'Local' },
]

type Props = {
  navigation: StackNavigationProp<ProviderServicesStackParamList, 'ServiceMenu'>
}

function priceLine(offer: DraftOffer) {
  const prices: { small?: string; medium?: string; large?: string } = {}
  for (const size of SIZE_KEYS) {
    const parsed = parseMoney(offer.prices[size])
    if (parsed.ok && parsed.value != null) prices[size] = formatMoney(parsed.value)
  }
  return prices
}

function durationLabel(offer: DraftOffer) {
  const parts = SIZE_KEYS.flatMap(size => {
    const parsed = parseMinutes(offer.durations[size])
    return parsed.ok && parsed.value != null ? [`${SIZE_LABELS[size]} ${parsed.value} min`] : []
  })
  return parts.length ? parts.join(' · ') : undefined
}

export default function ServiceMenuScreen({ navigation }: Props) {
  const { spacing } = useMGTheme()
  const draft = useServiceMenuDraft()
  const menu = useGetProviderMenu()
  const save = useSaveProviderMenu()
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (menu.data && !draft.state) draft.load(menu.data)
  }, [menu.data, draft.state, draft.load])

  const waiting = menu.isLoading || (menu.isFetching && !menu.data) || (!!menu.data && !draft.state && !menu.isError)
  const issue = draft.state
    ? menuIssue(draft.state.offers, new Set(draft.state.types.map(type => type.id)))
    : null

  const publish = async () => {
    if (!draft.state || issue) return
    setSaveError(null)
    try {
      const result = await save.mutateAsync(toMenuPayload(draft.state.offers))
      draft.load(result.data)
      navigation.navigate('ServiceLocation')
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  return (
    <MGScreen
      safeArea={false}
      scrollable
      loading={waiting}
      error={!waiting && menu.isError ? getErrorMessage(menu.error) : null}
      onRetry={() => { void menu.refetch() }}
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <MGButton
              label="Voltar"
              variant="secondary"
              onPress={() => navigation.navigate('ProfessionalRegistration')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <MGButton
              label="Continuar"
              onPress={() => { void publish() }}
              disabled={!!issue || save.isPending || !draft.state}
              loading={save.isPending}
            />
          </View>
        </View>
      )}
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <OnboardingStepper steps={steps} currentStepId="services" />
        <View style={{ gap: spacing.xs }}>
          <MGText variant="heading2">Dados do serviço</MGText>
          <MGText variant="body" color="secondary">
            Publique cada serviço com um tipo da conta, descrição, preço e duração para pequeno, médio e grande.
          </MGText>
        </View>
        <MGButton
          label="Adicionar serviço"
          variant="secondary"
          onPress={() => navigation.navigate('ServiceOfferEditor', { draftKey: draft.addCustom() })}
          disabled={!draft.state}
        />
        {issue ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert">
            {issue}
          </MGText>
        ) : null}
        {saveError ? (
          <MGText variant="bodySmall" color="error" accessibilityRole="alert">
            {saveError}
          </MGText>
        ) : null}
        {draft.state && draft.state.offers.length === 0 && draft.state.suggestions.length === 0 ? (
          <MGEmptyState
            title="Nenhum serviço"
            description="Inclua um serviço com preço e duração para cada porte."
          />
        ) : null}
        {draft.state?.offers.map(offer => {
          const title = offerTitle(offer)
          return (
            <ServiceEditorCard
              key={offer.key}
              name={title}
              active={offer.is_active}
              typeLabel={offer.professionalTypeName ?? undefined}
              durationLabel={durationLabel(offer)}
              prices={priceLine(offer)}
              editLabel={`Editar ${title}`}
              toggleLabel={`${offer.is_active ? 'Desativar' : 'Ativar'} ${title}`}
              onEdit={() => navigation.navigate('ServiceOfferEditor', { draftKey: offer.key })}
              onToggleActive={() => draft.toggleOffer(offer.key)}
            />
          )
        })}
        {draft.state && draft.state.suggestions.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <MGText variant="title">Sugeridos</MGText>
            {draft.state.suggestions.map(suggestion => (
              <ServiceEditorCard
                key={suggestion.service_id}
                name={suggestion.name}
                active={false}
                editLabel={`Incluir ${suggestion.name}`}
                onEdit={() => navigation.navigate('ServiceOfferEditor', { draftKey: draft.includeSuggestion(suggestion) })}
              />
            ))}
          </View>
        ) : null}
      </View>
    </MGScreen>
  )
}
