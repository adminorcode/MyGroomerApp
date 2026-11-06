import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ReactNode } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { layout } from '../../constants/theme'

type Props = {
    children: ReactNode
}

export default function ScreenContainer({ children }: Props) {
    const { colors } = useTheme()
    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
            <View style={styles.content}>{children}</View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { paddingHorizontal: layout.screenPadding, flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
})
