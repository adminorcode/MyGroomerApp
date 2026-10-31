import { Ref, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import MGChip from '../components/MGChip'
import MGIcon from '../components/MGIcon'
import MGText from '../components/MGText'
import MGTextField from '../components/MGTextField'
import { useMGTheme } from '../theme/useMGTheme'

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type DayAvailability = {
  enabled: boolean
  start?: string
  end?: string
  breakStart?: string
  breakEnd?: string
}

const DAYS: { key: WeekdayKey; label: string; name: string; title: string }[] = [
  { key: 'mon', label: 'Seg', name: 'segunda-feira', title: 'Segunda-feira' },
  { key: 'tue', label: 'Ter', name: 'terça-feira', title: 'Terça-feira' },
  { key: 'wed', label: 'Qua', name: 'quarta-feira', title: 'Quarta-feira' },
  { key: 'thu', label: 'Qui', name: 'quinta-feira', title: 'Quinta-feira' },
  { key: 'fri', label: 'Sex', name: 'sexta-feira', title: 'Sexta-feira' },
  { key: 'sat', label: 'Sáb', name: 'sábado', title: 'Sábado' },
  { key: 'sun', label: 'Dom', name: 'domingo', title: 'Domingo' },
]

type Props = {
  value: Record<WeekdayKey, DayAvailability>
  onChange: (next: Record<WeekdayKey, DayAvailability>) => void
  issues?: Partial<Record<WeekdayKey, string>>
  focus: WeekdayKey
  onFocus: (key: WeekdayKey) => void
  anchorRef?: Ref<View>
}

export default function WeeklyAvailabilityEditor({ value, onChange, issues, focus, onFocus, anchorRef }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const [menuKey, setMenuKey] = useState<WeekdayKey | null>(null)
  const [applied, setApplied] = useState(false)
  const day = DAYS.find((item) => item.key === focus) ?? DAYS[0]
  const current = value[day.key]
  const issue = issues?.[day.key]
  const breakIssue = !!issue && issue.includes('intervalo')
  const others = DAYS.filter((item) => item.key !== day.key && value[item.key]?.enabled)
  const focusIndex = DAYS.findIndex((item) => item.key === day.key)

  const update = (key: WeekdayKey, patch: Partial<DayAvailability>) => {
    setApplied(false)
    onChange({ ...value, [key]: { ...value[key], ...patch } })
  }

  const toggle = (key: WeekdayKey) => {
    const currentDay = value[key]
    update(key, {
      enabled: !currentDay.enabled,
      start: currentDay.start || '09:00',
      end: currentDay.end || '18:00',
      breakStart: currentDay.breakStart ?? '',
      breakEnd: currentDay.breakEnd ?? '',
    })
  }

  const shift = (direction: -1 | 1) => {
    const next = DAYS[(focusIndex + direction + DAYS.length) % DAYS.length]
    onFocus(next.key)
    setMenuKey(null)
  }

  const applyToActive = () => {
    const source = value[day.key]
    const next = { ...value }
    for (const item of DAYS) {
      if (item.key === day.key || !value[item.key]?.enabled) continue
      next[item.key] = {
        ...value[item.key],
        start: source.start,
        end: source.end,
        breakStart: source.breakStart,
        breakEnd: source.breakEnd,
      }
    }
    setApplied(true)
    onChange(next)
  }

  const clock = () => <MGIcon name="clock-3" size={16} color={colors.text.secondary} />

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={[styles.sectionHead, { gap: spacing.sm }]}>
        <View style={[styles.sectionTitle, { gap: spacing.sm }]}>
          <MGIcon name="calendar-days" size={20} color={colors.action.primary} />
          <MGText variant="heading3">Dias de trabalho</MGText>
        </View>
        <MGText variant="caption" color="secondary" style={styles.sectionHint}>
          Selecione os dias que você atende.
        </MGText>
      </View>
      <View style={[styles.days, { gap: spacing.xs }]}>
        {DAYS.map((item) => {
          const enabled = !!value[item.key]?.enabled
          return (
            <View key={item.key} style={styles.daySlot}>
              <MGChip
                label={item.label}
                appearance="solid"
                density="compact"
                minHeight={48}
                selected={enabled}
                accessibilityLabel={`${item.name}, ${enabled ? 'ligado' : 'desligado'}`}
                onPress={() => {
                  toggle(item.key)
                  onFocus(item.key)
                }}
              />
            </View>
          )
        })}
      </View>

      <View style={[styles.focusCard, { backgroundColor: colors.surface.pinkSubtle, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, overflow: 'hidden' }]}>
        <View style={[styles.focusHead, { gap: spacing.xs }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" onPress={() => shift(-1)} style={styles.iconHit}>
            <MGIcon name="chevron-left" size={20} color={colors.text.primary} />
          </Pressable>
          <MGIcon name="calendar-days" size={18} color={colors.action.primary} />
          <MGText variant="label" numberOfLines={1} style={styles.dayTitle}>{day.title}</MGText>
          <MGText variant="caption" numberOfLines={1}>Dia ativo</MGText>
          <TrackSwitch
            on={!!current.enabled}
            label="Dia ativo"
            tone="primary"
            onPress={() => toggle(day.key)}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo dia" onPress={() => shift(1)} style={styles.iconHit}>
            <MGIcon name="chevron-right" size={20} color={colors.text.primary} />
          </Pressable>
        </View>

        {current.enabled ? (
          <View style={{ gap: spacing.md }}>
            <View ref={anchorRef} collapsable={false} style={[styles.schedule, { backgroundColor: colors.surface.default, borderRadius: radius.lg, padding: spacing.md }]}>
            <View style={{ gap: spacing.sm }}>
              <View style={[styles.sectionTitle, { gap: spacing.sm }]}>
                <MGIcon name="clock-3" size={18} color={colors.text.secondary} />
                <MGText variant="label">Horário de trabalho</MGText>
              </View>
              <View style={[styles.times, { gap: spacing.sm }]}>
                <View style={styles.timeField}>
                  <MGTextField
                    compact
                    label="Início"
                    accessibilityLabel={`Início de ${day.name}`}
                    value={current.start ?? ''}
                    onChangeText={(text) => update(day.key, { start: text })}
                    placeholder="09:00"
                    autoCapitalize="none"
                    maxLength={5}
                    trailing={clock()}
                  />
                </View>
                <View style={styles.timeField} nativeID={issue && !breakIssue ? 'availability-day-card' : undefined}>
                  <MGTextField
                    compact
                    label="Fim"
                    accessibilityLabel={`Fim de ${day.name}`}
                    value={current.end ?? ''}
                    onChangeText={(text) => update(day.key, { end: text })}
                    placeholder="18:00"
                    autoCapitalize="none"
                    maxLength={5}
                    error={issue && !breakIssue ? issue : undefined}
                    trailing={clock()}
                  />
                </View>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border.default, marginVertical: spacing.md }} />
            <View style={{ gap: spacing.sm }}>
              <View style={[styles.sectionTitle, { gap: spacing.sm }]}>
                <MGIcon name="coffee" size={18} color={colors.text.secondary} />
                <MGText variant="label">Intervalo (opcional)</MGText>
              </View>
              <View style={[styles.times, { gap: spacing.sm }]}>
                <View style={styles.timeField} nativeID={breakIssue ? 'availability-day-card' : undefined}>
                  <MGTextField
                    compact
                    label="Início do intervalo"
                    accessibilityLabel={`Início do intervalo de ${day.name}`}
                    value={current.breakStart ?? ''}
                    onChangeText={(text) => update(day.key, { breakStart: text })}
                    placeholder="Opcional"
                    autoCapitalize="none"
                    maxLength={5}
                    error={breakIssue ? issue : undefined}
                    trailing={clock()}
                  />
                </View>
                <View style={styles.timeField}>
                  <MGTextField
                    compact
                    label="Fim do intervalo"
                    accessibilityLabel={`Fim do intervalo de ${day.name}`}
                    value={current.breakEnd ?? ''}
                    onChangeText={(text) => update(day.key, { breakEnd: text })}
                    placeholder="Opcional"
                    autoCapitalize="none"
                    maxLength={5}
                    trailing={clock()}
                  />
                </View>
              </View>
            </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aplicar este horário aos dias ativos"
              disabled={others.length === 0}
              onPress={applyToActive}
              style={[styles.applyRow, { minHeight: 48, gap: spacing.sm }]}
            >
              <View style={[styles.checkBox, { borderColor: others.length ? colors.action.primary : colors.border.default }]}>
                {applied ? <MGIcon name="check" size={14} color={colors.action.primary} /> : null}
              </View>
              <MGText variant="label" color={others.length ? 'brand' : 'secondary'} style={styles.applyLabel}>
                Aplicar este horário aos dias ativos
              </MGText>
              <MGIcon name="chevron-right" size={18} color={colors.action.primary} />
            </Pressable>
            {applied ? (
              <MGText variant="caption" accessibilityRole="alert">Horário aplicado aos dias ativos.</MGText>
            ) : null}
          </View>
        ) : (
          <MGText variant="body">Dia desligado não oferece horário.</MGText>
        )}
      </View>

      {others.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.sectionHead, { gap: spacing.sm }]}>
            <View style={[styles.sectionTitle, { gap: spacing.sm }]}>
              <MGIcon name="calendar-days" size={20} color={colors.action.primary} />
              <MGText variant="heading3">Outros dias ativos</MGText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Gerenciar todos os dias" onPress={() => onFocus('mon')} style={styles.manage}>
              <MGText variant="caption" color="brand">Gerenciar todos os dias</MGText>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.otherScroll}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {others.map((item) => {
              const entry = value[item.key]
              const range = entry.start && entry.end ? `${entry.start} às ${entry.end}` : 'Horário incompleto'
              return (
                <View key={item.key} style={[styles.otherCard, { backgroundColor: colors.surface.default, borderColor: colors.border.default, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs }]}>
                  <View style={[styles.otherTop, { gap: spacing.sm }]}>
                    <MGIcon name="clock-3" size={16} color={colors.action.primary} />
                    <MGText variant="label" style={styles.applyLabel}>{item.title}</MGText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ações de ${item.name}`}
                      onPress={() => setMenuKey(menuKey === item.key ? null : item.key)}
                      style={styles.iconHit}
                    >
                      <MGIcon name="ellipsis" size={18} color={colors.text.secondary} />
                    </Pressable>
                  </View>
                  <MGText variant="caption" color="secondary">{range}</MGText>
                </View>
              )
            })}
          </ScrollView>
          {menuKey ? (
            <View style={[styles.menuActions, { gap: spacing.sm }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${DAYS.find((item) => item.key === menuKey)?.name}`} onPress={() => { onFocus(menuKey); setMenuKey(null) }} style={styles.menuButton}>
                <MGText variant="label" color="brand">Editar</MGText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Desligar ${DAYS.find((item) => item.key === menuKey)?.name}`} onPress={() => { toggle(menuKey); setMenuKey(null) }} style={styles.menuButton}>
                <MGText variant="label" color="error">Desligar</MGText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
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
      style={[styles.switchTrack, { backgroundColor: track, borderRadius: radius.pill }]}
    >
      <View style={[styles.switchThumb, { backgroundColor: colors.surface.default, marginLeft: on ? 22 : 2 }]} />
    </Pressable>
  )
}

export function emptyWeeklyAvailability(): Record<WeekdayKey, DayAvailability> {
  return {
    mon: { enabled: false },
    tue: { enabled: false },
    wed: { enabled: false },
    thu: { enabled: false },
    fri: { enabled: false },
    sat: { enabled: false },
    sun: { enabled: false },
  }
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHint: {
    flexShrink: 1,
    textAlign: 'right',
  },
  days: {
    flexDirection: 'row',
  },
  daySlot: {
    flex: 1,
  },
  focusCard: {},
  focusHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconHit: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitle: {
    flexGrow: 1,
    flexShrink: 1,
  },
  otherScroll: {
    height: 96,
  },
  schedule: {},
  block: {},
  times: {
    flexDirection: 'row',
  },
  timeField: {
    flex: 1,
  },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyLabel: {
    flex: 1,
  },
  manage: {
    minHeight: 48,
    justifyContent: 'center',
  },
  otherCard: {
    borderWidth: 1,
    minWidth: 148,
  },
  otherTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuActions: {
    flexDirection: 'row',
  },
  menuButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  switchTrack: {
    width: 48,
    height: 28,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
})
