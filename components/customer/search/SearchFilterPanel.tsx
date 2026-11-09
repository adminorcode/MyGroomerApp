import { ReactNode, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Circle, Info } from 'lucide-react-native'
import { MGButton, MGErrorState, MGIcon, MGText, MGTextField } from '../../../design-system/components'
import { useMGTheme } from '../../../design-system/theme/useMGTheme'
import { spacing } from '../../../design-system/tokens'
import { useGetAllServices } from '../../../hooks/useServices'
import FilterSlider, { RangeFilterSlider } from './FilterSlider'
import { parseFilterPrice, SearchFilterValues, SearchPanel, SearchSort } from './searchFilters'

type Option = { id: string, name: string }
type Props = {
  panel: SearchPanel
  value: SearchFilterValues
  categories: Option[]
  categoriesLoading: boolean
  categoriesError: boolean
  onRetryCategories: () => void
  address?: string
  onApply: (value: SearchFilterValues) => void
  onCancel: () => void
}

const SORTS: { id: SearchSort, name: string, description: string }[] = [
  { id: 'relevance', name: 'Relevância', description: 'Usa a ordem padrão da busca.' },
  { id: 'price', name: 'Menor preço', description: 'Exibe primeiro os groomers com menor preço.' },
  { id: 'rating', name: 'Melhor avaliação', description: 'Exibe primeiro os groomers com as melhores notas.' },
  { id: 'distance', name: 'Mais próximos', description: 'Exibe primeiro os groomers mais perto do endereço informado.' },
  { id: 'today', name: 'Disponíveis hoje', description: 'Prioriza groomers com horários hoje, mantendo os demais na lista.' },
]

