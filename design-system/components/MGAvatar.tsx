import { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import MGText from './MGText'
import MGArtwork from './MGArtwork'
import { useMGTheme } from '../theme/useMGTheme'

export type MGAvatarKind = 'person' | 'pet'

type Props = {
  uri?: string | null
  name: string
  kind?: MGAvatarKind
  size?: number
}

export default function MGAvatar({ uri, name, kind = 'person', size = 48 }: Props) {
  const { colors } = useMGTheme()
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [uri])
  const showImage = Boolean(uri) && !failed
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface.pinkSubtle,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
          accessibilityLabel={name}
        />
      ) : kind === 'pet' ? (
        <MGArtwork name="pet-placeholder" width={size * 0.85} />
      ) : (
        <MGText variant="title" color="brand">
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
