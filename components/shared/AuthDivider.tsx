import { StyleSheet, Text, View } from 'react-native'
import { fonts, typography } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'

export default function AuthDivider() {
    const { colors } = useTheme()

    return (
        <View style={styles.container}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>ou</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    line: {
        flex: 1,
        height: 1,
    },
    label: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        textTransform: 'lowercase',
    },
})
