import { ReactNode, useState } from 'react'
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { Bone, Cake, Dog, FileText, LucideIcon, MapPin, Phone } from 'lucide-react-native'
import { RouteProp } from '@react-navigation/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProviderRequestsStackParamList } from '../../navigation/types'
import {
  MGBadge,
  MGBadgeTone,
  MGButton,
  MGCard,
  MGEmptyState,
  MGErrorState,
  MGIcon,
  MGText,
  MGTextField,
} from '../../design-system/components'
import MGAvatar from '../../design-system/components/MGAvatar'
import { useRequestProfile, useSaveAnamnesisNote } from '../../hooks/useRequestProfile'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { petSizeLabel, petSpeciesLabel } from '../../types/pet.types'
import { RequestProfile } from '../../types/requestProfile.types'
import { formatMoney } from '../../utils/formatMoney'
import { formatDisplayPhone } from '../../utils/formatPhone'
import { getErrorMessage } from '../../utils/error'
import { requestDateLabel } from './requestsModel'

type Props = {
  navigation: StackNavigationProp<ProviderRequestsStackParamList, 'ProviderRequestProfile'>
  route: RouteProp<ProviderRequestsStackParamList, 'ProviderRequestProfile'>
}

const STATUS: Record<string, { label: string, tone: MGBadgeTone }> = {
  pending_confirmation: { label: 'Pendente', tone: 'pending' },
  confirmed: { label: 'Aceita', tone: 'confirmed' },
  en_route: { label: 'Em deslocamento', tone: 'info' },
  in_progress: { label: 'Em andamento', tone: 'info' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

function shown(value?: string | null) {
  const text = value?.trim()
  return text ? text : 'Não informado'
}

function previousLabel(count: number) {
  if (count <= 0) return 'Primeiro atendimento com você'
  if (count === 1) return '1 atendimento anterior com você'
  return `${count} atendimentos anteriores com você`
}

function vaccinationLabel(value: boolean | null | undefined) {
  if (value === true) return 'Em dia'
  if (value === false) return 'Não está em dia'
  return 'Não informado'
}

function formatAge(years?: number | null) {
  if (years == null || !Number.isFinite(years)) return 'Não informado'
  if (years === 1) return '1 ano'
  return `${years} anos`
}

type SectionProps = { icon: Parameters<typeof MGIcon>[0]['name'], title: string, iconColor?: string, children: ReactNode }

function ProfileSection({ icon, title, iconColor, children }: SectionProps) {
  const { colors, spacing } = useMGTheme()
  return (
    <View role="group" accessibilityLabel={title} style={{ marginBottom: spacing.md }}>
      <MGCard padding={spacing.md}>
        <View style={[styles.sectionHead, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <MGIcon name={icon} size={20} color={iconColor ?? colors.action.primary} />
          <MGText variant="title">{title}</MGText>
        </View>
        {children}
      </MGCard>
    </View>
  )
}

type FactProps = { icon: LucideIcon, label: string, value: string, iconColor?: string, style?: StyleProp<ViewStyle> }

function ProfileFact({ icon: Icon, label, value, iconColor, style }: FactProps) {
  const { colors, spacing } = useMGTheme()
  const missing = value === 'Não informado' || value === 'Não informada' || value === 'Nenhuma observação'
  return (
    <View style={[styles.fact, { gap: spacing.sm }, style]}>
      <Icon size={18} color={iconColor ?? colors.action.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <MGText variant="caption" color="secondary">{label}</MGText>
        <MGText variant="body" color={missing ? 'secondary' : 'primary'}>{value}</MGText>
      </View>
    </View>
  )
}

function AnamnesisLine({ label, value }: { label: string, value: string }) {
  const missing = value === 'Não informado'
  return (
    <View style={styles.lineBlock}>
      <MGText variant="caption" color="secondary">{label}</MGText>
      <MGText variant="body" color={missing ? 'secondary' : 'primary'}>{value}</MGText>
    </View>
  )
}

export default function ProviderRequestProfileScreen({ navigation, route }: Props) {
  const { bookingId } = route.params
  const { colors, spacing } = useMGTheme()
  const profile = useRequestProfile(bookingId)
  const saveNote = useSaveAnamnesisNote(bookingId)
  const [draft, setDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const header = (
    <View style={[styles.header, { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} hitSlop={8} style={styles.back}>
        <MGIcon name="arrow-left" size={24} color={colors.action.primary} />
      </Pressable>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <MGText variant="heading2" accessibilityRole="header">Ficha do atendimento</MGText>
        <MGText variant="bodySmall" color="secondary">Pet, tutor e cuidados para este atendimento</MGText>
      </View>
    </View>
  )

  const frame = (children: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: colors.surface.canvas, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720 }}>
        {header}
        {children}
      </View>
    </View>
  )

  if (profile.isLoading) {
    return frame(
      <View accessibilityRole="progressbar" accessibilityLabel="Carregando ficha" style={styles.centered}>
        <ActivityIndicator size="large" color={colors.action.primary} />
      </View>,
    )
  }

  if (profile.isError || !profile.data) {
    return frame(
      <View style={[styles.centered, { paddingHorizontal: spacing.lg }]}>
        <MGErrorState message="Não foi possível carregar a ficha." onRetry={() => { void profile.refetch() }} />
      </View>,
    )
  }

  const data = profile.data
  const pet = data.pet
  const serverNote = data.notes.find(item => item.booking_id === bookingId)?.note ?? ''
  const note = draft ?? serverNote
  const trimmed = note.trim()
  const noteError = !pet
    ? undefined
    : trimmed.length === 0
      ? 'Informe a nota.'
      : trimmed.length > 1000
        ? 'A nota deve ter no máximo 1000 caracteres.'
        : undefined
  const status = STATUS[data.booking.booking_status] ?? { label: data.booking.booking_status, tone: 'neutral' as MGBadgeTone }
  const petName = pet?.name?.trim() || 'Pet não informado'

  const submit = async () => {
    if (!pet || noteError || saveNote.isPending) return
    setSaveError(null)
    setSaved(false)
    try {
      await saveNote.mutateAsync(trimmed)
      setDraft(trimmed)
      setSaved(true)
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  return frame(
    <KeyboardAwareScrollView
      contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl }}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* CMP-04 / R2: bloco do pet em rosa suave; texto primário sobre pinkSubtle (R5). */}
      <MGCard variant="pink" padding={spacing.md} style={{ marginBottom: spacing.md }}>
        <View style={[styles.hero, { gap: spacing.md }]}>
          <View style={[styles.avatarRing, { backgroundColor: colors.surface.default }]}>
            <MGAvatar uri={pet?.photo_url} name={petName} kind="pet" size={72} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={styles.heroTitle}>
              <MGText variant="title" style={{ flex: 1 }}>{petName}</MGText>
              <MGBadge label={status.label} tone={status.tone} />
            </View>
            <MGText variant="bodySmall">Tutor: {data.customer.name.trim() || 'Tutor não informado'}</MGText>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="scissors" size={16} color={colors.action.primary} />
              <MGText variant="bodySmall" style={{ flex: 1 }}>{data.booking.service_name || 'Serviço'}</MGText>
            </View>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="calendar-days" size={16} color={colors.brand.teal} />
              <MGText variant="bodySmall" style={{ flex: 1 }}>{requestDateLabel(data.booking.scheduled_at)}</MGText>
            </View>
            <View style={[styles.line, { gap: spacing.sm }]}>
              <MGIcon name="map-pin" size={16} color={colors.brand.teal} />
              <MGText variant="bodySmall" style={{ flex: 1 }}>{shown(data.booking.customer_location)}</MGText>
            </View>
          </View>
        </View>
      </MGCard>

      <MGButton
        label="Ver agendamento"
        variant="secondary"
        onPress={() => navigation.navigate('ProviderBookingDetail', { bookingId })}
        style={{ marginBottom: spacing.md }}
      />

      <ProfileSection icon="paw-print" title="Dados do pet">
        {pet ? (
          <View style={[styles.grid, { gap: spacing.md }]}>
            <ProfileFact icon={Dog} label="Espécie" value={petSpeciesLabel(pet.species)} style={styles.factGridItem} />
            <ProfileFact icon={Dog} label="Porte" value={petSizeLabel(pet.size)} style={styles.factGridItem} />
            <ProfileFact icon={Bone} label="Raça" value={pet.breed.trim() || 'Não informada'} style={styles.factGridItem} />
            <ProfileFact icon={Cake} label="Idade" value={formatAge(pet.age_years)} style={styles.factGridItem} />
            <ProfileFact icon={FileText} label="Observações" value={pet.notes?.trim() || 'Nenhuma observação'} style={styles.factWide} />
          </View>
        ) : <MGText variant="body">Pet não informado</MGText>}
      </ProfileSection>

      <ProfileSection icon="badge-check" title="Dados do tutor" iconColor={colors.brand.teal}>
        <View style={[styles.twoColumns, { gap: spacing.md }]}>
          <View style={styles.column}>
            <ProfileFact icon={Phone} label="Telefone" value={data.customer.phone_number ? formatDisplayPhone(data.customer.phone_number) : 'Não informado'} />
          </View>
          <View style={styles.column}>
            <ProfileFact icon={MapPin} iconColor={colors.brand.teal} label="Endereço" value={shown(data.booking.customer_location)} />
          </View>
        </View>
        <MGText variant="body" style={{ marginTop: spacing.md }}>{previousLabel(data.customer.previous_bookings_with_provider)}</MGText>
      </ProfileSection>

      <ProfileSection icon="file-text" title="Anamnese">
        {data.anamnesis ? (
          <View style={{ gap: spacing.md }}>
            <AnamnesisLine label="Alergias" value={shown(data.anamnesis.allergies)} />
            <AnamnesisLine label="Medicamentos em uso" value={shown(data.anamnesis.medications)} />
            <AnamnesisLine label="Condições de saúde" value={shown(data.anamnesis.health_conditions)} />
            <AnamnesisLine label="Vacinação em dia" value={vaccinationLabel(data.anamnesis.vaccination_up_to_date)} />
            <AnamnesisLine label="Comportamento" value={shown(data.anamnesis.behavior)} />
            <AnamnesisLine label="Cuidados especiais" value={shown(data.anamnesis.special_care)} />
          </View>
        ) : <MGText variant="body">Pet não informado</MGText>}
      </ProfileSection>

      <ProfileSection icon="file-text" title="Suas notas">
        {pet ? (
          <View>
            <MGTextField
              label="Nota"
              accessibilityLabel="Nota"
              value={note}
              onChangeText={(value) => {
                setDraft(value)
                setSaved(false)
                setSaveError(null)
              }}
              multiline
              error={noteError}
              style={styles.noteInput}
            />
            <MGText variant="caption" color="secondary" style={{ marginBottom: spacing.sm }}>{`${note.length}/1000`}</MGText>
            {saveError ? (
              <MGText variant="bodySmall" color="error" accessibilityRole="alert" style={{ marginBottom: spacing.sm }}>{saveError}</MGText>
            ) : null}
            {saved ? (
              <MGText variant="bodySmall" color="success" accessibilityRole="alert" style={{ marginBottom: spacing.sm }}>Nota salva.</MGText>
            ) : null}
            <MGButton
              label="Salvar nota"
              onPress={() => { void submit() }}
              loading={saveNote.isPending}
              disabled={Boolean(noteError) || saveNote.isPending}
            />
            {data.notes.length === 0 ? (
              <MGEmptyState title="Você ainda não registrou notas deste pet." />
            ) : (
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                {data.notes.map(item => (
                  <View key={item.id} style={{ gap: spacing.xs }}>
                    <MGText variant="caption" color="secondary">{requestDateLabel(item.created_at)}</MGText>
                    <MGText variant="body">{item.note}</MGText>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <MGText variant="body">Pet não informado</MGText>
            <MGTextField
              label="Nota"
              accessibilityLabel="Nota"
              value=""
              editable={false}
              helperText="Este agendamento não tem pet para receber a nota."
            />
            <MGButton label="Salvar nota" disabled />
          </View>
        )}
      </ProfileSection>

      <ProfileSection icon="calendar-days" title="Histórico">
        {!pet ? (
          <MGText variant="body">Pet não informado</MGText>
        ) : data.history.length === 0 ? (
          <MGEmptyState title="Primeiro atendimento deste pet." />
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.history.map(item => (
              <View key={item.booking_id} style={{ gap: spacing.xs }}>
                <View style={[styles.heroTitle, { gap: spacing.sm }]}>
                  <MGText variant="body" style={{ flex: 1 }}>{requestDateLabel(item.completed_at)}</MGText>
                  {/* R6: "Você" identifica o próprio atendimento; não é status, então não usa a cor de pendência. */}
                  {item.own ? <MGBadge label="Você" tone="info" /> : null}
                </View>
                <MGText variant="body">{item.service_name}</MGText>
                <MGText variant="bodySmall" color="secondary">{item.provider_name}</MGText>
                {item.own && item.price != null ? <MGText variant="body">{formatMoney(item.price)}</MGText> : null}
              </View>
            ))}
          </View>
        )}
      </ProfileSection>
      <MGCard variant="teal">
        <MGText variant="bodySmall">As informações do pet ajudam você a oferecer um atendimento mais seguro e personalizado.</MGText>
      </MGCard>
    </KeyboardAwareScrollView>,
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarRing: { borderRadius: 999, padding: 3 },
  heroTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  twoColumns: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
  column: { flex: 1, minWidth: 140 },
  fact: { flexDirection: 'row', alignItems: 'flex-start' },
  factGridItem: { width: '48%', minWidth: 140 },
  factWide: { width: '100%' },
  lineBlock: { gap: 2 },
  noteInput: { minHeight: 120, textAlignVertical: 'top' },
})
