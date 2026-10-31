import { useCallback, useRef, useState } from 'react'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/types'
import ProfessionalRegistrationForm from '../provider/ProfessionalRegistrationForm'
import { createProfessionalAccount, saveProfessionalRegistration } from '../../services/professionalRegistration.service'
import { loginUser } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'
import { useRegistrationNavigation } from '../../store/registrationNavigation'
import { ProfessionalRegistration } from '../provider/professionalRegistrationModel'

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Register'> }

export default function RegisterScreen({ navigation }: Props) {
  const created = useRef<{ email: string; requires_verification: boolean } | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | undefined>()
  const restoreRegisteredAccount = useCallback((email: string) => {
    // Saved only after local account creation succeeded but automatic login did
    // not. Resume that account instead of trying to register its email again.
    created.current = { email, requires_verification: false }
    setRegisteredEmail(email)
  }, [])
  const continueRegistration = async (value: ProfessionalRegistration, password: string) => {
    // Retry login without creating a duplicate account if it failed after registration.
    const account = created.current ?? await createProfessionalAccount(value, password)
    created.current = account
    setRegisteredEmail(account.email)
    if (account.requires_verification) {
      navigation.navigate('VerifyEmail', { email: account.email })
      return
    }
    const authenticated = await loginUser(account.email, password)
    // Edits made after a failed automatic login must reach the existing account
    // before navigation or draft cleanup. The token is kept out of persisted drafts.
    const saved = await saveProfessionalRegistration({ ...value, email: account.email }, 'continue', authenticated.token)
    useRegistrationNavigation.getState().setUserId(authenticated.user.id)
    useAuthStore.getState().setAuth(authenticated.token, { ...authenticated.user, name: saved.name, email: saved.email })
  }
  return <ProfessionalRegistrationForm registeredEmail={registeredEmail} onRestoreRegisteredAccount={restoreRegisteredAccount} onExit={() => navigation.navigate('Welcome')} onLogin={() => navigation.navigate('Login')} onContinue={continueRegistration} />
}
