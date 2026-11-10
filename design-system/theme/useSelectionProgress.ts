import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { motion, motionEasing } from '../tokens'
import { useReduceMotion } from './useReduceMotion'

/** Progresso 0–1 da cor de seleção. O driver é JavaScript porque cor não interpola no nativo. */
export function useSelectionProgress(active: boolean) {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: reduceMotion ? 0 : motion.selection,
      easing: motionEasing.enter,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [active, progress, reduceMotion])

  return progress
}
