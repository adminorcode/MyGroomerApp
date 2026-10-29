import { View, Text, ActivityIndicator, FlatList, StyleSheet, Pressable } from 'react-native'
import { useFetchCategories } from '../../hooks/useCategory'
import { useTheme } from '../../context/ThemeContext'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import { SearchIcon } from 'lucide-react-native'
import CategoryTile from '../../components/shared/CategoryTile'
import SectionHeader from '../../components/shared/SectionHeader'
import ListCard from '../../components/shared/ListCard'
import { useState } from 'react'
import SegmentedTabs from '../../components/shared/SegmentedTabs'
import ScreenContainer from '../../components/shared/ScreenContainer'

const DUMMY_POPULAR = [
    { id: '1', name: 'Premium Car Wash', subtitle: 'From GHS 50 · ⭐ 4.8' },
    { id: '2', name: 'Deep Home Cleaning', subtitle: 'From GHS 120 · ⭐ 4.9' },
    { id: '3', name: 'Office Cleaning', subtitle: 'From GHS 200 · ⭐ 4.7' },
    { id: '4', name: 'Interior Detailing', subtitle: 'From GHS 80 · ⭐ 4.6' },
    { id: '5', name: 'Laundry Service', subtitle: 'From GHS 100 · ⭐ 4.5' },
    { id: '6', name: 'Gardening', subtitle: 'From GHS 150 · ⭐ 4.4' },
    { id: '7', name: 'Plumbing', subtitle: 'From GHS 200 · ⭐ 4.3' },
    { id: '8', name: 'Electrician', subtitle: 'From GHS 250 · ⭐ 4.2' },
    { id: '9', name: 'Painting', subtitle: 'From GHS 300 · ⭐ 4.1' },
    { id: '10', name: 'Carpentry', subtitle: 'From GHS 350 · ⭐ 4.0' },
]

const DUMMY_FEATURED = [
    { id: '2', name: 'Deep Home Cleaning', subtitle: 'From GHS 120 · ⭐ 4.9' },
    { id: '1', name: 'Premium Car Wash', subtitle: 'From GHS 50 · ⭐ 4.8' },
    { id: '6', name: 'Gardening', subtitle: 'From GHS 150 · ⭐ 4.4' },
    { id: '3', name: 'Office Cleaning', subtitle: 'From GHS 200 · ⭐ 4.7' },
    { id: '4', name: 'Interior Detailing', subtitle: 'From GHS 80 · ⭐ 4.6' },
    { id: '5', name: 'Laundry Service', subtitle: 'From GHS 100 · ⭐ 4.5' },
]

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>

type Props = {
  navigation: HomeScreenNavigationProp
}

export default function HomeScreen({navigation}: Props) {
  const {data, isLoading, error} = useFetchCategories()
  const {colors} = useTheme()
  const [activeTab, setActiveTab] = useState<'popular' | 'featured'>('popular')

  const listData = activeTab === 'popular' ? DUMMY_POPULAR : DUMMY_FEATURED

  if (isLoading) 
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{color: colors.error}}>Error: {error.message}</Text>
    </View>
  )

  return (
    <ScreenContainer>
        {/* Search bar */}
        <Pressable style={[styles.searchContainer, {backgroundColor: colors.selectionSoft, borderColor: colors.border, marginTop:spacing.md}]}>
        <SearchIcon color={colors.primary} size={20} />
        <Text style={[styles.searchText, {color: colors.textSecondary}]}>Search for a service...</Text>
        </Pressable>

        {/* categories */}
        <SectionHeader title="Categories"/>
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

        <View style={{paddingTop: spacing.lg}} />
        {/* popular service segmented tabs */}
        <SegmentedTabs tabs={['popular', 'featured']} onTabChange={(value)=>setActiveTab(value as 'popular' | 'featured')} activeTab={activeTab} />

        <FlatList
            data={listData}
            style={{flex:1}}
            renderItem={({item}) => (
                <ListCard
                title={item.name}
                subtitle={item.subtitle}
                // onPress={() => navigation.navigate('Services', {serviceId: item.id, serviceName: item.name})}
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
