import { PressableProps } from 'react-native'
import MGButton, { MGButtonVariant } from '../../design-system/components/MGButton'

type LegacyVariant = 'primary' | 'secondary' | 'outline' | 'danger'

export type BoameBtnProps = Omit<PressableProps, 'children'> & {
  title: string
  variant?: LegacyVariant
  loading?: boolean
  fullWidth?: boolean
}

/** @deprecated Prefer MGButton from design-system/components for new UI. */
export default function BoameBtn({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  ...props
}: BoameBtnProps) {
  const mapped: MGButtonVariant =
    variant === 'outline'
      ? 'secondary'
      : variant === 'danger'
        ? 'destructive'
        : variant === 'secondary'
          ? 'teal'
          : 'primary'

  return (
    <MGButton
      label={title}
      variant={mapped}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      {...props}
    />
  )
}
