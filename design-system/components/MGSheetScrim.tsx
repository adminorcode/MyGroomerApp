import { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { motion, motionEasing } from '../tokens'
import { useMGTheme } from '../theme/useMGTheme'
import { useReduceMotion } from '../theme/useReduceMotion'

/**
 * Véu `overlay.scrim` em fade de 200 ms. Não recebe toque: o sheet e o fundo
 * que fecham continuam imediatos, sem esperar o fade.
 */
export default function MGSheetScrim({ visible }: { visible: boolean }) {
  const { colors } = useMGTheme()
  const reduceMotion = useReduceMotion()
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : motion.overlay,
      easing: visible ? motionEasing.enter : motionEasing.exit,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [opacity, reduceMotion, visible])

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.scrim, opacity }]}
    />
  )
}
