import { View, Text, Pressable, StyleSheet} from 'react-native'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'

type Props = {
    tabs: string[]
    activeTab: string
    onTabChange: (tab: string) => void
}

export default function SegmentedTabs({ tabs, activeTab, onTabChange }: Props) {
    const { colors } = useTheme()
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <Pressable key={tab} onPress={() => onTabChange(tab)} style={styles.tab}>
        <Text style={[styles.tabText, { color: activeTab === tab ? colors.primaryText : colors.textSecondary }]}>
            {tab}
        </Text>
        {activeTab === tab && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
        )}
    </Pressable>
      ))}   
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    tab: {
        paddingVertical: spacing.sm
    },
    tabText: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.medium,
        textTransform: 'capitalize'
    },
    indicator: {
        height: 3,
        borderRadius: borderRadius.full,
        marginTop: spacing.xs,
        width: '100%',
    }
})