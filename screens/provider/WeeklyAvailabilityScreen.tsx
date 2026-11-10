import { useEffect, useRef, useState } from 'react'
import ProviderSetupIntro from './ProviderSetupIntro'
import { Pressable, ScrollView, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { MGButton, MGEnter, MGIcon, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { WeeklyAvailabilityEditor, WeekdayKey } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { motion } from '../../design-system/tokens'
import {
  useAddManualAppointment,
  useGetWeeklyAvailability,
  useSaveWeeklyAvailability,
} from '../../hooks/useProviders'
import { ProviderServicesStackParamList } from '../../navigation/types'
import { getErrorMessage } from '../../utils/error'
import AvailabilityStepper from './AvailabilityStepper'
import {
  TravelGap,
  WeeklyDraft,
  WEEKDAY_KEYS,
  dayIssues,
  draftFromRoutine,
  routinePayload,
  sameRoutine,
  upcomingMonday,
} from './weeklyAvailabilityModel'

const GAPS: TravelGap[] = [15, 30, 45, 60, 75, 90, 105, 120]

// Data exibida e digitada em DD/MM/AAAA; a API recebe AAAA-MM-DD (conversão só na borda).
const isoToBrDate = (iso: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}

const maskBrDate = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const brDateToIso = (text: string): string | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const valid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
  return valid ? `${year}-${month}-${day}` : null
}

type Props = {
  navigation: StackNavigationProp<ProviderServicesStackParamList, 'WeeklyAvailability'>
  route: RouteProp<ProviderServicesStackParamList, 'WeeklyAvailability'>
}

export default function WeeklyAvailabilityScreen({ navigation, route }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const fromProfile = route.params?.origin === 'profile'
  const routine = useGetWeeklyAvailability()
  const save = useSaveWeeklyAvailability()
  const include = useAddManualAppointment()
  const [draft, setDraft] = useState<WeeklyDraft | null>(null)
  const [saved, setSaved] = useState<WeeklyDraft | null>(null)
  const [focus, setFocus] = useState<WeekdayKey>('mon')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const [includeDate, setIncludeDate] = useState(() => isoToBrDate(upcomingMonday()))
  const [includeStart, setIncludeStart] = useState('14:00')
  const [includeEnd, setIncludeEnd] = useState('14:30')
  const [includeError, setIncludeError] = useState<string | null>(null)
  const [includeNotice, setIncludeNotice] = useState(false)
  const [reveal, setReveal] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const dayRef = useRef<View>(null)
  const gapRef = useRef<View>(null)

  useEffect(() => {
    if (routine.data && !draft) {
      const next = draftFromRoutine(routine.data)
      setDraft(next)
      setSaved(next)
    }
  }, [routine.data, draft])

  const waiting = routine.isLoading || (routine.isFetching && !routine.data)
  const persisted = draft && saved ? sameRoutine(draft, saved) : false
  const canInclude = !!saved?.manualFit && persisted && !!brDateToIso(includeDate) && !!includeStart.trim() && !!includeEnd.trim()

  const publish = async () => {
    if (!draft || save.isPending) return
    const issues = dayIssues(draft)
    const firstDay = WEEKDAY_KEYS.find((key) => issues[key])
    if (firstDay) {
      setReveal(true)
      setSavedNotice(false)
      setFocus(firstDay)
      scrollWhenReady('availability-day-card')
      return
    }
    if (draft.travelGap == null) {
      setReveal(true)
      setSavedNotice(false)
      scrollWhenReady('availability-gap-error')
      return
    }
    setSaveError(null)
    setSavedNotice(false)
    try {
      const result = await save.mutateAsync(routinePayload(draft))
      const next = draftFromRoutine(result.data)
      setDraft(next)
      setSaved(next)
      if (fromProfile) {
        navigation.goBack()
        return
      }
      setSavedNotice(true)
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  const addAppointment = async () => {
    const isoDate = brDateToIso(includeDate)
    if (!canInclude || !isoDate) return
    setIncludeError(null)
    setIncludeNotice(false)
    try {
      await include.mutateAsync({
        starts_at: new Date(`${isoDate}T${includeStart}:00-03:00`).toISOString(),
        ends_at: new Date(`${isoDate}T${includeEnd}:00-03:00`).toISOString(),
      })
      setIncludeNotice(true)
    } catch (error) {
      setIncludeError(getErrorMessage(error))
    }
  }

  return (
    <MGScreen
      safeArea={false}
      scrollable
      loading={waiting}
      error={!waiting && routine.isError ? getErrorMessage(routine.error) : null}
      onRetry={() => { void routine.refetch() }}
      scrollRef={scrollRef}
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <MGButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
          <View style={{ flex: 1 }}>
            <MGButton
              label={fromProfile ? 'Salvar' : 'Ir para revisão'}
              iconRight={fromProfile ? undefined : <MGIcon name="chevron-right" size={18} color={colors.onAction.primary} />}
              onPress={() => { void publish() }}
              disabled={save.isPending || !draft}
              loading={save.isPending}
            />
          </View>
        </View>
      )}
    >
      {draft ? (
        <View style={{ gap: spacing.lg, paddingTop: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          {fromProfile ? null : <AvailabilityStepper />}
          <ProviderSetupIntro
            title={fromProfile ? 'Horários de atendimento' : 'Disponibilidade'}
            description="Organize sua rotina. Defina dias de trabalho, horários e intervalos para controlar sua disponibilidade."
          />
          <WeeklyAvailabilityEditor
            value={draft.days}
            issues={reveal ? dayIssues(draft) : undefined}
            focus={focus}
            onFocus={setFocus}
            anchorRef={dayRef}
            onChange={(days) => {
              setSavedNotice(false)
              setDraft({ ...draft, days })
            }}
          />
          <View style={{ gap: spacing.sm, backgroundColor: colors.surface.default, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, padding: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MGIcon name="clock-3" size={20} color={colors.action.secondary} />
              <MGText variant="heading3">Tempo entre atendimentos</MGText>
            </View>
            <MGText variant="bodySmall" color="secondary">
              Escolha o tempo de intervalo entre um atendimento e outro.
            </MGText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {GAPS.map((gap) => {
                const selected = draft.travelGap === gap
                return (
                  <Pressable
                    key={gap}
                    accessibilityRole="button"
                    accessibilityLabel={selected ? `${gap} minutos, selecionado` : `${gap} minutos`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSavedNotice(false)
                      setDraft({ ...draft, travelGap: gap })
                    }}
                    style={{
                      flexGrow: 1,
                      flexBasis: '22%',
                      minHeight: 48,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.action.primary : colors.border.default,
                      backgroundColor: selected ? colors.action.primary : colors.surface.default,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: spacing.xs,
                    }}
                  >
                    {selected ? <MGIcon name="check" size={16} color={colors.onAction.primary} /> : null}
                    <MGText variant="label" color={selected ? 'inverse' : 'primary'}>{gap} min</MGText>
                  </Pressable>
                )
              })}
            </View>
            {draft.travelGap ? (
              <MGText variant="bodySmall" color="secondary">
                {`Entre atendimentos: ${draft.travelGap} minutos.`}
              </MGText>
            ) : reveal ? (
              <View ref={gapRef} nativeID="availability-gap-error" collapsable={false}>
                <MGText variant="bodySmall" color="error" accessibilityRole="alert">
                  Escolha de 15 em 15 minutos, até 2 horas.
                </MGText>
              </View>
            ) : (
              <MGText variant="bodySmall" color="secondary">De 15 em 15 minutos, até 2 horas.</MGText>
            )}
          </View>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, gap: spacing.sm }}>
            {/* Revisão UI (027): título em uma linha; o interruptor vai para a linha própria, sem palavra órfã. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MGIcon name="calendar-days" size={20} color={colors.action.secondary} />
              <MGText variant="label" style={{ flex: 1 }}>Encaixes / fora da rotina</MGText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <MGText variant="caption">Permitir encaixe manual</MGText>
              <TrackSwitch
                on={draft.manualFit}
                label="Encaixe manual"
                tone="primary"
                onPress={() => {
                  setSavedNotice(false)
                  setIncludeNotice(false)
                  setDraft({ ...draft, manualFit: !draft.manualFit })
                }}
              />
            </View>
            <MGText variant="bodySmall" color="secondary">
              Atendimentos fora da sua rotina podem ser adicionados manualmente.
            </MGText>
            {!draft.manualFit ? (
              <MGText variant="bodySmall" color="error" accessibilityRole="alert">
                Encaixe manual desligado. Horário fora da rotina não entra.
              </MGText>
            ) : !persisted ? (
              <MGText variant="bodySmall" color="secondary">
                Salve a rotina antes de incluir um atendimento.
              </MGText>
            ) : null}
            {draft.manualFit ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <View style={{ flex: 1.4 }}>
                  <MGTextField
                    compact
                    label="Data do encaixe"
                    value={includeDate}
                    onChangeText={(text) => setIncludeDate(maskBrDate(text))}
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    style={{ fontSize: 13 }}
                    trailing={<MGIcon name="calendar-days" size={14} color={colors.text.secondary} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MGTextField
                    compact
                    label="Início"
                    accessibilityLabel="Início do encaixe"
                    value={includeStart}
                    onChangeText={setIncludeStart}
                    autoCapitalize="none"
                    maxLength={5}
                    placeholder="14:00"
                    style={{ fontSize: 13 }}
                    trailing={<MGIcon name="clock-3" size={14} color={colors.text.secondary} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MGTextField
                    compact
                    label="Fim"
                    accessibilityLabel="Fim do encaixe"
                    value={includeEnd}
                    onChangeText={setIncludeEnd}
                    autoCapitalize="none"
                    maxLength={5}
                    placeholder="14:30"
                    style={{ fontSize: 13 }}
                    trailing={<MGIcon name="clock-3" size={14} color={colors.text.secondary} />}
                  />
                </View>
              </View>
            ) : null}
              <MGButton
              label="Incluir atendimento"
              iconLeft={<MGIcon name="plus" size={18} color={colors.onAction.primary} />}
              disabled={!canInclude || include.isPending}
              loading={include.isPending}
              onPress={() => { void addAppointment() }}
            />
            {includeError ? (
              <MGText variant="bodySmall" color="error" accessibilityRole="alert">{includeError}</MGText>
            ) : null}
            {includeNotice ? (
              <MGEnter duration={motion.success}>
                <MGText variant="bodySmall" color="success" accessibilityRole="alert">Atendimento incluído.</MGText>
              </MGEnter>
            ) : null}
          </View>
          {saveError ? (
            <MGText variant="bodySmall" color="error" accessibilityRole="alert">{saveError}</MGText>
          ) : null}
          {savedNotice ? (
            <MGEnter duration={motion.success}>
              <MGText variant="bodySmall" color="success" accessibilityRole="alert">Rotina salva.</MGText>
            </MGEnter>
          ) : null}
        </View>
      ) : null}
    </MGScreen>
  )
}

function scrollWhenReady(id: string, attempts = 12) {
  if (typeof document === 'undefined') return
  const element = document.getElementById(id)
  if (!element) {
    if (attempts > 0) window.setTimeout(() => scrollWhenReady(id, attempts - 1), 50)
    return
  }
  element.style.scrollMarginTop = '16px'
  element.style.scrollMarginBottom = '160px'
  element.scrollIntoView({ behavior: 'smooth', block: 'end' })
}

function TrackSwitch({ on, label, tone, onPress }: { on: boolean; label: string; tone: 'primary' | 'secondary'; onPress: () => void }) {
  const { colors, radius } = useMGTheme()
  const track = on ? (tone === 'secondary' ? colors.action.secondary : colors.action.primary) : colors.border.default
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={{ width: 48, height: 28, borderRadius: radius.pill, backgroundColor: track, justifyContent: 'center' }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface.default, marginLeft: on ? 22 : 2 }} />
    </Pressable>
  )
}
