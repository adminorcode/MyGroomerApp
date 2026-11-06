import { View, Text, ActivityIndicator, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useFetchCategories } from '../../hooks/useCategory'
import { useTheme } from '../../context/ThemeContext'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGEmptyState, MGErrorState, MGText } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { ArrowRight, SearchIcon } from 'lucide-react-native'
import CategoryTile from '../../components/shared/CategoryTile'
import SectionHeader from '../../components/shared/SectionHeader'
import ScreenContainer from '../../components/shared/ScreenContainer'

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>

type Props = {
  navigation: HomeScreenNavigationProp
}

export default function HomeScreen({navigation}: Props) {
  const {data, isLoading, isError, refetch} = useFetchCategories()
  const {colors} = useTheme()

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar um serviço"
            onPress={() => navigation.navigate('TutorSearch')}
            style={[styles.searchContainer, {backgroundColor: colors.selectionSoft, borderColor: colors.border, marginTop:spacing.md}]}
        >
        <SearchIcon color={colors.primary} size={20} />
        <Text style={[styles.searchText, {color: colors.text}]}>Buscar um serviço...</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explorar profissionais"
          onPress={() => navigation.navigate('TutorSearch')}
          style={({ pressed }) => [styles.hero, { backgroundColor: pressed ? colors.secondaryPressed : colors.secondary }]}
        >
          <MGText variant="heading3" color="inverse">Um cuidado especial para seu pet</MGText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={styles.heroCopy}>
            <MGText variant="bodySmall" color="inverse">Encontre atendimento em domicílio, em poucos passos.</MGText>
            <View style={styles.heroAction}>
              <MGText variant="label" color="inverse">Explorar profissionais</MGText>
              <ArrowRight size={18} color={colors.onSecondary} />
            </View>
          </View>
          <MGArtwork name="poodle" width={72} height={88} />
          </View>
        </Pressable>
        <SectionHeader title="Categorias"/>
        {isLoading ? (
            <ActivityIndicator accessibilityLabel="Carregando categorias" size="large" color={colors.primary} />
        ) : isError ? (
            <MGErrorState
                message="Não foi possível carregar as categorias."
                onRetry={() => refetch()}
            />
        ) : (
            <View style={styles.categories}>
              {data?.length ? data.map((item: { id: string, name: string }) => (
                    <CategoryTile
                        key={item.id}
                        name={item.name}
                        onPress={() => navigation.navigate('Services', {categoryId: item.id, categoryName: item.name})}
                    />
                )) : <MGEmptyState title="Nenhuma categoria" description="Os serviços disponíveis aparecerão aqui." />}
            </View>
        )}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: { gap: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.lg, marginTop: spacing.sm, marginBottom: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.md, minWidth: 0 },
  heroAction: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  searchText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
  },
  searchContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
})
