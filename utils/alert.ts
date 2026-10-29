import { Alert, AlertButton, Platform } from 'react-native'

// React Native's Alert has no browser implementation.
export const AppAlert = {
  alert(title: string, message = '', buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      Alert.alert(title, message, buttons)
      return
    }

    const text = message ? `${title}\n\n${message}` : title
    const action = buttons?.find(button => button.style !== 'cancel')
    if (buttons && buttons.length > 1) {
      if (globalThis.confirm(text)) action?.onPress?.()
    } else {
      globalThis.alert(text)
      action?.onPress?.()
    }
  },
}
