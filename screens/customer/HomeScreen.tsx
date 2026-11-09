import { View, ActivityIndicator, StyleSheet, Pressable } from 'react-native'
import { useFetchCategories } from '../../hooks/useCategory'
import { HomeStackParamList } from '../../navigation/types'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGEmptyState, MGErrorState, MGScreen, MGText } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { ArrowRight, SearchIcon } from 'lucide-react-native'
import CategoryTile from '../../components/shared/CategoryTile'
import SectionHeader from '../../components/shared/SectionHeader'

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>

type Props = {
  navigation: HomeScreenNavigationProp
}

export default function HomeScreen({navigation}: Props) {
  const {data, isLoading, isError, refetch} = useFetchCategories()
  const { colors, spacing, radius } = useMGTheme()

  // CMP-05 / R4: faixa teal de cabeçalho (hub). A saudação já fica no AppHeader global acima, não é repetida aqui.
  const searchSlot = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar um serviço"
      onPress={() => navigation.navigate('TutorSearch')}
      style={({ pressed }) => [
        styles.search,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
          borderRadius: radius.md,
          paddingHorizontal: spacing.base,
          gap: spacing.md,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <SearchIcon color={colors.text.secondary} size={20} />
      <MGText variant="body" color="secondary">Buscar um serviço...</MGText>
    </Pressable>
  )

  return (
    <MGScreen scrollable header="teal" headerSlot={searchSlot} contentStyle={{ paddingTop: spacing.base }}>
      {/* CMP-04 / R2 / CMP-01: destaque rosa de 20 pt, eyebrow rosa-texto, título 22/28, ilustração em bloco. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explorar profissionais"
        onPress={() => navigation.navigate('TutorSearch')}
        style={({ pressed }) => [
          styles.hero,
          {
            backgroundColor: colors.surface.pinkSubtle,
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginTop: spacing.sm,
            marginBottom: spacing.lg,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={[styles.heroRow, { gap: spacing.md }]}>
          <View style={[styles.heroCopy, { gap: spacing.sm }]}>
            <MGText variant="eyebrow" color="brand">Atendimento em domicílio</MGText>
            {/* &nbsp; evita a linha com só "pet" (viúva); o texto e o check exato permanecem iguais. */}
            <MGText variant="heading2" style={styles.heroTitle}>Um cuidado especial para seu&nbsp;pet</MGText>
            <View style={[styles.heroAction, { gap: spacing.xs, marginTop: spacing.xs }]}>
              <MGText variant="label" color="brand">Explorar profissionais</MGText>
              <ArrowRight size={18} color={colors.action.primaryText} />
            </View>
          </View>
          <View style={[styles.artBlock, { backgroundColor: colors.surface.default, borderRadius: radius.lg, padding: spacing.sm }]}>
            <MGArtwork name="poodle" width={72} height={88} />
          </View>
        </View>
      </Pressable>

      <SectionHeader title="Categorias" variant="eyebrow" />
      {isLoading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator accessibilityLabel="Carregando categorias" color={colors.action.primary} />
          <MGText variant="bodySmall" color="secondary">Carregando categorias</MGText>
        </View>
      ) : isError ? (
        <MGErrorState
          message="Não foi possível carregar as categorias."
          onRetry={() => refetch()}
        />
      ) : (
        <View style={[styles.categories, { gap: spacing.md }]}>
          {data?.length ? data.map((item: { id: string, name: string }) => (
            <CategoryTile
              key={item.id}
              name={item.name}
              onPress={() => navigation.navigate('TutorSearch', { categoryId: item.id })}
            />
          )) : <MGEmptyState title="Nenhuma categoria" description="Os serviços disponíveis aparecerão aqui." />}
        </View>
      )}
    </MGScreen>
  )
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
  },
  hero: {
    flexDirection: 'column',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    lineHeight: 28,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  artBlock: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