export default function SearchFilterPanel({ panel, value, categories, categoriesLoading, categoriesError, onRetryCategories, address, onApply, onCancel }: Props) {
  const theme = useMGTheme()
  const [draft, setDraft] = useState({ ...value })
  const [minimum, setMinimum] = useState(value.minPrice?.toLocaleString('pt-BR', { useGrouping: false }) ?? '')
  const [maximum, setMaximum] = useState(value.maxPrice?.toLocaleString('pt-BR', { useGrouping: false }) ?? '')
  const services = useGetAllServices(panel === 'filtros' ? draft.categoryId || undefined : undefined)
  const parsedMin = parseFilterPrice(minimum)
  const parsedMax = parseFilterPrice(maximum)
  const priceError = parsedMin === 'invalid' || parsedMax === 'invalid'
    ? 'Informe preços válidos, sem valores negativos, usando vírgula para centavos.'
    : parsedMin != null && parsedMax != null && parsedMin > parsedMax
      ? 'O preço mínimo não pode ser maior que o máximo.' : undefined
  const setPrice = (min: number | null, max: number | null) => {
    setMinimum(min?.toLocaleString('pt-BR', { useGrouping: false }) ?? '')
    setMaximum(max?.toLocaleString('pt-BR', { useGrouping: false }) ?? '')
  }
  const clear = () => {
    if (panel === 'preco') setPrice(null, null)
    if (panel === 'avaliacao') setDraft({ ...draft, minRating: null, onlyReviewed: false })
    if (panel === 'raio') setDraft({ ...draft, maxKm: null })
    if (panel === 'filtros') setDraft({ ...draft, categoryId: '', serviceId: '' })
  }
  const lower = typeof parsedMin === 'number' ? Math.min(parsedMin, 300) : 0
  const upper = typeof parsedMax === 'number' ? Math.min(parsedMax, 300) : 300
  const priceSelected = (min: number | null, max: number | null) => parsedMin === min && parsedMax === max
  const prices: [string, number | null, number | null][] = [['Qualquer preço', null, null], ['até R$ 80', null, 80], ['R$ 80–120', 80, 120], ['R$ 120+', 120, null]]
  const ratings: [string, number | null][] = [['Qualquer avaliação', null], ['4,0+', 4], ['4,5+', 4.5], ['5,0', 5]]
  const radii: [string, number | null][] = [['Até 2 km', 2], ['Até 5 km', 5], ['Até 10 km', 10], ['Sem limite', null]]
  const titles: Record<SearchPanel, string> = { filtros: 'Filtrar resultados', ordenar: 'Ordenar resultados', preco: 'Faixa de preço', avaliacao: 'Avaliação dos profissionais', raio: 'Distância do atendimento' }
  const apply = () => {
    if (panel === 'preco' && (priceError || parsedMin === 'invalid' || parsedMax === 'invalid')) return
    onApply({ ...draft, minPrice: typeof parsedMin === 'number' ? parsedMin : null, maxPrice: typeof parsedMax === 'number' ? parsedMax : null })
  }

  return (
    <View accessibilityLabel={titles[panel]} style={[styles.panel, theme.elevation.low, { backgroundColor: theme.colors.surface.default, borderRadius: theme.radius.lg, borderColor: theme.colors.border.default }]}>
      <MGText variant="heading3" accessibilityRole="header">{titles[panel]}</MGText>
      {panel === 'ordenar' ? <>
        <MGText variant="bodySmall" color="secondary">Escolha como exibir os groomers na lista.</MGText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Ordenar resultados" style={styles.stack}>
          {SORTS.map(option => <RadioRow key={option.id} label={option.name} description={option.description} selected={draft.sortKey === option.id} onPress={() => setDraft({ ...draft, sortKey: option.id })} />)}
        </View>
        <Hint>A ordenação apenas muda a ordem da lista, não altera os profissionais disponíveis.</Hint>
      </> : null}
      {panel === 'preco' ? <>
        <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Faixas de preço">
          {prices.map(([label, min, max]) => <Choice key={label} label={label} selected={priceSelected(min, max)} onPress={() => setPrice(min, max)} />)}
        </View>
        <RangeFilterSlider label="Preço" lowerValue={lower} upperValue={Math.max(lower, upper)} minimumValue={0} maximumValue={300} step={5}
          onLowerValueChange={number => setMinimum(number === 0 ? '' : String(number))}
          onUpperValueChange={number => setMaximum(number === 300 ? '' : String(number))} />
        <View style={styles.between}><MGText variant="caption" color="secondary">R$ 0</MGText><MGText variant="caption" color="secondary">R$ 300+</MGText></View>
        <View style={styles.fields}>
          <View style={styles.flex}><MGTextField compact label="Mín." accessibilityLabel="Preço mínimo" placeholder="Sem mínimo" keyboardType="decimal-pad" value={minimum} onChangeText={setMinimum} maxLength={15} style={styles.field} /></View>
          <View style={styles.flex}><MGTextField compact label="Máx." accessibilityLabel="Preço máximo" placeholder="Sem máximo" keyboardType="decimal-pad" value={maximum} onChangeText={setMaximum} maxLength={15} style={styles.field} /></View>
        </View>
        {priceError ? <MGText variant="bodySmall" color="error" accessibilityRole="alert">{priceError}</MGText> : null}
        <Hint>Escolha uma faixa de preço para encontrar serviços compatíveis.</Hint>
      </> : null}
      {panel === 'avaliacao' ? <>
        <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Nota mínima">
          {ratings.map(([label, rating]) => <Choice key={label} label={label} selected={draft.minRating === rating} onPress={() => setDraft({ ...draft, minRating: rating })} />)}
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Avaliação em estrelas">
          {[4, 5].map(rating => <RadioRow key={rating} label={rating === 4 ? '4 estrelas ou mais' : '5 estrelas'} selected={draft.minRating === rating} onPress={() => setDraft({ ...draft, minRating: rating })}
            leading={<View style={styles.stars}>{[1, 2, 3, 4, 5].map(star => <MGIcon key={star} name="star" size={16} color={star <= rating ? theme.colors.action.primaryText : theme.colors.border.strong} fill={star <= rating ? theme.colors.action.primaryText : 'none'} />)}</View>} />)}
        </View>
        <Pressable accessibilityRole="switch" accessibilityLabel="Somente profissionais com avaliações" accessibilityState={{ checked: draft.onlyReviewed }} aria-checked={draft.onlyReviewed} onPress={() => setDraft({ ...draft, onlyReviewed: !draft.onlyReviewed })} style={({ pressed }) => [styles.switchRow, { borderColor: theme.colors.border.default, backgroundColor: pressed ? theme.colors.surface.pinkSubtle : theme.colors.surface.default }]}>
          <MGText variant="label" style={styles.flex}>Somente profissionais com avaliações</MGText>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={{ width: 48, height: 28, padding: theme.spacing.xxs, borderRadius: theme.radius.pill, backgroundColor: draft.onlyReviewed ? theme.colors.action.primary : theme.colors.border.strong, alignItems: draft.onlyReviewed ? 'flex-end' : 'flex-start', justifyContent: 'center' }}><View style={{ width: 24, height: 24, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.default }} /></View>
        </Pressable>
        <Hint>Filtre os groomers pela avaliação recebida de outros tutores.</Hint>
      </> : null}
      {panel === 'raio' ? <>
        <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Limite de distância">
          {radii.map(([label, km]) => <Choice key={label} label={label} selected={draft.maxKm === km} onPress={() => setDraft({ ...draft, maxKm: km })} />)}
        </View>
        <FilterSlider label="Raio em quilômetros" value={draft.maxKm ?? 20} minimumValue={0} maximumValue={20} step={1} onValueChange={maxKm => setDraft({ ...draft, maxKm })} />
        <View style={styles.between}>{[0, 20].map(km => <MGText key={km} variant="caption" color="secondary">{km} km</MGText>)}</View>
        <View style={[styles.radiusSummary, { backgroundColor: theme.colors.surface.canvas, borderColor: theme.colors.border.default, borderRadius: theme.radius.md }]}><MGIcon name="map-pin" size={20} /><MGText variant="bodySmall">Raio selecionado: <MGText variant="label">{draft.maxKm == null ? 'Sem limite' : `${draft.maxKm} km`}</MGText></MGText></View>
        <Hint>Distância até o endereço do atendimento{address ? ` (${address})` : ''}. O groomer precisa atender esse endereço dentro do próprio raio.</Hint>
      </> : null}
      {panel === 'filtros' ? <>
        <MGText variant="label" color="teal">Modalidade</MGText>
        <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Modalidade">
          {categories.map(option => <Choice key={option.id} label={option.name} selected={draft.categoryId === option.id} onPress={() => setDraft({ ...draft, categoryId: draft.categoryId === option.id ? '' : option.id, serviceId: '' })} />)}
        </View>
        <MGText variant="label" color="teal">Serviço</MGText>
        <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Serviço">
          {((services.data ?? []) as Option[]).map(option => <Choice key={option.id} label={option.name} selected={draft.serviceId === option.id} onPress={() => setDraft({ ...draft, serviceId: draft.serviceId === option.id ? '' : option.id })} />)}
        </View>
        {categoriesLoading || services.isLoading ? <MGText variant="bodySmall" color="secondary">Carregando filtros…</MGText> : null}
        {categoriesError || services.isError ? <MGErrorState message="Não foi possível carregar os filtros." onRetry={() => { onRetryCategories(); void services.refetch() }} /> : null}
      </> : null}
      <View style={[styles.actions, { borderTopColor: theme.colors.border.default }]}>
        <MGButton label={panel === 'ordenar' ? 'Cancelar' : 'Limpar'} variant="secondary" fullWidth={false} style={styles.action} onPress={panel === 'ordenar' ? onCancel : clear} />
        <MGButton label="Aplicar" fullWidth={false} style={styles.action} disabled={panel === 'preco' && Boolean(priceError)} onPress={apply} />
      </View>
      {panel !== 'ordenar' ? <MGButton label="Cancelar" variant="tertiary" style={{ minHeight: 48 }} onPress={onCancel} /> : null}
    </View>
  )
}

