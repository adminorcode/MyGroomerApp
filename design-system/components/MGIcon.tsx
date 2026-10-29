import { View } from 'react-native'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock3,
  Droplets,
  LucideIcon,
  MapPin,
  PawPrint,
  Plus,
  Scissors,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native'
import { useMGTheme } from '../theme/useMGTheme'

export type MGIconName =
  | 'paw-print'
  | 'scissors'
  | 'droplets'
  | 'map-pin'
  | 'calendar-days'
  | 'clock-3'
  | 'badge-check'
  | 'bell'
  | 'search'
  | 'sliders-horizontal'
  | 'plus'
  | 'arrow-left'

const ICONS: Record<MGIconName, LucideIcon> = {
  'paw-print': PawPrint,
  scissors: Scissors,
  droplets: Droplets,
  'map-pin': MapPin,
  'calendar-days': CalendarDays,
  'clock-3': Clock3,
  'badge-check': BadgeCheck,
  bell: Bell,
  search: Search,
  'sliders-horizontal': SlidersHorizontal,
  plus: Plus,
  'arrow-left': ArrowLeft,
}

type Props = {
  name: MGIconName
  size?: number
  color?: string
  decorative?: boolean
  accessibilityLabel?: string
}

export default function MGIcon({
  name,
  size = 22,
  color,
  decorative = true,
  accessibilityLabel,
}: Props) {
  const { colors } = useMGTheme()
  const Icon = ICONS[name]

  // A11y props belong on a View wrapper — Lucide SVG rejects them on web.
  return (
    <View
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'yes'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel ?? name}
      accessibilityRole={decorative ? undefined : 'image'}
    >
      <Icon size={size} color={color ?? colors.text.primary} />
    </View>
  )
}

export function resolveMGIcon(name: MGIconName): LucideIcon {
  return ICONS[name]
}
