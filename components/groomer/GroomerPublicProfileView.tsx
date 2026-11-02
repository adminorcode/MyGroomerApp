import { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { MGEmptyState, MGIcon, MGText } from '../../design-system/components'
import { GroomerProfileHeader } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ProfileGallery from './ProfileGallery'
import { useAuthorizedImage } from '../../hooks/useAuthorizedImage'
import { formatMoney } from '../../utils/formatMoney'
import { areaRadiusLabel, profileRatingLabel, scheduleDays, scheduleText, weekdayLabel } from '../../utils/publicProfile'
import { PublicProfile, PublicProfileScheduleDay, PublicProfileService } from '../../types/provider.types'

type Props = {
  profile: PublicProfile
  mode: 'booking' | 'preview'
  selectedServiceId?: string | null
  onSelectService?: (id: string) => void
}

export default function GroomerPublicProfileView({ profile, mode, selectedServiceId, onSelectService }: Props) {
  const { colors, spacing, radius } = useMGTheme()
  const uploadedPhoto = useAuthorizedImage(profile.photo_id ? `/providers/public-photo/${profile.provider_id}` : null)
  const photoUrl = uploadedPhoto ?? profile.photo_url ?? null
  const days = scheduleDays(profile.schedule)
  const description = profile.attendance_rules?.trim() ? profile.attendance_rules : null
  const services = profile.services ?? []

  return (
    <View style={{ gap: spacing.lg }}>
      <GroomerProfileHeader
        name={profile.name}
        photoUrl={photoUrl}
        verified={profile.is_verified === true}
        ratingLabel={profileRatingLabel(profile.average_rating, profile.review_count)}
        specialties={services.map(service => service.name)}
      />

      <Section icon="paw-print" title="Regras de atendimento">
        <MGText variant="body" color={description ? 'primary' : 'secondary'}>
          {description ?? 'Este profissional ainda não publicou regras de atendimento.'}
        </MGText>
      </Section>

      <Section icon="map-pin" title="Área de atendimento">
        {profile.area ? (
          <View style={{ gap: spacing.xxs }}>
            <MGText variant="title">{areaRadiusLabel(profile.area.radius_km)}</MGText>
            <MGText variant="body" color="secondary">{profile.area.address}</MGText>
          </View>
        ) : (
          <MGText variant="body" color="secondary">Área de atendimento ainda não informada.</MGText>
        )}
      </Section>

      <Section icon="scissors" title="Serviços disponíveis">
        {services.length === 0 ? (
          <MGEmptyState
            title="Nenhum serviço disponível"
            description="Este profissional não tem serviços ativos para agendar."
          />
        ) : mode === 'booking' ? (
          <>
            <View accessibilityRole="radiogroup" accessibilityLabel="Serviços disponíveis">
              {services.map(service => (
                <ServiceOption
                  key={service.id}
                  service={service}
                  selected={service.id === selectedServiceId}
                  onSelect={onSelectService}
                />
              ))}
            </View>
            {!selectedServiceId ? (
              <MGText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
                Selecione um serviço para continuar.
              </MGText>
            ) : null}
          </>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {services.map(service => (
              <View
                key={service.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  minHeight: 48,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.default,
                }}
              >
                <MGText variant="title" style={{ flex: 1 }}>{service.name}</MGText>
                <MGText variant="body" color="brand" style={{ fontWeight: '700' }}>
                  A partir de {formatMoney(service.price)}
                </MGText>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section icon="clock-3" title="Horários de atendimento">
        {days.length === 0 ? (
          <MGText variant="body" color="secondary">Nenhum dia de atendimento publicado.</MGText>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {days.map(day => (
              <ScheduleDay key={day.weekday} day={day} />
            ))}
          </View>
        )}
      </Section>

      <Section icon="calendar-days" title="Fotos">
        <ProfileGallery
          photoIds={(profile.gallery ?? []).map(photo => photo.id)}
          emptyTitle="Nenhuma foto publicada."
        />
      </Section>
    </View>
  )
}

function Section({ icon, title, children }: {
  icon: 'paw-print' | 'map-pin' | 'scissors' | 'clock-3' | 'calendar-days'
  title: string
  children: ReactNode
}) {
  const { colors, spacing, radius } = useMGTheme()
  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border.default,
        backgroundColor: colors.surface.default,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <MGIcon name={icon} size={20} color={colors.action.primary} />
        <MGText variant="heading3" style={{ flex: 1 }}>{title}</MGText>
      </View>
      {children}
    </View>
  )
}

function ScheduleDay({ day }: { day: PublicProfileScheduleDay }) {
  const { colors, spacing, radius } = useMGTheme()
  return (
    <View
      accessible
      accessibilityLabel={`${weekdayLabel(day.weekday)}, ${scheduleText(day)}`}
      style={{
        minWidth: 84,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        backgroundColor: colors.surface.tealSubtle,
        gap: 2,
      }}
    >
      <MGText variant="label">{weekdayLabel(day.weekday)}</MGText>
      <MGText variant="caption" color="secondary">{scheduleText(day)}</MGText>
    </View>
  )
}

function ServiceOption({ service, selected, onSelect }: {
  service: PublicProfileService
  selected: boolean
  onSelect?: (id: string) => void
}) {
  const { colors, spacing, radius, fonts } = useMGTheme()
  const price = `A partir de ${formatMoney(service.price)}`
  const label = selected ? `${service.name}, selecionado, ${price}` : `${service.name}, ${price}`

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onSelect?.(service.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.action.primary : colors.border.default,
        backgroundColor: selected ? colors.surface.pinkSubtle : colors.surface.default,
        gap: spacing.sm,
      }}
    >
      <MGText variant="title" style={{ flex: 1 }}>{service.name}</MGText>
      <MGText variant="body" color="brand" style={{ fontFamily: fonts.bold }}>{price}</MGText>
    </Pressable>
  )
}
