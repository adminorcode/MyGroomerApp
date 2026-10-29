import { View, ActivityIndicator, FlatList, StyleSheet } from 'react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useGetAllServices } from '../../hooks/useServices'
import { useTheme } from '../../context/ThemeContext'
import ListCard from '../../components/shared/ListCard'
import { MGEmptyState, MGErrorState } from '../../design-system/components'
import { spacing } from '../../constants/theme'


type ServiceScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Services'>
type ServiceScreenRouteProp = RouteProp<HomeStackParamList, 'Services'>

type Props = {
  navigation: ServiceScreenNavigationProp
  route: ServiceScreenRouteProp
}

export default function ServiceScreen({navigation, route}: Props) {
  const {colors} = useTheme()
  const {categoryId, categoryName} = route.params
  const {data, isLoading, isError} = useGetAllServices(categoryId)

  return (
    <ScreenContainer>
      <ScreenHeader
        title={categoryName}
        description="Escolha um serviço para ver os groomers"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar os serviços." />
        </View>
      ) : (
        <FlatList
          data={data}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ListCard
              title={item.name}
              accessibilityLabel={item.name}
              subtitle={item.description}
              onPress={() => navigation.navigate('TutorSearch', {
                serviceId: item.id,
                categoryId,
              })}
              showChevron={true}
            />
          )}
          ListEmptyComponent={
            <MGEmptyState
              title="Nenhum serviço"
              description="Nenhum serviço nesta categoria ainda"
            />
          }
          keyExtractor={(item) => item.id}
        />
      )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 1
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
})
