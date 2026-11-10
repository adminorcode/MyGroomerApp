import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/** Leitura síncrona na web, para o primeiro frame já respeitar Reduzir movimento. */
export function readReduceMotion(): boolean | null {
  if (typeof globalThis.matchMedia !== 'function') return null
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Preferência de Reduzir movimento, inclusive no meio da sessão.
 * Assina `reduceMotionChanged` em vez de ler só na abertura do app.
 */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(() => readReduceMotion() ?? false)

  useEffect(() => {
    let active = true
    const apply = (value: boolean) => {
      if (active) setReduceMotion(value)
    }
    AccessibilityInfo.isReduceMotionEnabled().then(apply).catch(() => {})
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return reduceMotion
}
