import type { ConfigContext, ExpoConfig } from 'expo/config'
import { APP_NAME, APP_SCHEME } from './constants/brand'

const locationPermission = `O ${APP_NAME} usa sua localização para definir o local do atendimento.`

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: config.slug ?? 'client',
  scheme: APP_SCHEME,
  plugins: (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-location') {
      const options = plugin[1] && typeof plugin[1] === 'object' ? plugin[1] : {}
      return ['expo-location', { ...options, locationWhenInUsePermission: locationPermission }]
    }
    return plugin
  }),
})