function Hint({ children }: { children: ReactNode }) {
  const { colors } = useMGTheme()
  return <View style={styles.hint}><Info size={18} color={colors.text.secondary} /><MGText variant="bodySmall" color="secondary" style={styles.flex}>{children}</MGText></View>
}

function Choice({ label, selected, onPress }: { label: string, selected: boolean, onPress: () => void }) {
  const { colors, radius } = useMGTheme()
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, selected }} aria-checked={selected} accessibilityLabel={selected ? `${label}, selecionado` : label} onPress={onPress}
    style={({ pressed }) => [styles.choice, { borderRadius: radius.pill, borderColor: colors.action.primaryOutline, backgroundColor: selected ? pressed ? colors.action.primaryPressed : colors.action.primary : pressed ? colors.surface.pinkSubtle : colors.surface.default }]}>
    {selected ? <MGIcon name="check" size={14} color={colors.onAction.primary} /> : null}
    <MGText variant="label" style={{ color: selected ? colors.onAction.primary : colors.text.primary, flexShrink: 1 }}>{label}</MGText>
  </Pressable>
}

function RadioRow({ label, description, selected, onPress, leading }: { label: string, description?: string, selected: boolean, onPress: () => void, leading?: ReactNode }) {
  const { colors, radius } = useMGTheme()
  return <Pressable accessibilityRole="radio" accessibilityLabel={selected ? `${label}, selecionado` : label} accessibilityHint={description} accessibilityState={{ selected, checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [styles.radio, { borderRadius: radius.md, backgroundColor: selected || pressed ? colors.surface.pinkSubtle : colors.surface.default }]}>
    <View style={[styles.circle, { borderColor: selected ? colors.action.primaryText : colors.border.strong }]}>{selected ? <Circle size={12} color={colors.action.primaryText} fill={colors.action.primaryText} /> : null}</View>
    <View style={styles.flex}>{leading}<MGText variant="label">{label}</MGText>{description ? <MGText variant="bodySmall">{description}</MGText> : null}</View>
  </Pressable>
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, padding: spacing.md, gap: spacing.md, marginBottom: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, flexShrink: 1 },
  fields: { flexDirection: 'row', gap: spacing.md },
  field: { minHeight: 48 },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stack: { gap: spacing.xs },
  radio: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, minHeight: 48 },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', gap: spacing.xxs, paddingBottom: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1 },
  radiusSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.md },
  action: { flex: 1, minHeight: 48 },
})
