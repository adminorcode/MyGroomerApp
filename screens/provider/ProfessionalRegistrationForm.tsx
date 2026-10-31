import { ReactNode, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Award, Check, FileUp, IdCard, LockKeyhole, Mail, PawPrint, Phone, ShieldCheck, Trash2, UserRound } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { MGButton, MGIconButton, MGScreen, MGText, MGTextField } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { clearRegistrationDraft, loadRegistrationDraft, saveRegistrationDraft } from '../../services/professionalRegistrationDraft'
import { getProfessionalRegistration, getPublicProfessionalTypes, saveProfessionalRegistration } from '../../services/professionalRegistration.service'
import { getErrorMessage } from '../../utils/error'
import { emptyRegistration, FILE_TYPES, MAX_FILES, MAX_FILE_SIZE, ProfessionalRegistration, registrationErrors, registrationPayload, RegistrationAttachment } from './professionalRegistrationModel'
import { useAuthStore } from '../../store/authStore'

type Props = {
  authenticated?: boolean
  registeredEmail?: string
  onRestoreRegisteredAccount?: (email: string) => void
  onExit: () => void
  onBack?: () => void
  onContinue: (value: ProfessionalRegistration, password: string) => Promise<void>
  onLogin?: () => void
}

const steps = ['Cadastro\nprofissional', 'Dados do\nserviço', 'Local de\natendimento', 'Revisão\ne envio']

function RegistrationProgress() {
  const { colors, spacing, radius } = useMGTheme()
  return (
    <View accessibilityRole="summary" accessibilityLabel="Passo 1 de 4: Cadastro profissional" style={{ flexDirection: 'row' }}>
      {steps.map((label, index) => (
        <View key={label} style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', left: index ? 0 : '50%', right: index === steps.length - 1 ? '50%' : 0, height: 2, backgroundColor: colors.border.default }} />
            <View style={{ width: spacing.xxl, height: spacing.xxl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: index === 0 ? colors.action.primary : colors.state.disabledSurface }}>
              <MGText variant="label" color={index === 0 ? 'inverse' : 'secondary'}>{index + 1}</MGText>
            </View>
          </View>
          <MGText variant="caption" color={index === 0 ? 'brand' : 'secondary'} style={{ textAlign: 'center' }}>{label}</MGText>
        </View>
      ))}
    </View>
  )
}

function FieldRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const { spacing } = useMGTheme()
  return <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}><View style={{ paddingTop: spacing.xxs }}>{icon}</View><View style={{ flex: 1, minWidth: 0 }}>{children}</View></View>
}

async function attachmentFromAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<RegistrationAttachment> {
  const size = asset.size ?? asset.file?.size ?? 0
  const extension = asset.name.split('.').pop()?.toLowerCase()
  const mimeFromExtension = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : extension === 'pdf' ? 'application/pdf' : ''
  const mime = asset.mimeType || mimeFromExtension
  if (!mimeFromExtension || !FILE_TYPES.includes(mime) || mime !== mimeFromExtension) throw new Error(`${asset.name}: selecione um arquivo JPG, PNG ou PDF.`)
  if (size <= 0) throw new Error(`${asset.name}: o arquivo está vazio ou não pôde ser lido.`)
  if (size > MAX_FILE_SIZE) throw new Error(`${asset.name}: o tamanho máximo é 10 MB por arquivo.`)
  let base64: string
  if (Platform.OS === 'web' && asset.file) {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo. Selecione-o novamente.'))
      reader.readAsDataURL(asset.file!)
    })
  } else {
    const { File } = await import('expo-file-system')
    base64 = await new File(asset.uri).base64()
  }
  return { name: asset.name, mime_type: mime, size, base64 }
}

