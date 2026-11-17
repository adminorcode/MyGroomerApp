import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import MGIcon from './MGIcon'
import { MG_CONTROL_HEIGHT } from './MGTextField'
import { motion, motionEasing } from '../tokens'
import { useMGTheme } from '../theme/useMGTheme'
import { useReduceMotion } from '../theme/useReduceMotion'
import { useSelectionProgress } from '../theme/useSelectionProgress'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = {
  label: string
  accessibilityLabel?: string
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  variant?: 'filter' | 'choice'
  minHeight?: number
  density?: 'regular' | 'compact'
  /** Ocupa a largura do pai. Usado quando os chips dividem a linha. */
  fill?: boolean
  accessibilityRole?: 'button' | 'radio'
}

/**
 * CMP-06 / R1: a ação é sempre rosa. Selecionado = preenchimento `action.primary`
 * com texto `onAction.primary` e check. Não selecionado = contorno `action.primaryOutline`.
 * Fundo e borda cruzam em 150 ms. Pressed troca a cor na hora, por cima da seleção.
 */
export default function MGChip({
  label,
  accessibilityLabel,
  selected = false,
  disabled = false,
  onPress,
  minHeight = MG_CONTROL_HEIGHT,
  density = 'regular',
  fill = false,
  accessibilityRole = 'button',
}: Props) {
  const { colors, spacing, radius, fonts, textStyles } = useMGTheme()
  const reduceMotion = useReduceMotion()
  const progress = useSelectionProgress(selected)
  const [pressed, setPressed] = useState(false)
  const cover = useRef(new Animated.Value(0)).current
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reduceMotion) {
      cover.setValue(0)
      return
    }
    cover.setValue(1)
    const animation = Animated.timing(cover, {
      toValue: 0,
      duration: motion.selection,
      easing: motionEasing.enter,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [cover, reduceMotion, selected])

  const showPressed = pressed && !disabled
  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.action.primaryOutline, colors.action.primary],
  })
  const fillColor = disabled
    ? colors.state.disabledSurface
    : showPressed
      ? selected ? colors.action.primaryPressed : colors.surface.pinkSubtle
      : selected ? colors.action.primary : colors.surface.default
  const edge = disabled
    ? colors.border.default
    : showPressed && selected
      ? colors.action.primaryPressed
      : borderColor
  const textColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.text.primary, colors.onAction.primary],
  })
  const labelColor = disabled
    ? colors.state.disabledText
    : showPressed
      ? selected ? colors.onAction.primary : colors.text.primary
      : textColor

  const height = Math.min(minHeight, MG_CONTROL_HEIGHT)

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        selected,
        disabled,
        ...(accessibilityRole === 'radio' ? { checked: selected } : {}),
      }}
      aria-selected={selected}
      aria-checked={accessibilityRole === 'radio' ? selected : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.chip, fill && styles.fill, {
        height,
        minHeight: height,
        maxHeight: height,
        width: density === 'compact' || fill ? '100%' : undefined,
        paddingHorizontal: density === 'compact' ? spacing.sm : spacing.md,
        paddingVertical: 0,
        borderRadius: radius.control,
        borderWidth: 1,
        backgroundColor: fillColor,
        borderColor: edge,
        overflow: 'hidden',
      }]}
    >
      {reduceMotion || showPressed ? null : (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {
            backgroundColor: selected ? colors.surface.default : colors.action.primary,
            opacity: cover,
            borderRadius: radius.control,
          }]}
        />
      )}
      <View style={[styles.labelRow, { gap: spacing.xs }]}>
        {selected && !disabled ? (
          <View style={styles.check}>
            <MGIcon name="check" size={14} color={colors.onAction.primary} />
          </View>
        ) : null}
        <Animated.Text
          numberOfLines={1}
          style={{
            color: labelColor,
            fontFamily: fonts.semibold,
            fontSize: textStyles.label.fontSize,
            lineHeight: textStyles.label.lineHeight,
          }}
        >
          {label}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fill: {
    alignSelf: 'stretch',
  },
  check: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
