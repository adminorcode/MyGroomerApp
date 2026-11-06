import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Image as RNImage, View, useWindowDimensions } from 'react-native'
import { X } from 'lucide-react-native'
import { MGIcon, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { useAuthorizedImage } from '../../hooks/useAuthorizedImage'

type Props = {
  photoIds: string[]
  canAdd?: boolean
  addLabel?: string
  onAdd?: () => void
  onRemove?: (photoId: string) => void
  removingId?: string | null
  adding?: boolean
  emptyTitle: string
  emptyDescription?: string
}

function GalleryPhoto({ photoId, index, size, onRemove, removing }: {
  photoId: string
  index: number
  size: number
  onRemove?: (photoId: string) => void
  removing: boolean
}) {
  const { colors, spacing, radius } = useMGTheme()
  const uri = useAuthorizedImage(`/providers/gallery/${photoId}`)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [uri])
  const label = `Foto da galeria ${index + 1}`

  return (
    <View style={{ width: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.state.disabledSurface,
          borderWidth: 1,
          borderColor: colors.border.default,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri && !failed ? (
          <RNImage source={{ uri }} accessibilityLabel={label} style={{ width: size, height: size }} onError={() => setFailed(true)} />
        ) : (
          <MGIcon name="paw-print" size={Math.round(size * 0.28)} color={colors.text.secondary} />
        )}
      </View>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover ${label.toLowerCase()}`}
          accessibilityState={{ disabled: removing }}
          disabled={removing}
          hitSlop={8}
          onPress={() => onRemove(photoId)}
          style={({ pressed }) => ({
            position: 'absolute',
            top: spacing.xs,
            right: spacing.xs,
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.default,
            borderWidth: 1,
            borderColor: colors.border.default,
            opacity: removing ? 0.5 : pressed ? 0.8 : 1,
          })}
        >
          <X size={18} color={colors.feedback.error} />
        </Pressable>
      ) : null}
    </View>
  )
}

export default function ProfileGallery({
  photoIds,
  canAdd = false,
  addLabel = 'Adicionar fotos',
  onAdd,
  onRemove,
  removingId = null,
  adding = false,
  emptyTitle,
  emptyDescription,
}: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const { width } = useWindowDimensions()
  const [available, setAvailable] = useState(0)
  const columns = width >= 480 ? 4 : 3
  const base = available > 0 ? available : Math.min(width, 720) - spacing.base * 2
  const tile = Math.max(72, Math.floor((base - spacing.sm * (columns - 1)) / columns))

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {photoIds.map((photoId, index) => (
          <GalleryPhoto
            key={photoId}
            photoId={photoId}
            index={index}
            size={tile}
            onRemove={onRemove}
            removing={removingId === photoId}
          />
        ))}
        {canAdd && onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            accessibilityState={{ busy: adding, disabled: adding }}
            disabled={adding}
            onPress={onAdd}
            style={({ pressed }) => ({
              width: tile,
              height: tile,
              borderRadius: radius.lg,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.action.primaryOutline,
              backgroundColor: pressed ? colors.surface.pinkSubtle : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              padding: spacing.sm,
            })}
          >
            {adding ? (
              <ActivityIndicator color={colors.action.primary} />
            ) : (
              <>
                <MGIcon name="plus" size={22} color={colors.action.primary} />
                <MGText variant="caption" color="brand" style={{ textAlign: 'center' }}>
                  {addLabel}
                </MGText>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
      {photoIds.length === 0 ? (
        <View style={{ gap: spacing.xs }}>
          <MGText variant="body" color="secondary">{emptyTitle}</MGText>
          {emptyDescription ? <MGText variant="caption" color="secondary">{emptyDescription}</MGText> : null}
        </View>
      ) : null}
    </View>
  )
}
