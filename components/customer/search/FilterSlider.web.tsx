import { CSSProperties, useId, useRef, useState } from 'react'
import { useMGTheme } from '../../../design-system/theme/useMGTheme'
import { FilterSliderProps, RangeFilterSliderProps, sliderPercent, sliderValue } from './FilterSlider.types'

export type { FilterSliderProps, RangeFilterSliderProps } from './FilterSlider.types'

/** The inputs remain native HTML ranges for keyboard and assistive-technology support. */
function SliderTrack({
  label, lowerValue, upperValue, minimumValue, maximumValue, step = 1,
  onLowerValueChange, onUpperValueChange,
}: Omit<RangeFilterSliderProps, 'onLowerValueChange'> & { onLowerValueChange?: (value: number) => void }) {
  const { colors, spacing, radius } = useMGTheme()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [active, setActive] = useState<'lower' | 'upper'>('upper')
  const lowerInput = useRef<HTMLInputElement>(null)
  const upperInput = useRef<HTMLInputElement>(null)
  const lower = sliderValue(lowerValue, minimumValue, maximumValue, step)
  const upper = sliderValue(Math.max(lower, upperValue), minimumValue, maximumValue, step)
  const lowerPercent = sliderPercent(lower, minimumValue, maximumValue)
  const upperPercent = sliderPercent(upper, minimumValue, maximumValue)
  const interval = Number.isFinite(step) && step > 0 ? step : 1
  const inputStyle: CSSProperties = {
    position: 'absolute', inset: 0, margin: 0, width: '100%', height: spacing.huge,
    appearance: 'none', WebkitAppearance: 'none', background: 'transparent',
    pointerEvents: 'none', padding: 0,
  }
  const thumbSize = spacing.huge
  const thumbBackground = `radial-gradient(circle, ${colors.surface.default} 0 ${spacing.sm + spacing.xxs}px, ${colors.action.primary} ${spacing.sm + spacing.xxs}px ${spacing.md}px, transparent ${spacing.md}px)`
  // The visible rail starts at each thumb's center, matching native range geometry.
  return (
    <div
      style={{ position: 'relative', height: spacing.huge, width: '100%' }}
      onPointerDown={event => {
        // Native thumbs handle dragging themselves; a tap elsewhere on the rail moves the nearest thumb.
        if ((event.target as HTMLElement).tagName === 'INPUT') return
        const bounds = event.currentTarget.getBoundingClientRect()
        const usable = bounds.width - thumbSize
        if (usable <= 0) return
        const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left - thumbSize / 2) / usable))
        const next = sliderValue(minimumValue + fraction * (maximumValue - minimumValue), minimumValue, maximumValue, interval)
        if (onLowerValueChange && Math.abs(next - lower) < Math.abs(next - upper)) {
          onLowerValueChange(Math.min(next, upper))
          lowerInput.current?.focus()
        } else {
          onUpperValueChange(Math.max(lower, next))
          upperInput.current?.focus()
        }
      }}
    >
      <style>{`
        .mg-filter-slider-${id}::-webkit-slider-runnable-track { height: ${spacing.huge}px; background: transparent; }
        .mg-filter-slider-${id}::-moz-range-track { height: ${spacing.huge}px; background: transparent; }
        .mg-filter-slider-${id}::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; pointer-events: auto;
          width: ${thumbSize}px; height: ${thumbSize}px; margin-top: ${(spacing.huge - thumbSize) / 2}px;
          border: 0; border-radius: ${radius.pill}px;
          background: ${thumbBackground}; cursor: grab;
        }
        .mg-filter-slider-${id}::-moz-range-thumb {
          pointer-events: auto; width: ${thumbSize}px; height: ${thumbSize}px;
          border: 0; border-radius: ${radius.pill}px;
          background: ${thumbBackground}; cursor: grab;
        }
        .mg-filter-slider-${id}:focus-visible { outline: none; }
        .mg-filter-slider-${id}:focus-visible::-webkit-slider-thumb { outline: 3px solid ${colors.action.focus}; outline-offset: 3px; }
        .mg-filter-slider-${id}:focus-visible::-moz-range-thumb { outline: 3px solid ${colors.action.focus}; outline-offset: 3px; }
        .mg-filter-slider-${id}:active::-webkit-slider-thumb { cursor: grabbing; }
        .mg-filter-slider-${id}:active::-moz-range-thumb { cursor: grabbing; }
      `}</style>
      <div aria-hidden style={{
        position: 'absolute', left: thumbSize / 2, right: thumbSize / 2,
        top: (spacing.huge - spacing.xs) / 2, height: spacing.xs,
        borderRadius: radius.pill, background: colors.surface.pinkSubtle,
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${lowerPercent}%`, width: `${upperPercent - lowerPercent}%`,
          borderRadius: radius.pill, background: colors.action.primary,
        }} />
      </div>
      {onLowerValueChange ? <input
        ref={lowerInput}
        className={`mg-filter-slider-${id}`}
        type="range"
        aria-label={`${label} mínimo`}
        min={minimumValue} max={maximumValue} step={interval} value={lower}
        aria-valuemax={upper}
        onFocus={() => setActive('lower')}
        onPointerDown={() => setActive('lower')}
        onChange={event => onLowerValueChange(Math.min(upper, sliderValue(Number(event.currentTarget.value), minimumValue, maximumValue, interval)))}
        style={{ ...inputStyle, zIndex: active === 'lower' ? 2 : 1 }}
      /> : null}
      <input
        ref={upperInput}
        className={`mg-filter-slider-${id}`}
        type="range"
        aria-label={onLowerValueChange ? `${label} máximo` : label}
        min={minimumValue} max={maximumValue} step={interval} value={upper}
        aria-valuemin={lower}
        onFocus={() => setActive('upper')}
        onPointerDown={() => setActive('upper')}
        onChange={event => onUpperValueChange(Math.max(lower, sliderValue(Number(event.currentTarget.value), minimumValue, maximumValue, interval)))}
        style={{ ...inputStyle, zIndex: active === 'upper' ? 2 : 1 }}
      />
    </div>
  )
}

export default function FilterSlider({ value, onValueChange, ...props }: FilterSliderProps) {
  return <SliderTrack {...props} lowerValue={props.minimumValue} upperValue={value} onUpperValueChange={onValueChange} />
}

export function RangeFilterSlider(props: RangeFilterSliderProps) {
  return <SliderTrack {...props} />
}
