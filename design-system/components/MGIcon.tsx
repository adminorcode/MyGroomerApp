import { View } from 'react-native'
import {
  ArrowLeft,
  ArrowUpDown,
  BadgeCheck,
  Bath,
  Bell,
  Building2,
  CalendarDays,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Droplets,
  Ellipsis,
  FileText,
  Heart,
  House,
  ShowerHead,
  Zap,
  LayoutGrid,
  Star,
  LocateFixed,
  LucideIcon,
  MapPin,
  PawPrint,
  Plus,
  Scissors,
  Search,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react-native'
import { useMGTheme } from '../theme/useMGTheme'

export type MGIconName =
  | 'paw-print'
  | 'scissors'
  | 'droplets'
  | 'map-pin'
  | 'calendar-days'
  | 'image'
  | 'clock-3'
  | 'badge-check'
  | 'bell'
  | 'search'
  | 'sliders-horizontal'
  | 'plus'
  | 'arrow-left'
  | 'arrow-up-down'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'coffee'
  | 'ellipsis'
  | 'file-text'
  | 'building-2'
  | 'locate'
  | 'bath'
  | 'sparkles'
  | 'heart'
  | 'star'
  | 'grid'
  | 'house'
  | 'shower-head'
  | 'zap'

const ICONS: Record<MGIconName, LucideIcon> = {
  'paw-print': PawPrint,
  scissors: Scissors,
  droplets: Droplets,
  'map-pin': MapPin,
  'calendar-days': CalendarDays,
  image: ImageIcon,
  'clock-3': Clock3,
  'badge-check': BadgeCheck,
  bell: Bell,
  search: Search,
  'sliders-horizontal': SlidersHorizontal,
  plus: Plus,
  'arrow-left': ArrowLeft,
  'arrow-up-down': ArrowUpDown,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  coffee: Coffee,
  ellipsis: Ellipsis,
  'file-text': FileText,
  'building-2': Building2,
  locate: LocateFixed,
  bath: Bath,
  sparkles: Sparkles,
  heart: Heart,
  star: Star,
  grid: LayoutGrid,
  house: House,
  'shower-head': ShowerHead,
  zap: Zap,
}

type Props = {
  name: MGIconName
  size?: number
  color?: string
  decorative?: boolean
  accessibilityLabel?: string
  strokeWidth?: number
  fill?: string
}

export default function MGIcon({
  name,
  size = 22,
  color,
  decorative = true,
  accessibilityLabel,
  strokeWidth,
  fill = 'none',
}: Props) {
  const { colors } = useMGTheme()
  const Icon = ICONS[name]

  // A11y props belong on a View wrapper — Lucide SVG rejects them on web.
  return (
    <View
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      aria-hidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'yes'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel ?? name}
      accessibilityRole={decorative ? undefined : 'image'}
    >
      <Icon size={size} color={color ?? colors.text.primary} strokeWidth={strokeWidth} fill={fill} />
    </View>
  )
}

export function resolveMGIcon(name: MGIconName): LucideIcon {
  return ICONS[name]
}
