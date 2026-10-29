import { View, Text, ActivityIndicator, FlatList, StyleSheet, Pressable } from 'react-native'
import { useFetchCategories } from '../../hooks/useCategory'
import { useTheme } from '../../context/ThemeContext'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { SearchIcon } from 'lucide-react-native'
import CategoryTile from '../../components/shared/CategoryTile'
import SectionHeader from '../../components/shared/SectionHeader'
import ScreenContainer from '../../components/shared/ScreenContainer'

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>

type Props = {
  navigation: HomeScreenNavigationProp
}

export default function HomeScreen({navigation}: Props) {
  const {data, isLoading, error} = useFetchCategories()
  const {colors} = useTheme()

  if (isLoading) 
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{color: colors.error}}>Não foi possível carregar as categorias.</Text>
    </View>
  )

  return (
    <ScreenContainer>
        {/* Search bar */}
        <Pressable style={[styles.searchContainer, {backgroundColor: colors.selectionSoft, borderColor: colors.border, marginTop:spacing.md}]}>
        <SearchIcon color={colors.primary} size={20} />
        <Text style={[styles.searchText, {color: colors.textSecondary}]}>Buscar um serviço...</Text>
        </Pressable>

        {/* categories */}
        <SectionHeader title="Categorias"/>
        <FlatList
            data={data}
            horizontal
            style={{flexGrow:0}}
            contentContainerStyle={{ gap: spacing.md, height:'auto' }}
            showsHorizontalScrollIndicator={false}
            renderItem={({item}) =>(
                <CategoryTile
                    name={item.name}
                    onPress={() => navigation.navigate('Services', {categoryId: item.id, categoryName: item.name})}
                />
            )}
            keyExtractor={(item) => item.id}
        />

    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  }
})
