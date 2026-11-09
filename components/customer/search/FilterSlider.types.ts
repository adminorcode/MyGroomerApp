export type FilterSliderProps = {
  label: string
  value: number
  minimumValue: number
  maximumValue: number
  step?: number
  onValueChange: (value: number) => void
}

export type RangeFilterSliderProps = Omit<FilterSliderProps, 'value' | 'onValueChange'> & {
  lowerValue: number
  upperValue: number
  onLowerValueChange: (value: number) => void
  onUpperValueChange: (value: number) => void
}

/** Values are snapped relative to the lower bound, then clamped again at the ends. */
export function sliderValue(value: number, minimum: number, maximum: number, step = 1) {
  const interval = Number.isFinite(step) && step > 0 ? step : 1
  const finite = Number.isFinite(value) ? value : minimum
  const snapped = minimum + Math.round((finite - minimum) / interval) * interval
  return Math.min(maximum, Math.max(minimum, Number(snapped.toFixed(8))))
}

export function sliderPercent(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return 0
  return Math.min(100, Math.max(0, (value - minimum) / (maximum - minimum) * 100))
}
