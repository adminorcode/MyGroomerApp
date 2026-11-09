import { useMemo, useRef, useState } from 'react'
import { PanResponder, View } from 'react-native'
import { useMGTheme } from '../../../design-system/theme/useMGTheme'
import { FilterSliderProps, RangeFilterSliderProps, sliderPercent, sliderValue } from './FilterSlider.types'

export type { FilterSliderProps, RangeFilterSliderProps } from './FilterSlider.types'

type HandleProps = FilterSliderProps & {
  railWidth: number
  accessibilityMinimumValue?: number
  accessibilityMaximumValue?: number
}

function Handle(props: HandleProps) {
  const { colors, spacing, radius } = useMGTheme()
  const current = useRef(props)
  current.current = props
  const start = useRef(props.value)
  const [dragging, setDragging] = useState(false)
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { start.current = current.current.value; setDragging(true) },
    onPanResponderMove: (_, gesture) => {
      const item = current.current
      if (item.railWidth <= 0) return
      const next = start.current + gesture.dx / item.railWidth * (item.maximumValue - item.minimumValue)
      item.onValueChange(sliderValue(next, item.minimumValue, item.maximumValue, item.step))
    },
    onPanResponderRelease: () => setDragging(false),
    onPanResponderTerminate: () => setDragging(false),
    onPanResponderTerminationRequest: () => false,
  }), [])
  const {
    value, minimumValue, maximumValue, step = 1, railWidth, label, onValueChange,
    accessibilityMinimumValue = minimumValue, accessibilityMaximumValue = maximumValue,
  } = props
  const ratio = sliderPercent(value, minimumValue, maximumValue) / 100
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: accessibilityMinimumValue, max: accessibilityMaximumValue, now: value }}
      accessibilityActions={[{ name: 'increment', label: 'Aumentar' }, { name: 'decrement', label: 'Diminuir' }]}
      onAccessibilityAction={event => {
        const delta = event.nativeEvent.actionName === 'increment' ? step : event.nativeEvent.actionName === 'decrement' ? -step : 0
        if (delta) onValueChange(sliderValue(value + delta, minimumValue, maximumValue, step))
      }}
      style={{ position: 'absolute', left: ratio * railWidth, top: 0, width: spacing.huge, height: spacing.huge, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: spacing.xl, height: spacing.xl, borderRadius: radius.pill, borderWidth: 2, borderColor: dragging ? colors.action.focus : colors.action.primary, backgroundColor: colors.surface.default }} />
    </View>
  )
}

function SliderTrack({
  label, lowerValue, upperValue, minimumValue, maximumValue, step = 1,
  onLowerValueChange, onUpperValueChange,
}: Omit<RangeFilterSliderProps, 'onLowerValueChange'> & { onLowerValueChange?: (value: number) => void }) {
  const { colors, spacing, radius } = useMGTheme()
  const [railWidth, setRailWidth] = useState(0)
  const lower = sliderValue(lowerValue, minimumValue, maximumValue, step)
  const upper = sliderValue(Math.max(lower, upperValue), minimumValue, maximumValue, step)
  const lowerPercent = sliderPercent(lower, minimumValue, maximumValue)
  const upperPercent = sliderPercent(upper, minimumValue, maximumValue)
  const handleProps = { minimumValue, maximumValue, step, railWidth }
  return (
    <View onLayout={event => setRailWidth(Math.max(0, event.nativeEvent.layout.width - spacing.huge))} style={{ width: '100%', height: spacing.huge }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: spacing.xl, right: spacing.xl, top: (spacing.huge - spacing.xs) / 2, height: spacing.xs, backgroundColor: colors.surface.pinkSubtle, borderRadius: radius.pill }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${lowerPercent}%`, width: `${upperPercent - lowerPercent}%`, backgroundColor: colors.action.primary, borderRadius: radius.pill }} />
      </View>
      {onLowerValueChange ? <Handle {...handleProps} accessibilityMaximumValue={upper} label={`${label} mínimo`} value={lower} onValueChange={next => onLowerValueChange(Math.min(upper, next))} /> : null}
      <Handle {...handleProps} accessibilityMinimumValue={lower} label={onLowerValueChange ? `${label} máximo` : label} value={upper} onValueChange={next => onUpperValueChange(Math.max(lower, next))} />
    </View>
  )
}

export default function FilterSlider({ value, onValueChange, ...props }: FilterSliderProps) {
  return <SliderTrack {...props} lowerValue={props.minimumValue} upperValue={value} onUpperValueChange={onValueChange} />
}

export function RangeFilterSlider(props: RangeFilterSliderProps) {
  return <SliderTrack {...props} />
}
