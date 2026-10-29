import { View, Text, ActivityIndicator, FlatList, StyleSheet } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { HomeStackParamList } from '../../navigation/types'
import { useGetServiceProviders } from '../../hooks/useProviders'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import ListCard from '../../components/shared/ListCard'
import { fonts, spacing, typography } from '../../constants/theme'
import { formatMoney } from '../../utils/formatMoney'

type ServiceProviderScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'ServiceProviders'>
type ServiceProviderScreenRouteProp = RouteProp<HomeStackParamList, 'ServiceProviders'>

type Props = {
  navigation: ServiceProviderScreenNavigationProp
  route: ServiceProviderScreenRouteProp
}

export default function ServiceProvidersScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const { serviceId, serviceName } = route.params
  const { data, isLoading, isError } = useGetServiceProviders(serviceId)

  return (
    <ScreenContainer>
      <ScreenHeader
        title={serviceName}
        description="Escolha um groomer para agendar"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.error }]}>
            Não foi possível carregar os groomers.
          </Text>
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
              subtitle={[
                item.price != null ? `A partir de ${formatMoney(item.price)}` : null,
                item.service_area,
              ].filter(Boolean).join(' · ')}
              onPress={() => navigation.navigate('BookService', {
                providerServiceId: item.id,
              })}
              showChevron={true}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Nenhum groomer disponível para este serviço ainda
              </Text>
            </View>
          }
          keyExtractor={(item) => item.id}
        />
      )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  message: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
})
