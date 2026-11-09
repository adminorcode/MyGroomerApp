import { StyleSheet, View } from 'react-native'
import MGBadge from '../components/MGBadge'
import MGButton from '../components/MGButton'
import MGCard from '../components/MGCard'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type ServicePriceBySize = {
  small?: string
  medium?: string
  large?: string
}

type Props = {
  name: string
  active?: boolean
  durationLabel?: string
  typeLabel?: string
  prices?: ServicePriceBySize
  editLabel?: string
  toggleLabel?: string
  onEdit?: () => void
  onToggleActive?: () => void
}

export default function ServiceEditorCard({
  name,
  active = true,
  durationLabel,
  typeLabel,
  prices,
  editLabel,
  toggleLabel,
  onEdit,
  onToggleActive,
}: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const priceEntries = [
    prices?.small ? `Pequeno ${prices.small}` : null,
    prices?.medium ? `Médio ${prices.medium}` : null,
    prices?.large ? `Grande ${prices.large}` : null,
  ].filter((entry): entry is string => Boolean(entry))

  return (
    <MGCard>
      {/* CMP-11 / R3: destaque do profissional em tealSubtle, com avatar teal sólido e texto primário. */}
      <View
        style={[
          styles.header,
          {
            gap: spacing.sm,
            marginBottom: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface.tealSubtle,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.brand.teal }]}>
          <MGIcon name="scissors" size={20} color={colors.text.inverse} />
        </View>
        <View style={[styles.titleBlock, { gap: spacing.xs }]}>
          <MGText variant="title">{name}</MGText>
          {typeLabel ? (
            <MGText variant="bodySmall">
              {`Tipo: ${typeLabel}`}
            </MGText>
          ) : null}
        </View>
        {/* R6: status com semântica de feedback e texto, não depende da cor da marca. */}
        <MGBadge label={active ? 'Ativo' : 'Inativo'} tone={active ? 'success' : 'neutral'} />
      </View>
      {durationLabel ? (
        <MGText variant="bodySmall" color="secondary">
          Duração: {durationLabel}
        </MGText>
      ) : null}
      {priceEntries.length ? (
        <View style={[styles.prices, { columnGap: spacing.md, rowGap: spacing.xs, marginTop: spacing.xs }]}>
          {/* R3: preço por porte em teal, sobre superfície branca. */}
          {priceEntries.map(entry => (
            <MGText key={entry} variant="label" color="teal">
              {entry}
            </MGText>
          ))}
        </View>
      ) : null}
      {/* Revisão UI (027): ações empilhadas em largura total; em duas colunas o rótulo quebrava em 390 pt. Editar (CTA) vem primeiro. */}
      <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.md }]}>
        {onEdit ? (
          <View style={styles.action}>
            <MGButton label={editLabel ?? 'Editar'} onPress={onEdit} />
          </View>
        ) : null}
        {onToggleActive ? (
          <View style={styles.action}>
            <MGButton
              label={toggleLabel ?? (active ? 'Desativar' : 'Ativar')}
              variant="secondary"
              onPress={onToggleActive}
            />
          </View>
        ) : null}
      </View>
    </MGCard>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  prices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'column',
  },
  action: {
    width: '100%',
  },
})
