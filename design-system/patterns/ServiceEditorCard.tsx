import { StyleSheet, View } from 'react-native'
import MGBadge from '../components/MGBadge'
import MGButton from '../components/MGButton'
import MGCard from '../components/MGCard'
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
  prices?: ServicePriceBySize
  onEdit?: () => void
  onToggleActive?: () => void
}

export default function ServiceEditorCard({
  name,
  active = true,
  durationLabel,
  prices,
  onEdit,
  onToggleActive,
}: Props) {
  const { spacing, fonts } = useMGTheme()
  const priceLine = [
    prices?.small ? `Pequeno ${prices.small}` : null,
    prices?.medium ? `Médio ${prices.medium}` : null,
    prices?.large ? `Grande ${prices.large}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <MGCard>
      <View style={[styles.header, { gap: spacing.sm, marginBottom: spacing.sm }]}>
        <MGText variant="title" style={{ flex: 1 }}>
          {name}
        </MGText>
        <MGBadge label={active ? 'Ativo' : 'Inativo'} tone={active ? 'success' : 'neutral'} />
      </View>
      {durationLabel ? (
        <MGText variant="bodySmall" color="secondary">
          Duração: {durationLabel}
        </MGText>
      ) : null}
      {priceLine ? (
        <MGText variant="bodySmall" style={{ marginTop: spacing.xs, fontFamily: fonts.bold }}>
          {priceLine}
        </MGText>
      ) : null}
      <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.md }]}>
        {onToggleActive ? (
          <View style={styles.action}>
            <MGButton
              label={active ? 'Desativar' : 'Ativar'}
              variant="secondary"
              onPress={onToggleActive}
            />
          </View>
        ) : null}
        {onEdit ? (
          <View style={styles.action}>
            <MGButton label="Editar" onPress={onEdit} />
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
  actions: {
    flexDirection: 'row',
  },
  action: {
    flex: 1,
  },
})
