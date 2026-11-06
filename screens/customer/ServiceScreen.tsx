import { View, ActivityIndicator, FlatList, StyleSheet, Pressable } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useGetAllServices } from '../../hooks/useServices'
import { useTheme } from '../../context/ThemeContext'
import { MGEmptyState, MGErrorState, MGIcon, MGText } from '../../design-system/components'
import { borderRadius, spacing } from '../../constants/theme'
import { useMGTheme } from '../../design-system/theme/useMGTheme'


type ServiceScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Services'>
type ServiceScreenRouteProp = RouteProp<HomeStackParamList, 'Services'>

type Props = {
  navigation: ServiceScreenNavigationProp
  route: ServiceScreenRouteProp
}

export default function ServiceScreen({navigation, route}: Props) {
  const {colors} = useTheme()
  const { elevation } = useMGTheme()
  const {categoryId, categoryName} = route.params
  const {data, isLoading, isError, refetch} = useGetAllServices(categoryId)

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
          <ActivityIndicator accessibilityLabel="Carregando serviços" size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar os serviços." onRetry={() => { void refetch() }} />
        </View>
      ) : (
        <FlatList
          data={data}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const bath = /banho/i.test(item.name)
            const groom = /tosa/i.test(item.name)
            const icon = bath ? 'bath' : groom ? 'scissors' : 'sparkles'
            return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => navigation.navigate('TutorSearch', {
                serviceId: item.id,
                categoryId,
              })}
              style={({ pressed }) => [styles.service, elevation.low, { backgroundColor: pressed ? colors.pressedSurface : colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.icon, { backgroundColor: bath ? colors.infoSoft : colors.selectionSoft }]}>
                <MGIcon name={icon} size={28} color={bath ? colors.secondary : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <MGText variant="heading3">{item.name}</MGText>
                {item.description ? <MGText variant="bodySmall" color="secondary">{item.description}</MGText> : null}
              </View>
              <ChevronRight size={20} color={colors.primary} />
            </Pressable>
          )}}
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
  service: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 88 },
  icon: { width: 56, height: 56, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
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
