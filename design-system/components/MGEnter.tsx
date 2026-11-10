import { ReactNode, useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { motion, motionEasing } from '../tokens'
import { readReduceMotion, useReduceMotion } from '../theme/useReduceMotion'

type Props = {
  children: ReactNode
  /** Duração da entrada. Confirmação usa `motion.success`; vazio, erro e balão usam `motion.selection`. */
  duration?: number
  /** Subida em px. Com Reduzir movimento o deslocamento não existe. */
  offset?: number
}

/**
 * Fade único na montagem. O nó fica na árvore desde o primeiro frame.
 * Re-render do pai não repete a entrada. Reduzir movimento nasce em opacidade 1, sem translate.
 */
export default function MGEnter({ children, duration = motion.selection, offset = 0 }: Props) {
  const reduceMotion = useReduceMotion()
  const knownReduce = readReduceMotion()
  const opacity = useRef(new Animated.Value(knownReduce === false ? 0 : 1)).current
  const translateY = useRef(new Animated.Value(knownReduce === false && offset > 0 ? offset : 0)).current

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1)
      translateY.setValue(0)
      return
    }
    opacity.setValue(0)
    if (offset > 0) translateY.setValue(offset)
    const animations = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }),
    ]
    if (offset > 0) {
      animations.push(Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }))
    }
    const running = Animated.parallel(animations)
    running.start()
    return () => running.stop()
  }, [duration, offset, opacity, reduceMotion, translateY])

  return (
    <Animated.View style={offset > 0 && !reduceMotion
      ? { opacity, transform: [{ translateY }] }
      : { opacity }}>
      {children}
    </Animated.View>
  )
}
