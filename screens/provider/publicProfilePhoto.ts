import { Platform } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { PublicPhotoInput } from '../../types/provider.types'

export const MAX_PUBLIC_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_GALLERY_PHOTOS = 5
export const PUBLIC_PHOTO_TYPES = ['image/png', 'image/jpeg']

function mimeFromName(name: string): PublicPhotoInput['mime_type'] | '' {
  const extension = name.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  return ''
}

async function readBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web' && asset.file) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem. Selecione-a novamente.'))
      reader.readAsDataURL(asset.file!)
    })
  }
  const { File } = await import('expo-file-system')
  return new File(asset.uri).base64()
}

export async function pickPublicPhoto(): Promise<PublicPhotoInput | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PUBLIC_PHOTO_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  })
  if (result.canceled || !result.assets?.[0]) return null

  const asset = result.assets[0]
  const size = asset.size ?? asset.file?.size ?? 0
  const mime = mimeFromName(asset.name)
  if (!mime || (asset.mimeType && asset.mimeType !== mime)) {
    throw new Error(`${asset.name}: selecione uma imagem JPG ou PNG.`)
  }
  if (size <= 0) throw new Error(`${asset.name}: a imagem está vazia ou não pôde ser lida.`)
  if (size > MAX_PUBLIC_PHOTO_BYTES) throw new Error(`${asset.name}: o tamanho máximo é 10 MB por imagem.`)

  return { name: asset.name, mime_type: mime, size, base64: await readBase64(asset) }
}
