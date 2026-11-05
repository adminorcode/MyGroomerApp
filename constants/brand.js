/** Resolves Expo CLI loading app.config without TypeScript extension support. */
const APP_NAME_DEFAULT = 'Tio de Pet'
const APP_SCHEME_DEFAULT = 'tiodepet'

const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME?.trim() || APP_NAME_DEFAULT
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME?.trim() || APP_SCHEME_DEFAULT

module.exports = {
  APP_NAME_DEFAULT,
  APP_SCHEME_DEFAULT,
  APP_NAME,
  APP_SCHEME,
  appDeepLink: (path) => `${APP_SCHEME}://${path.replace(/^\//, '')}`,
}
