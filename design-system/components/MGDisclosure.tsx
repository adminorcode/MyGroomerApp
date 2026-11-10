import { ReactNode, useEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'
import { motion, motionEasing } from '../tokens'
import { useReduceMotion } from '../theme/useReduceMotion'
import MGIcon from './MGIcon'

type Props = {
  open: boolean
  children: ReactNode
  /** Identificador do painel no DOM, para o acionador apontar com aria-controls. */
  nativeID?: string
}

/**
 * Painel que abre e fecha no fluxo: 180 ms, 12 px, ease-out.
 * A altura não anima. Com Reduzir movimento a duração é 0 e não há deslocamento.
 */
export default function MGDisclosure({ open, children, nativeID }: Props) {
  const reduceMotion = useReduceMotion()
  const [mounted, setMounted] = useState(open)
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current

  useEffect(() => {
    if (open) setMounted(true)
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 0 : motion.disclosure,
      easing: motionEasing.enter,
      useNativeDriver: true,
    })
    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false)
    })
    return () => animation.stop()
  }, [open, progress, reduceMotion])

  if (!mounted) return null

  return (
    <Animated.View
      nativeID={nativeID}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={reduceMotion ? undefined : {
        transform: [{
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-motion.enterOffset, 0],
          }),
        }],
      }}
    >
      {children}
    </Animated.View>
  )
}

/** Chevron que gira 180° no mesmo tempo do painel. Com Reduzir movimento a rotação é imediata. */
export function MGDisclosureChevron({
  expanded,
  size = 14,
  color,
}: {
  expanded: boolean
  size?: number
  color: string
}) {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: reduceMotion ? 0 : motion.disclosure,
      easing: motionEasing.enter,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [expanded, progress, reduceMotion])

  return (
    <Animated.View style={{
      transform: [{
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      }],
    }}>
      <MGIcon name="chevron-down" size={size} color={color} />
    </Animated.View>
  )
}
