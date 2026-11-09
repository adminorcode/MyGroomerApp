import { View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { MGButton, MGCard, MGChip, MGIcon, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { ProviderEditionStackParamList } from '../../navigation/types'
import { useServiceMenuDraft } from './ServiceMenuDraft'
import { offerTitle, parseMinutes, parseMoney, SIZE_KEYS, SIZE_LABELS } from './serviceMenuModel'
import { formatMoney } from '../../utils/formatMoney'

type Props = {
  navigation: StackNavigationProp<ProviderEditionStackParamList, 'ServiceOfferEditor'>
  route: RouteProp<ProviderEditionStackParamList, 'ServiceOfferEditor'>
}

export default function ServiceOfferEditorScreen({ navigation, route }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const draft = useServiceMenuDraft()
  const offer = draft.state?.offers.find(item => item.key === route.params.draftKey)

  if (!offer || !draft.state) {
    return (
      <MGScreen
        safeArea={false}
        footer={<MGButton label="Voltar ao cardápio" variant="secondary" onPress={() => navigation.goBack()} />}
      >
        <MGText variant="body">Este serviço não está mais no cardápio.</MGText>
      </MGScreen>
    )
  }

  const title = offerTitle(offer)
  const selectedType = draft.state.types.find(type => type.id === offer.professional_type_id)
  const selectedCategory = draft.state.categories.find(category => category.id === offer.category_id)

  return (
    <MGScreen
      safeArea={false}
      scrollable
      footer={<MGButton label="Concluir" onPress={() => navigation.goBack()} />}
    >
      <View style={{ gap: spacing.md, paddingTop: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <MGText variant="heading2">{offer.service_id ? title : 'Novo serviço'}</MGText>
        {offer.service_id ? (
          <MGText variant="body" color="secondary">{offer.category_id ? draft.state.categories.find(category => category.id === offer.category_id)?.name : ''}</MGText>
        ) : (
          <MGTextField
            label="Nome do serviço"
            value={offer.custom_name}
            onChangeText={text => draft.updateOffer(offer.key, { custom_name: text, name: text })}
            required
          />
        )}
        {!offer.service_id ? (
          <View style={{ gap: spacing.sm }}>
            <MGText variant="label">Categoria</MGText>
            <MGText variant="bodySmall" color="secondary">
              {selectedCategory ? `Categoria escolhida: ${selectedCategory.name}` : 'Escolha a categoria do serviço.'}
            </MGText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {draft.state.categories.map(category => (
                <MGChip
                  key={category.id}
                  label={category.name}
                  variant="choice"
                  selected={offer.category_id === category.id}
                  onPress={() => draft.updateOffer(offer.key, { category_id: category.id })}
                />
              ))}
            </View>
          </View>
        ) : null}
        <MGCard>
        <View style={{ gap: spacing.sm }}>
          <MGText variant="label">Tipo</MGText>
          {draft.state.types.length === 0 ? (
            <MGText variant="bodySmall" color="secondary">
              Sua conta ainda não tem um tipo ativo. Um serviço ativo precisa de um tipo escolhido no cadastro.
            </MGText>
          ) : (
            <MGText variant="bodySmall" color="secondary">
              {selectedType ? `Tipo escolhido: ${selectedType.name}` : 'Escolha um tipo da conta.'}
            </MGText>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {draft.state.types.map(type => (
              <MGChip
                key={type.id}
                label={type.name}
                variant="choice"
                selected={offer.professional_type_id === type.id}
                onPress={() => draft.updateOffer(offer.key, {
                  professional_type_id: type.id,
                  professionalTypeName: type.name,
                })}
              />
            ))}
          </View>
        </View>
        </MGCard>
        <MGCard>
        {/* Revisão UI (027): campos sem ícone, como Nome, Preço e Duração; ícones mistos no mesmo formulário saem. */}
        <MGTextField
          label="Descrição"
          value={offer.description}
          onChangeText={text => draft.updateOffer(offer.key, { description: text })}
          required
          multiline
        />
        </MGCard>
        {SIZE_KEYS.map(size => (
          <MGCard key={size}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MGIcon name="paw-print" color={colors.action.primary} size={20} />
              <MGText variant="title">Porte {SIZE_LABELS[size].toLowerCase()}</MGText>
            </View>
            <MGTextField
              label={`Preço ${SIZE_LABELS[size].toLowerCase()}`}
              value={offer.prices[size]}
              onChangeText={text => draft.updateOffer(offer.key, {
                prices: { ...offer.prices, [size]: text },
              })}
              keyboardType="decimal-pad"
              required
            />
            <MGTextField
              label={`Duração ${SIZE_LABELS[size].toLowerCase()}`}
              value={offer.durations[size]}
              onChangeText={text => draft.updateOffer(offer.key, {
                durations: { ...offer.durations, [size]: text },
              })}
              keyboardType="number-pad"
              helperText="Minutos"
              required
            />
          </View>
          </MGCard>
        ))}
        <MGCard variant="teal">
          <View style={{ gap: spacing.sm }}>
            <MGText variant="title">Resumo do serviço</MGText>
            <MGText variant="body">{title}</MGText>
            {SIZE_KEYS.map(size => {
              const price = parseMoney(offer.prices[size])
              const duration = parseMinutes(offer.durations[size])
              // R5: o valor em teal fica sobre superfície branca; o bloco tealSubtle segue com texto primário.
              return (
                <View key={size} style={{ backgroundColor: colors.surface.default, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs }}>
                  <MGText variant="label">{SIZE_LABELS[size]}</MGText>
                  {price.ok && price.value != null ? (
                    <MGText variant="numeric" color="teal">{formatMoney(price.value)}</MGText>
                  ) : (
                    <MGText variant="bodySmall">Preço não informado</MGText>
                  )}
                  <MGText variant="bodySmall">{duration.ok && duration.value != null ? `${duration.value} min` : 'Duração não informada'}</MGText>
                </View>
              )
            })}
            <MGText variant="caption">Concluir mantém as alterações no cardápio. Salve o cardápio para publicá-las.</MGText>
          </View>
        </MGCard>
        {/* Revisão UI (027): a remoção sai do rodapé fixo, onde disputava com o CTA rosa; fica no fim do formulário. */}
        {!offer.id ? (
          <MGButton
            label={`Remover ${title}`}
            variant="destructive"
            onPress={() => {
              draft.removeOffer(offer.key)
              navigation.goBack()
            }}
          />
        ) : null}
      </View>
    </MGScreen>
  )
}
