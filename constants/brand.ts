export const APP_NAME_DEFAULT = 'Tio de Pet'
export const APP_SCHEME_DEFAULT = 'tiodepet'

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME?.trim() || APP_NAME_DEFAULT
export const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME?.trim() || APP_SCHEME_DEFAULT

export const appDeepLink = (path: string): string => `${APP_SCHEME}://${path.replace(/^\//, '')}`