export default function ProfessionalRegistrationForm({ authenticated = false, registeredEmail, onRestoreRegisteredAccount, onExit, onBack = onExit, onContinue, onLogin }: Props) {
  const { colors, spacing, radius, elevation } = useMGTheme()
  const { width, fontScale } = useWindowDimensions()
  const compact = width < 600
  const stackedActions = width < 360 || fontScale > 1.3
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)
  const [value, setValue] = useState<ProfessionalRegistration>({ ...emptyRegistration })
  const [password, setPassword] = useState('')
  const [visiblePassword, setVisiblePassword] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState<'draft' | 'continue' | null>(null)
  const [readingFiles, setReadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(!authenticated)
  const [restored, setRestored] = useState(false)
  const loadedAccount = useRef<string | null>(null)
  const types = useQuery({ queryKey: ['professional-types-public'], queryFn: getPublicProfessionalTypes, retry: false })
  const registration = useQuery({ queryKey: ['professional-registration', userId], queryFn: getProfessionalRegistration, enabled: authenticated, retry: false, refetchOnWindowFocus: false })

  useEffect(() => {
    if (authenticated) return
    let active = true
    void loadRegistrationDraft().then(draft => {
      if (active && draft) {
        const { registered_email, ...data } = draft
        setValue(data)
        setRestored(true)
        if (registered_email) onRestoreRegisteredAccount?.(registered_email)
      }
    }).catch(() => {
      if (active) setDraftError('Não foi possível recuperar o rascunho. Tente abrir o cadastro novamente.')
    }).finally(() => { if (active) setInitializing(false) })
    return () => { active = false }
  }, [authenticated, onRestoreRegisteredAccount])

  useEffect(() => {
    if (!registration.data || loadedAccount.current === userId) return
    const { status: _status, ...data } = registration.data
    setValue(data)
    loadedAccount.current = userId ?? null
    setRestored(registration.data.status === 'draft')
  }, [registration.data, userId])

  useEffect(() => {
    if (registeredEmail) setValue(previous => ({ ...previous, email: registeredEmail }))
  }, [registeredEmail])

  const errors = registrationErrors(value, authenticated ? undefined : password)
  const activeTypes = new Set((types.data ?? []).map(type => type.id))
  const inactiveSelection = !!types.data && value.professional_type_ids.some(id => !activeTypes.has(id))
  const availableSelection = value.professional_type_ids.filter(id => activeTypes.has(id))
  const unavailable = types.isLoading || types.isError || !availableSelection.length || !!busy || readingFiles || initializing || (authenticated && (!registration.data || registration.isError))
  const fieldError = (field: keyof typeof errors) => attempted || touched.has(field) ? errors[field] : undefined
  const touch = (field: string) => setTouched(previous => new Set([...previous, field]))
  const update = <K extends keyof ProfessionalRegistration>(field: K, next: ProfessionalRegistration[K]) => setValue(previous => ({ ...previous, [field]: next }))
  const iconProps = { size: spacing.xl, color: colors.action.primary, strokeWidth: 1.8 }

  const save = async (mode: 'draft' | 'continue') => {
    if (busy || readingFiles) return
    setError(null)
    // A temporary catalog failure must not erase the selection from a saved draft.
    const payload = registrationPayload({ ...value, professional_type_ids: types.data ? availableSelection : value.professional_type_ids })
    if (mode === 'continue') {
      setAttempted(true)
      if (Object.keys(registrationErrors(payload, authenticated ? undefined : password)).length || types.isError || types.isLoading) return
    }
    setBusy(mode)
    try {
      if (mode === 'draft') {
        if (authenticated) {
          const saved = await saveProfessionalRegistration(payload, 'draft')
          queryClient.setQueryData(['professional-registration', userId], saved)
        } else {
          // Explicit fields only: a password can never enter the persisted draft.
          await saveRegistrationDraft({ ...payload, ...(registeredEmail ? { registered_email: registeredEmail } : {}) })
        }
        onExit()
      } else {
        await onContinue(payload, password)
        if (!authenticated) await clearRegistrationDraft().catch(() => {})
      }
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally { setBusy(null) }
  }

  const selectFiles = async () => {
    setFileError(null)
    try {
      // Invoke directly from the press for browser user-activation requirements.
      const result = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, multiple: true, copyToCacheDirectory: true, base64: false })
      if (result.canceled) return
      setReadingFiles(true)
      const accepted: RegistrationAttachment[] = []
      const failures: string[] = []
      for (const asset of result.assets) {
        try {
          if (value.attachments.length + accepted.length >= MAX_FILES) throw new Error('Você pode anexar até 5 arquivos. Remova um para selecionar outro.')
          accepted.push(await attachmentFromAsset(asset))
        } catch (caught) { failures.push(getErrorMessage(caught)) }
        finally { if (Platform.OS === 'web' && asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri) }
      }
      if (accepted.length) setValue(previous => ({ ...previous, attachments: [...previous.attachments, ...accepted] }))
      if (failures.length) setFileError(failures.join('\n'))
    } catch (caught) { setFileError(getErrorMessage(caught)) }
    finally { setReadingFiles(false) }
  }

  const awaitingAccount = authenticated && (registration.isLoading || (!loadedAccount.current && !!registration.data))
  const footer = (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: spacing.sm }}>
      {error ? <MGText accessibilityRole="alert" color="error" variant="bodySmall">{error}</MGText> : null}
      {busy ? <MGText accessibilityLiveRegion="polite" variant="bodySmall" color="secondary">{busy === 'draft' ? 'Salvando seu rascunho…' : 'Salvando seus dados…'}</MGText> : null}
      {!availableSelection.length && !types.isLoading && !types.isError ? <MGText variant="caption" color="secondary">Selecione pelo menos um tipo de atuação para continuar.</MGText> : null}
      <View style={{ flexDirection: stackedActions ? 'column' : 'row', gap: spacing.sm }}>
        <View style={stackedActions ? { width: '100%' } : { flex: 1 }}><MGButton label="Salvar e sair" variant="secondary" disabled={!!busy || readingFiles || initializing || awaitingAccount || (authenticated && registration.isError)} loading={busy === 'draft'} onPress={() => { void save('draft') }} /></View>
        <View style={stackedActions ? { width: '100%' } : { flex: 1 }}><MGButton label="Continuar" disabled={unavailable} loading={busy === 'continue'} iconRight={<ArrowRight size={spacing.lg} color={colors.onAction.primary} />} onPress={() => { void save('continue') }} /></View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.canvas }} edges={authenticated ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <MGScreen safeArea={false} scrollable loading={initializing || awaitingAccount} error={authenticated && registration.isError ? getErrorMessage(registration.error) : null} onRetry={() => { void registration.refetch() }} footer={footer} contentStyle={{ paddingHorizontal: compact ? spacing.base : spacing.xl }}>
          <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.base }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <MGIconButton accessibilityLabel="Voltar" disabled={!!busy} icon={<ArrowLeft color={colors.action.primary} size={spacing.xl} />} onPress={onBack} style={{ minWidth: spacing.huge, minHeight: spacing.huge }} />
              <MGText variant={compact ? 'heading3' : 'heading1'} style={{ flex: 1 }}>Cadastro profissional</MGText>
            </View>
            <RegistrationProgress />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, gap: spacing.sm }}>
                <MGText variant={compact ? 'heading2' : 'display'}>Vamos conhecer você melhor!</MGText>
                <MGText color="secondary" variant={compact ? 'bodySmall' : 'body'}>Preencha seus dados profissionais para que possamos validar seu perfil.</MGText>
              </View>
              <Image source={require('../../assets/registration/mascot.png')} accessible={false} style={{ width: compact ? 92 : 144, height: compact ? 120 : 160, resizeMode: 'contain' }} />
            </View>
            {restored ? <MGText accessibilityLiveRegion="polite" variant="bodySmall" color="info">Rascunho recuperado. Continue de onde parou.</MGText> : null}
            {registeredEmail ? <MGText accessibilityLiveRegion="polite" variant="bodySmall" color="info">Sua conta já foi criada para {registeredEmail}. Use a senha cadastrada e toque em Continuar para salvar os dados atuais e abrir os serviços.</MGText> : null}
            {draftError ? <MGText accessibilityRole="alert" variant="bodySmall" color="error">{draftError}</MGText> : null}
            <View style={{ padding: compact ? spacing.base : spacing.xl, gap: spacing.sm, borderRadius: radius.xxl, backgroundColor: colors.surface.default, ...elevation.low }}>
              <FieldRow icon={<UserRound {...iconProps} />}><MGTextField required label="Nome completo" placeholder="Digite seu nome completo" value={value.name} maxLength={150} autoComplete="name" autoCapitalize="words" editable={!busy} onChangeText={next => update('name', next)} onBlur={() => touch('name')} error={fieldError('name')} /></FieldRow>
              <FieldRow icon={<IdCard {...iconProps} />}><MGTextField required label="CPF / CNPJ" placeholder="Digite seu CPF ou CNPJ" value={value.document} maxLength={18} keyboardType="number-pad" editable={!busy} onChangeText={next => update('document', next)} onBlur={() => touch('document')} error={fieldError('document')} /></FieldRow>
              <FieldRow icon={<Phone {...iconProps} />}><MGTextField required label="Telefone" placeholder="(11) 91234-5678" value={value.phone_number} maxLength={20} autoComplete="tel" keyboardType="phone-pad" editable={!busy} onChangeText={next => update('phone_number', next)} onBlur={() => touch('phone_number')} error={fieldError('phone_number')} /></FieldRow>
              <FieldRow icon={<Mail {...iconProps} />}><MGTextField required label="E-mail" placeholder="seuemail@exemplo.com" value={value.email} autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!authenticated && !registeredEmail && !busy} onChangeText={next => update('email', next)} onBlur={() => touch('email')} error={fieldError('email')} helperText={authenticated || registeredEmail ? 'E-mail de acesso da sua conta.' : undefined} /></FieldRow>
              <FieldRow icon={<PawPrint {...iconProps} />}><View><MGTextField required label="Experiência" placeholder="Conte há quanto tempo trabalha na área, seus principais serviços e diferenciais." value={value.experience} maxLength={500} multiline textAlignVertical="top" style={{ minHeight: 108, paddingVertical: spacing.md }} editable={!busy} onChangeText={next => update('experience', next)} onBlur={() => touch('experience')} error={fieldError('experience')} compact /><MGText variant="caption" color="secondary" style={{ alignSelf: 'flex-end', marginTop: spacing.xs, marginBottom: spacing.base }}>{value.experience.length}/500</MGText></View></FieldRow>
              <FieldRow icon={<Award {...iconProps} />}><View><MGTextField required label="Certificações" placeholder="Liste seus cursos, formações ou certificações relevantes." value={value.certifications} maxLength={500} multiline textAlignVertical="top" style={{ minHeight: 108, paddingVertical: spacing.md }} editable={!busy} onChangeText={next => update('certifications', next)} onBlur={() => touch('certifications')} error={fieldError('certifications')} compact /><MGText variant="caption" color="secondary" style={{ alignSelf: 'flex-end', marginTop: spacing.xs, marginBottom: spacing.base }}>{value.certifications.length}/500</MGText></View></FieldRow>
              <View style={{ gap: spacing.md, marginBottom: spacing.base }}>
                <MGText variant="title">Tipos de atuação *</MGText>
                <MGText variant="bodySmall" color="secondary">Selecione um ou mais tipos em que você atua.</MGText>
                {types.isLoading ? <View accessibilityLabel="Carregando tipos de atuação" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.action.secondary} /><MGText variant="bodySmall" color="secondary">Carregando tipos de atuação…</MGText></View> : types.isError ? <View style={{ gap: spacing.sm }}><MGText accessibilityRole="alert" color="error" variant="bodySmall">Não foi possível carregar os tipos de atuação.</MGText><MGButton label="Tentar novamente" variant="secondary" loading={types.isFetching} onPress={() => { void types.refetch() }} /></View> : !types.data?.length ? <MGText variant="bodySmall" color="secondary">Nenhum tipo de atuação disponível no momento. Tente novamente mais tarde.</MGText> : (
                  <View style={{ gap: spacing.sm }}>{types.data.map(type => {
                    const selected = value.professional_type_ids.includes(type.id)
                    return <Pressable key={type.id} accessibilityRole="checkbox" accessibilityLabel={type.name} aria-checked={selected} aria-disabled={!!busy} accessibilityState={{ checked: selected, disabled: !!busy }} disabled={!!busy} onPress={() => update('professional_type_ids', selected ? value.professional_type_ids.filter(id => id !== type.id) : [...value.professional_type_ids, type.id])} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: spacing.huge, padding: spacing.md, borderWidth: 1, borderColor: selected ? colors.action.primary : colors.border.strong, borderRadius: radius.md, backgroundColor: pressed || selected ? colors.surface.pinkSubtle : colors.surface.default })}><View style={{ width: spacing.xl, height: spacing.xl, borderWidth: 1, borderColor: selected ? colors.action.primary : colors.border.strong, borderRadius: radius.xs, backgroundColor: selected ? colors.action.primary : colors.surface.default, alignItems: 'center', justifyContent: 'center' }}>{selected ? <Check color={colors.onAction.primary} size={spacing.base} /> : null}</View><MGText variant="label" style={{ flex: 1 }}>{type.name}</MGText></Pressable>
                  })}</View>
                )}
                {inactiveSelection ? <MGText variant="bodySmall" color="warning">Um tipo salvo ficou indisponível. Escolha entre os tipos ativos; os indisponíveis serão retirados ao salvar.</MGText> : null}
                {fieldError('professional_type_ids') ? <MGText variant="caption" color="error">{fieldError('professional_type_ids')}</MGText> : null}
              </View>
              <View style={{ padding: spacing.base, gap: spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.action.secondary, borderRadius: radius.md, backgroundColor: colors.surface.tealSubtle }}>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}><FileUp size={spacing.xxl} color={colors.action.secondary} /><View style={{ flex: 1, gap: spacing.xs }}><MGText variant="title">Anexar evidências</MGText><MGText variant="bodySmall" color="secondary">Envie certificados, diplomas ou outros comprovantes da sua experiência.</MGText><MGText variant="caption" color="secondary">JPG, PNG ou PDF · até 10 MB por arquivo · máximo de 5 arquivos</MGText></View></View>
                <MGButton label="Selecionar arquivos" variant="teal" disabled={!!busy || readingFiles || value.attachments.length >= MAX_FILES} loading={readingFiles} onPress={() => { void selectFiles() }} />
                {readingFiles ? <MGText accessibilityLiveRegion="polite" variant="bodySmall" color="info">Lendo os arquivos selecionados…</MGText> : null}
                {value.attachments.map((attachment, index) => <View key={attachment.id ?? `${index}-${attachment.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><View style={{ flex: 1 }}><MGText variant="bodySmall" style={{ flexShrink: 1 }}>{attachment.name}</MGText><MGText variant="caption" color="secondary">{(attachment.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB</MGText></View><MGIconButton accessibilityLabel={`Remover ${attachment.name}`} disabled={!!busy || readingFiles} onPress={() => update('attachments', value.attachments.filter((_, itemIndex) => itemIndex !== index))} icon={<Trash2 color={colors.feedback.error} size={spacing.lg} />} style={{ minWidth: spacing.huge, minHeight: spacing.huge }} /></View>)}
                {fileError ? <MGText accessibilityRole="alert" color="error" variant="bodySmall">{fileError}</MGText> : null}
              </View>
              {!authenticated ? <View style={{ marginTop: spacing.lg }}><FieldRow icon={<LockKeyhole {...iconProps} />}><View><MGTextField required label="Senha" value={password} autoCapitalize="none" autoCorrect={false} autoComplete={registeredEmail ? 'current-password' : 'new-password'} textContentType={registeredEmail ? 'password' : 'newPassword'} secureTextEntry={!visiblePassword} editable={!busy} onChangeText={setPassword} onBlur={() => touch('password')} error={fieldError('password')} helperText={registeredEmail ? 'Use a senha definida ao criar esta conta. Ela não é salva no rascunho.' : '8 ou mais caracteres, com maiúscula, minúscula, número e símbolo. A senha não é salva no rascunho.'} /><MGButton label={visiblePassword ? 'Ocultar senha' : 'Mostrar senha'} variant="tertiary" fullWidth={false} disabled={!!busy} onPress={() => setVisiblePassword(previous => !previous)} /></View></FieldRow></View> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.action.secondary, backgroundColor: colors.surface.tealSubtle }}><ShieldCheck size={spacing.xxl} color={colors.action.secondary} /><View style={{ flex: 1, gap: spacing.xs }}><MGText variant="title" color="info">Validação feita por pessoas reais</MGText><MGText variant="bodySmall" color="secondary">Seus dados e certificações serão analisados pela nossa equipe. Continuar não torna seu perfil verificado.</MGText></View></View>
            <MGText variant="caption" color="secondary">* Campos obrigatórios. Você pode salvar um rascunho e terminar depois.</MGText>
            {onLogin ? <MGButton label="Já tem uma conta? Entrar" variant="tertiary" fullWidth={false} disabled={!!busy} onPress={onLogin} style={{ alignSelf: 'center' }} /> : null}
          </View>
        </MGScreen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

