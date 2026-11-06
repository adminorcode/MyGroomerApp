import { Pressable, StyleSheet, View } from 'react-native'
import { Pet, petSizeLabel, petSpeciesLabel } from '../../types/pet.types'
import MGAvatar from '../components/MGAvatar'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  pet: Pet
  selected?: boolean
  onPress?: () => void
  onEdit?: () => void
}

export default function PetCard({ pet, selected = false, onPress, onEdit }: Props) {
  const { colors, spacing, radius, elevation } = useMGTheme()
  const species = petSpeciesLabel(pet.species)
  const size = petSizeLabel(pet.size)
  const photoLabel = pet.photo_url ? 'Com foto' : 'Sem foto'
  const details = `${species} · ${size} · ${photoLabel}`

  const body = (
    <>
      <MGAvatar name={pet.name} kind="pet" uri={pet.photo_url} size={64} />
      <View style={styles.content}>
        <MGText variant="title">{pet.name}</MGText>
        <MGText variant="bodySmall" color="secondary" style={{ marginTop: spacing.xs }}>
          {details}
        </MGText>
        {selected ? (
          <MGText variant="label" color="brand" style={{ marginTop: spacing.xs }}>
            Selecionado
          </MGText>
        ) : null}
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${pet.name}`}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
          onPress={onEdit}
        >
          <MGText variant="label" color="brand">
            Editar
          </MGText>
        </Pressable>
      ) : null}
    </>
  )

  const cardStyle = [
    styles.card,
    elevation.low,
    {
      gap: spacing.md,
      borderRadius: radius.lg,
      padding: spacing.base,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface.default,
      borderColor: selected ? colors.action.primary : colors.border.default,
      borderWidth: selected ? 2 : 1,
    },
  ]

  if (!onPress) {
    return <View style={cardStyle}>{body}</View>
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${pet.name}. ${details}${selected ? '. Selecionado' : ''}`}
      onPress={onPress}
      style={cardStyle}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
})
