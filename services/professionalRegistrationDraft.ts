import AsyncStorage from '@react-native-async-storage/async-storage'
import { ProfessionalRegistrationDraft } from '../screens/provider/professionalRegistrationModel'

const KEY = 'professional-registration-draft-v1'

export async function loadRegistrationDraft(): Promise<ProfessionalRegistrationDraft | null> {
  const value = await AsyncStorage.getItem(KEY)
  return value ? JSON.parse(value) : null
}

export async function saveRegistrationDraft(value: ProfessionalRegistrationDraft) {
  await AsyncStorage.setItem(KEY, JSON.stringify(value))
}

export async function clearRegistrationDraft() {
  await AsyncStorage.removeItem(KEY)
}
