import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import {
  DraftOffer,
  DraftState,
  emptyCustom,
  MenuSuggestion,
  ServiceMenu,
  toDraftState,
} from './serviceMenuModel'

type DraftContextValue = {
  state: DraftState | null
  load: (menu: ServiceMenu) => void
  refreshTypes: (types: ServiceMenu['types']) => void
  updateOffer: (key: string, patch: Partial<DraftOffer>) => void
  toggleOffer: (key: string) => void
  removeOffer: (key: string) => void
  includeSuggestion: (suggestion: MenuSuggestion) => string
  addCustom: () => string
}

const DraftContext = createContext<DraftContextValue | null>(null)

export function ServiceMenuDraftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DraftState | null>(null)

  const load = useCallback((menu: ServiceMenu) => {
    setState(toDraftState(menu))
  }, [])

  const refreshTypes = useCallback((types: ServiceMenu['types']) => {
    setState(current => current ? { ...current, types } : current)
  }, [])

  const updateOffer = useCallback((key: string, patch: Partial<DraftOffer>) => {
    setState(current => current && ({
      ...current,
      offers: current.offers.map(offer => offer.key === key ? { ...offer, ...patch } : offer),
    }))
  }, [])

  const toggleOffer = useCallback((key: string) => {
    setState(current => current && ({
      ...current,
      offers: current.offers.map(offer => offer.key === key ? { ...offer, is_active: !offer.is_active } : offer),
    }))
  }, [])

  const removeOffer = useCallback((key: string) => {
    setState(current => {
      if (!current) return current
      const offer = current.offers.find(item => item.key === key)
      if (!offer || offer.id) return current
      return {
        ...current,
        offers: current.offers.filter(item => item.key !== key),
        suggestions: offer.suggestion
          ? [...current.suggestions, offer.suggestion]
          : current.suggestions,
      }
    })
  }, [])

  const includeSuggestion = useCallback((suggestion: MenuSuggestion) => {
    const key = `new-${suggestion.service_id}`
    setState(current => {
      if (!current) return current
      if (current.offers.some(offer => offer.service_id === suggestion.service_id)) return current
      const type = current.types.length === 1 ? current.types[0] : null
      return {
        ...current,
        suggestions: current.suggestions.filter(item => item.service_id !== suggestion.service_id),
        offers: [...current.offers, {
          key,
          service_id: suggestion.service_id,
          custom_name: '',
          category_id: suggestion.category_id,
          name: suggestion.name,
          description: suggestion.description ?? '',
          is_active: true,
          professional_type_id: type?.id ?? null,
          professionalTypeName: type?.name ?? null,
          prices: { small: '', medium: '', large: '' },
          durations: { small: '', medium: '', large: '' },
          suggestion,
        }],
      }
    })
    return key
  }, [])

  const addCustom = useCallback(() => {
    const key = `new-${Date.now()}`
    setState(current => {
      if (!current) return current
      const categoryId = current.categories.length === 1 ? current.categories[0].id : null
      const type = current.types.length === 1 ? current.types[0] : null
      return {
        ...current,
        offers: [...current.offers, emptyCustom(key, categoryId, type?.id ?? null, type?.name ?? null)],
      }
    })
    return key
  }, [])

  const value = useMemo(() => ({
    state,
    load,
    refreshTypes,
    updateOffer,
    toggleOffer,
    removeOffer,
    includeSuggestion,
    addCustom,
  }), [state, load, refreshTypes, updateOffer, toggleOffer, removeOffer, includeSuggestion, addCustom])

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

export function useServiceMenuDraft() {
  const value = useContext(DraftContext)
  if (!value) throw new Error('O cardápio precisa estar dentro do assistente')
  return value
}
