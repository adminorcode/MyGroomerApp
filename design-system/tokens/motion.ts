import { Easing } from 'react-native'

/**
 * Durações escolhidas dentro da seção 16 do guia (plano 029).
 * Seleção e entrada curta ficam em 150 ms; o painel, em 180 ms;
 * confirmação e véu, em 200 ms. Não é uma segunda escala.
 */
export const motion = {
  selection: 150,
  disclosure: 180,
  success: 200,
  overlay: 200,
  enterOffset: 12,
  bubbleOffset: 8,
} as const

export const motionEasing = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
}
