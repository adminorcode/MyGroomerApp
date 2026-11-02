import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { API_BASE_URL } from '../constants/api'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

type LoadedImage = {
  uri: string
  objectUrl: string | null
}

/**
 * As fotos do perfil público e da galeria exigem o token da conta, então a URL
 * solta não carrega em `Image`. Este hook baixa os bytes pelo cliente autenticado
 * e devolve uma URI local para o componente de imagem.
 */
async function loadAuthorizedImage(path: string, token: string): Promise<LoadedImage> {
  if (Platform.OS === 'web') {
    const response = await api.get(path, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data as Blob)
    return { uri: objectUrl, objectUrl }
  }

  const { File, Paths } = await import('expo-file-system')
  const suffix = path.split('/').pop() ?? 'photo'
  const target = new File(Paths.cache, `mg-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)
  const download = await File.downloadFileAsync(`${API_BASE_URL}${path}`, target, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { uri: download.uri, objectUrl: null }
}

function releaseImage(image: LoadedImage | null) {
  if (!image?.objectUrl) return
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(image.objectUrl)
  }
}

export function useAuthorizedImage(path: string | null | undefined) {
  const token = useAuthStore((state) => state.token)
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !token) {
      setUri(null)
      return
    }

    let active = true
    let loaded: LoadedImage | null = null
    setUri(null)

    void loadAuthorizedImage(path, token)
      .then((image) => {
        if (!active) {
          releaseImage(image)
          return
        }
        loaded = image
        setUri(image.uri)
      })
      .catch(() => {
        if (active) setUri(null)
      })

    return () => {
      active = false
      releaseImage(loaded)
    }
  }, [path, token])

  return uri
}
