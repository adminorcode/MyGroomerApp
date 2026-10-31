import { StyleSheet, View, useWindowDimensions } from 'react-native'
import MGButton from '../components/MGButton'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

type Props = {
  title?: string
  subtitle?: string
  onSelectTutor: () => void
  onSelectGroomer: () => void
  tutorLabel?: string
  groomerLabel?: string
}

export default function ProfileRoleSelector({
  title = 'MyGroomer',
  subtitle = 'Banho e tosa em domicílio',
  onSelectTutor,
  onSelectGroomer,
  tutorLabel = 'Sou tutor',
  groomerLabel = 'Sou profissional',
}: Props) {
  const { colors, spacing, fonts, textStyles } = useMGTheme()
  const { width } = useWindowDimensions()

  return (
    <View style={[styles.wrap, { gap: spacing.md }]}>
      <MGText
        variant="display"
        style={{
          color: colors.brand.pink,
          fontFamily: fonts.logo,
          fontSize: width < 360 ? textStyles.heading1.fontSize : textStyles.display.fontSize,
          textAlign: 'center',
        }}
      >
        {title}
      </MGText>
      <MGText variant="body" style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
        {subtitle}
      </MGText>
      <MGButton label={tutorLabel} onPress={onSelectTutor} />
      <MGButton label={groomerLabel} variant="teal" onPress={onSelectGroomer} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
})
