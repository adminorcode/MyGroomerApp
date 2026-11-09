import { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import MGText from './MGText'
import MGArtwork from './MGArtwork'
import { useMGTheme } from '../theme/useMGTheme'

export type MGAvatarKind = 'person' | 'pet'
/** R2/R3/R8: pet e tutor são rosa; profissional, operação e interlocutor profissional são teal. */
export type MGAvatarTone = 'pink' | 'teal'

type Props = {
  uri?: string | null
  name: string
  kind?: MGAvatarKind
  size?: number
  tone?: MGAvatarTone
  shape?: 'circle' | 'rounded'
  height?: number
}

export default function MGAvatar({ uri, name, kind = 'person', size = 48, tone = 'pink', shape = 'circle', height = size }: Props) {
  const { colors, radius } = useMGTheme()
  const corner = shape === 'rounded' ? radius.md : size / 2
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [uri])
  const showImage = Boolean(uri) && !failed
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const teal = tone === 'teal' && kind === 'person'

  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.base,
        {
          width: size,
          height,
          borderRadius: corner,
          backgroundColor: teal ? colors.brand.teal : colors.surface.pinkSubtle,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: size, height, borderRadius: corner }}
          onError={() => setFailed(true)}
          accessibilityLabel={name}
        />
      ) : kind === 'pet' ? (
        <MGArtwork name="pet-placeholder" width={size * 0.85} />
      ) : (
        <MGText variant="title" color={teal ? 'inverse' : 'brand'}>
          {initial}
        </MGText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
