import { ReactNode } from 'react'
import { View } from 'react-native'
import { palette, radius, spacing } from '../design-system/tokens'

/**
 * CMP-07: aba ativa com pílula `surface.pinkSubtle` atrás do ícone.
 * O ícone segue a cor da aba (`action.primaryOutline` quando ativa, via tabBarActiveTintColor).
 */
export default function TabIconPill({ focused, children }: { focused: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        width: 56,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? palette.surface.pinkSubtle : 'transparent',
        marginBottom: spacing.xxs,
      }}
    >
      {children}
    </View>
  )
}
