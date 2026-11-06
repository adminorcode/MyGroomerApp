import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, typography, spacing } from '../../constants/theme'

type Props = {
    title: string
    onPress?: () => void
    actionLabel?: string
}
export default function SectionHeader({ title, onPress, actionLabel }: Props) {
    const { colors } = useTheme()
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {actionLabel && onPress  && <Pressable onPress={onPress}>
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>{actionLabel}</Text>
      </Pressable>}
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontFamily: fonts.semibold,
    },
    buttonText: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
    },
})