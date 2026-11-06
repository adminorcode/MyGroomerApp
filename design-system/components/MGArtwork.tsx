import { useState } from 'react'
import { Image, StyleProp, View, ViewStyle } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { motif05, motif06, motif17 } from '../../assets/reference/motifs'
import { useMGTheme } from '../theme/useMGTheme'
import MGIcon from './MGIcon'

const illustrations = {
  welcome: require('../../assets/reference/AS-01-cachorrinho-rosto.png'),
  poodle: require('../../assets/reference/AS-02-poodle.png'),
  puppy: require('../../assets/reference/AS-03-cachorrinho-inteiro.png'),
  professional: require('../../assets/reference/AS-04-mascote-cadastro.png'),
  cat: require('../../assets/reference/AS-18-gatinho.png'),
}
type Name = keyof typeof illustrations | 'pet-placeholder' | 'paw-decoration' | 'brand-symbol'
type Props = {
  name: Name
  width?: number
  height?: number
  style?: StyleProp<ViewStyle>
  decorative?: boolean
  accessibilityLabel?: string
}

/** Ilustrações de composição; fotos de pessoas/pets continuam vindas dos dados reais. */
export default function MGArtwork({ name, width = 128, height = width, style, decorative = true, accessibilityLabel }: Props) {
  const { colors } = useMGTheme()
  const [failedSource, setFailedSource] = useState<Name | null>(null)
  const xml = name === 'pet-placeholder' ? motif05.replaceAll('#D95786', colors.brand.pink)
    : name === 'paw-decoration' ? motif06.replaceAll('#F6B5CB', colors.brand.pinkLight)
      : name === 'brand-symbol' ? motif17 : null
  return (
    <View
      testID={`artwork-${name}`}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      aria-hidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      pointerEvents="none"
      style={[{ width, height, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, style]}
    >
      {xml ? <SvgXml xml={xml} width="100%" height="100%" />
        : failedSource === name ? <MGIcon name="paw-print" size={Math.min(width, height) / 2} color={colors.brand.pink} />
          : <Image source={illustrations[name as keyof typeof illustrations]} resizeMode="contain" style={{ width: '100%', height: '100%' }} onError={() => setFailedSource(name)} accessible={false} />}
    </View>
  )
}
