import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { borderRadius, fonts, typography, spacing } from '../../constants/theme'
import { palette, textStyles } from '../../design-system/tokens'

type Props = {
    title: string
    onPress?: () => void
    actionLabel?: string
    /** CMP-09: `eyebrow` = rótulo em caixa-alta, teal, sobre canvas (R5). */
    variant?: 'default' | 'eyebrow'
}
export default function SectionHeader({ title, onPress, actionLabel, variant = 'default' }: Props) {
    const { colors } = useTheme()
    const eyebrow = variant === 'eyebrow'
  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[
            eyebrow ? styles.eyebrow : styles.title,
            { color: eyebrow ? palette.brand.teal : colors.text },
        ]}
      >
        {title}
      </Text>
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
    eyebrow: {
        fontSize: textStyles.eyebrow.fontSize,
        lineHeight: textStyles.eyebrow.lineHeight,
        fontFamily: fonts.semibold,
        letterSpacing: textStyles.eyebrow.letterSpacing,
        textTransform: 'uppercase',
    },
    buttonText: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
    },
})
