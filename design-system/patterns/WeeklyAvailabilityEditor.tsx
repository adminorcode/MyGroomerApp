import { StyleSheet, View } from 'react-native'
import MGChip from '../components/MGChip'
import MGText from '../components/MGText'
import MGTextField from '../components/MGTextField'
import { useMGTheme } from '../theme/useMGTheme'

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type DayAvailability = {
  enabled: boolean
  start?: string
  end?: string
}

const DAYS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
]

type Props = {
  value: Record<WeekdayKey, DayAvailability>
  onChange: (next: Record<WeekdayKey, DayAvailability>) => void
  helperText?: string
}

export default function WeeklyAvailabilityEditor({ value, onChange, helperText }: Props) {
  const { spacing } = useMGTheme()

  const toggleDay = (key: WeekdayKey) => {
    const current = value[key]
    onChange({
      ...value,
      [key]: {
        ...current,
        enabled: !current.enabled,
        start: current.start ?? '09:00',
        end: current.end ?? '18:00',
      },
    })
  }

  const setField = (key: WeekdayKey, field: 'start' | 'end', text: string) => {
    onChange({
      ...value,
      [key]: { ...value[key], [field]: text },
    })
  }

  return (
    <View style={{ gap: spacing.md }}>
      <MGText variant="heading3">Disponibilidade semanal</MGText>
      {helperText ? (
        <MGText variant="caption" color="secondary">
          {helperText}
        </MGText>
      ) : null}
      <View style={[styles.days, { gap: spacing.sm }]}>
        {DAYS.map((day) => (
          <MGChip
            key={day.key}
            label={day.label}
            selected={value[day.key]?.enabled}
            onPress={() => toggleDay(day.key)}
          />
        ))}
      </View>
      {DAYS.filter((day) => value[day.key]?.enabled).map((day) => (
        <View key={day.key} style={{ gap: spacing.xs }}>
          <MGText variant="label">{day.label}</MGText>
          <View style={[styles.times, { gap: spacing.sm }]}>
            <View style={styles.timeField}>
              <MGTextField
                label="Início"
                value={value[day.key].start ?? ''}
                onChangeText={(text) => setField(day.key, 'start', text)}
                placeholder="09:00"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.timeField}>
              <MGTextField
                label="Fim"
                value={value[day.key].end ?? ''}
                onChangeText={(text) => setField(day.key, 'end', text)}
                placeholder="18:00"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      ))}
    </View>
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
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  times: {
    flexDirection: 'row',
  },
  timeField: {
    flex: 1,
  },
})
