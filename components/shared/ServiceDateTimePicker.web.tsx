import { createElement, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

type Props = {
  value: Date
  minimumDate?: Date
  onChange?: (event: { type: string }, value?: Date) => void
  mode?: string
  display?: string
}

function localDateTime(value: Date) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 16)
}

export default function ServiceDateTimePicker({ value, minimumDate, onChange }: Props) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const borderColor = focused ? colors.focus : colors.border
  return createElement('input', {
    type: 'datetime-local',
    'aria-label': 'Data e hora do atendimento',
    value: localDateTime(value),
    min: minimumDate ? localDateTime(minimumDate) : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = new Date(event.target.value)
      if (!Number.isNaN(selected.getTime())) onChange?.({ type: 'set' }, selected)
    },
    style: {
      padding: 12,
      borderRadius: 8,
      border: `2px solid ${borderColor}`,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
      outline: 'none',
    },
  })
}
