import { Pressable, StyleSheet, View } from 'react-native'
import { MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { RequestGroupFilter } from '../../types/request.types'
import { REQUEST_TABS } from './requestsModel'

type Props = {
  value: RequestGroupFilter
  onChange: (group: RequestGroupFilter) => void
}

export default function RequestGroupTabs({ value, onChange }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.list,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
          borderRadius: radius.xl,
          padding: spacing.xs,
          gap: spacing.xs,
        },
      ]}
    >
      {REQUEST_TABS.map(tab => {
        const selected = tab.id === value
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              {
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.action.primary : 'transparent',
                opacity: pressed && !selected ? 0.8 : 1,
              },
            ]}
          >
            <MGText
              variant="label"
              style={{ color: selected ? colors.onAction.primary : colors.text.primary }}
            >
              {tab.label}
            </MGText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  // Os rótulos nunca truncam: quando a linha não comporta as quatro abas, elas quebram em duas linhas.
  list: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1 },
  tab: { flexGrow: 1, flexBasis: 'auto', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
})
