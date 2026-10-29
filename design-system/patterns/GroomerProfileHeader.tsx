import { StyleSheet, View } from 'react-native'
import MGAvatar from '../components/MGAvatar'
import MGBadge from '../components/MGBadge'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  name: string
  photoUrl?: string | null
  verified?: boolean
  ratingLabel?: string
  specialties?: string[]
  description?: string
}

export default function GroomerProfileHeader({
  name,
  photoUrl,
  verified = false,
  ratingLabel,
  specialties = [],
  description,
}: Props) {
  const { spacing } = useMGTheme()

  return (
    <View style={[styles.wrap, { gap: spacing.md }]}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <MGAvatar name={name} uri={photoUrl} kind="person" size={72} />
        <View style={styles.meta}>
          <MGText variant="heading2">{name}</MGText>
          <View style={[styles.row, { gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' }]}>
            {verified ? <MGBadge label="Verificado" tone="success" /> : null}
            {ratingLabel ? <MGBadge label={ratingLabel} tone="info" /> : null}
          </View>
        </View>
      </View>
      {specialties.length > 0 ? (
        <MGText variant="bodySmall" color="secondary">
          {specialties.join(' · ')}
        </MGText>
      ) : null}
      {description ? (
        <MGText variant="body" color="secondary">
          {description}
        </MGText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
  },
})
