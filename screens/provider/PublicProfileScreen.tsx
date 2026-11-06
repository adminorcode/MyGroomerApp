import { ReactNode, useCallback, useRef, useState } from 'react'
import MGArtwork from '../../design-system/components/MGArtwork'
import { ActivityIndicator, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useFocusEffect } from '@react-navigation/native'
import {
  MGButton,
  MGCard,
  MGEmptyState,
  MGErrorState,
  MGIcon,
  MGIconName,
  MGScreen,
  MGText,
  MGTextField,
} from '../../design-system/components'
import { GroomerProfileHeader } from '../../design-system/patterns'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import ProfileGallery from '../../components/groomer/ProfileGallery'
import ScreenHeader from '../../components/shared/ScreenHeader'
import {
  useAddOwnGalleryPhoto,
  useGetOwnPublicProfile,
  useRemoveOwnGalleryPhoto,
  useRemoveOwnPublicPhoto,
  useSaveOwnPublicDescription,
  useSaveOwnPublicPhoto,
} from '../../hooks/useProviders'
import { useAuthorizedImage } from '../../hooks/useAuthorizedImage'
import { ProfileStackParamList } from '../../navigation/types'
import { getErrorMessage } from '../../utils/error'
import { formatMoney } from '../../utils/formatMoney'
import { areaRadiusLabel, profileRatingLabel, scheduleDays, scheduleText, weekdayLabel } from '../../utils/publicProfile'
import { MAX_GALLERY_PHOTOS, MAX_PUBLIC_PHOTO_BYTES, pickPublicPhoto } from './publicProfilePhoto'
import { PublicProfileScheduleDay } from '../../types/provider.types'

const DESCRIPTION_LIMIT = 1000

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'PublicProfile'>
}

export default function PublicProfileScreen({ navigation }: Props) {
  const { colors, spacing, radius, fonts } = useMGTheme()
  const profileQuery = useGetOwnPublicProfile()
  const profile = profileQuery.data
  const saveDescription = useSaveOwnPublicDescription()
  const savePhoto = useSaveOwnPublicPhoto()
  const removePhoto = useRemoveOwnPublicPhoto()
  const addGalleryPhoto = useAddOwnGalleryPhoto()
  const removeGalleryPhoto = useRemoveOwnGalleryPhoto()

  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null)

  const refetchRef = useRef(profileQuery.refetch)
  refetchRef.current = profileQuery.refetch

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current()
    }, []),
  )

  const headerPhoto = useAuthorizedImage(profile?.photo_id ? `/providers/public-photo/${profile.provider_id}` : null)
  const photoUri = headerPhoto ?? profile?.photo_url ?? null
  const loading = profileQuery.isLoading || (profileQuery.isFetching && !profile)
  const waitingPhoto = savePhoto.isPending || removePhoto.isPending
  const waitingGallery = addGalleryPhoto.isPending

  const startDescription = () => {
    setDescriptionDraft(profile?.attendance_rules ?? '')
    setDescriptionError(null)
    setEditingDescription(true)
  }

  const publishDescription = async () => {
    if (saveDescription.isPending) return
    setDescriptionError(null)
    try {
      await saveDescription.mutateAsync(descriptionDraft.trim())
      setEditingDescription(false)
    } catch (error) {
      setDescriptionError(getErrorMessage(error))
    }
  }

  const choosePhoto = async () => {
    setPhotoError(null)
    try {
      const photo = await pickPublicPhoto()
      if (!photo) return
      await savePhoto.mutateAsync(photo)
      setEditingPhoto(false)
    } catch (error) {
      setPhotoError(getErrorMessage(error))
    }
  }

  const clearPhoto = async () => {
    setPhotoError(null)
    try {
      await removePhoto.mutateAsync()
      setEditingPhoto(false)
    } catch (error) {
      setPhotoError(getErrorMessage(error))
    }
  }

  const addPhotos = async () => {
    setGalleryError(null)
    try {
      const photo = await pickPublicPhoto()
      if (!photo) return
      await addGalleryPhoto.mutateAsync(photo)
    } catch (error) {
      setGalleryError(getErrorMessage(error))
    }
  }

  const removeGallery = async (photoId: string) => {
    setGalleryError(null)
    setRemovingPhotoId(photoId)
    try {
      await removeGalleryPhoto.mutateAsync(photoId)
    } catch (error) {
      setGalleryError(getErrorMessage(error))
    } finally {
      setRemovingPhotoId(null)
    }
  }

  return (
    <MGScreen safeArea={false} scrollable>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <ScreenHeader title="Perfil público" description="O que o tutor vê na busca" showBackButton onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl }} accessibilityLabel="Carregando perfil">
          <ActivityIndicator size="large" color={colors.action.primary} />
          <MGText variant="body">Carregando perfil</MGText>
        </View>
      ) : profileQuery.isError || !profile ? (
        <MGErrorState
          message={getErrorMessage(profileQuery.error) || 'Não foi possível carregar este perfil.'}
          onRetry={() => { void profileQuery.refetch() }}
        />
      ) : (
        <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
          <View
            style={{
              gap: spacing.md,
              padding: spacing.base,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border.default,
              backgroundColor: colors.surface.pinkSubtle,
              overflow: 'hidden',
            }}
          >
            <MGArtwork name="paw-decoration" width={80} height={96} style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, opacity: 0.55 }} />
            <GroomerProfileHeader
              name={profile.name}
              photoUrl={photoUri}
              verified={profile.is_verified === true}
              ratingLabel={profileRatingLabel(profile.average_rating, profile.review_count)}
              specialties={profile.services.map(service => service.name)}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <View style={{ flexGrow: 1, flexBasis: '45%' }}>
                <MGButton label="Editar perfil" variant="secondary" onPress={() => setEditingPhoto((current) => !current)} />
              </View>
              <View style={{ flexGrow: 1, flexBasis: '45%' }}>
                <MGButton label="Visualizar como tutor" onPress={() => navigation.navigate('PublicProfilePreview')} />
              </View>
            </View>
            {editingPhoto ? (
              <View style={{ gap: spacing.sm }}>
                <MGText variant="bodySmall" color="secondary">
                  A foto redonda aparece no cabeçalho do perfil público. JPG ou PNG, até 10 MB.
                </MGText>
                <MGButton
                  label="Escolher foto"
                  variant="secondary"
                  onPress={() => { void choosePhoto() }}
                  loading={savePhoto.isPending}
                  disabled={waitingPhoto}
                />
                {profile.photo_id ? (
                  <MGButton
                    label="Remover foto"
                    variant="destructive"
                    onPress={() => { void clearPhoto() }}
                    loading={removePhoto.isPending}
                    disabled={waitingPhoto}
                  />
                ) : null}
                {photoError ? (
                  <MGText variant="bodySmall" color="error" accessibilityRole="alert">{photoError}</MGText>
                ) : null}
                <MGButton
                  label="Cancelar"
                  variant="tertiary"
                  onPress={() => {
                    setEditingPhoto(false)
                    setPhotoError(null)
                  }}
                  disabled={waitingPhoto}
                />
              </View>
            ) : null}
          </View>

          <Section
            icon="paw-print"
            title="Descrição profissional"
            actionLabel={editingDescription ? undefined : 'Editar descrição'}
            onAction={editingDescription ? undefined : startDescription}
          >
            {editingDescription ? (
              <View style={{ gap: spacing.sm }}>
                <MGTextField
                  label="Sua descrição"
                  value={descriptionDraft}
                  onChangeText={setDescriptionDraft}
                  multiline
                  numberOfLines={5}
                  maxLength={DESCRIPTION_LIMIT}
                  textAlignVertical="top"
                  style={{ minHeight: 132, paddingTop: spacing.md }}
                  helperText={`${descriptionDraft.length}/${DESCRIPTION_LIMIT} caracteres`}
                />
                {descriptionError ? (
                  <MGText variant="bodySmall" color="error" accessibilityRole="alert">{descriptionError}</MGText>
                ) : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <MGButton
                      label="Cancelar"
                      variant="secondary"
                      onPress={() => {
                        setEditingDescription(false)
                        setDescriptionError(null)
                      }}
                      disabled={saveDescription.isPending}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <MGButton
                      label="Salvar"
                      onPress={() => { void publishDescription() }}
                      loading={saveDescription.isPending}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <MGText variant="body" color={profile.attendance_rules?.trim() ? 'primary' : 'secondary'}>
                {profile.attendance_rules?.trim() ? profile.attendance_rules : 'Ainda não há descrição profissional.'}
              </MGText>
            )}
          </Section>

          <Section
            icon="map-pin"
            title="Área de atendimento"
            actionLabel="Editar área"
            onAction={() => navigation.navigate('ServiceLocation', { origin: 'profile' })}
          >
            {profile.area ? (
              <View style={{ gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface.tealSubtle }}>
                <MGText variant="title">{areaRadiusLabel(profile.area.radius_km)}</MGText>
                <MGText variant="body">{profile.area.address}</MGText>
              </View>
            ) : (
              <MGText variant="body" color="secondary">Área de atendimento ainda não informada.</MGText>
            )}
          </Section>

          <Section
            icon="scissors"
            title="Serviços e preços"
            actionLabel="Editar serviços"
            onAction={() => navigation.navigate('ServiceMenu', { origin: 'profile' })}
          >
            {profile.services.length === 0 ? (
              <MGEmptyState
                title="Nenhum serviço ativo"
                description="Ative um serviço para aparecer na busca do tutor."
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {profile.services.map(service => (
                  <View key={service.id} style={{ gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface.pinkSubtle }}>
                    <MGText variant="title">{service.name}</MGText>
                    <MGText variant="body" color="brand" style={{ fontFamily: fonts.bold }}>
                      A partir de {formatMoney(service.price)}
                    </MGText>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section
            icon="clock-3"
            title="Horários de atendimento"
            actionLabel="Editar horários"
            onAction={() => navigation.navigate('WeeklyAvailability', { origin: 'profile' })}
          >
            {scheduleDays(profile.schedule).length === 0 ? (
              <MGText variant="body" color="secondary">Nenhum dia de atendimento configurado.</MGText>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {scheduleDays(profile.schedule).map(day => (
                  <ScheduleDay key={day.weekday} day={day} />
                ))}
              </View>
            )}
          </Section>

          <Section icon="calendar-days" title="Fotos / Galeria">
            <ProfileGallery
              photoIds={(profile.gallery ?? []).map(photo => photo.id)}
              canAdd={profile.gallery?.length !== MAX_GALLERY_PHOTOS}
              addLabel="Adicionar fotos"
              adding={waitingGallery}
              onAdd={() => { void addPhotos() }}
              onRemove={(photoId) => { void removeGallery(photoId) }}
              removingId={removingPhotoId}
              emptyTitle="Nenhuma foto na galeria."
              emptyDescription={`Até ${MAX_GALLERY_PHOTOS} fotos, ${Math.round(MAX_PUBLIC_PHOTO_BYTES / (1024 * 1024))} MB cada.`}
            />
            {galleryError ? (
              <MGText variant="bodySmall" color="error" accessibilityRole="alert">{galleryError}</MGText>
            ) : null}
          </Section>
        </View>
      )}
      </View>
    </MGScreen>
  )
}

function Section({ icon, title, actionLabel, onAction, children }: {
  icon: MGIconName
  title: string
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
}) {
  const { colors, spacing } = useMGTheme()
  return (
    <MGCard>
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <MGIcon name={icon} size={20} color={colors.action.primary} />
        <MGText variant="heading3" style={{ flex: 1 }}>{title}</MGText>
        {actionLabel && onAction ? (
          <MGButton
            label="Editar"
            accessibilityLabel={actionLabel}
            variant="secondary"
            fullWidth={false}
            onPress={onAction}
            style={{ minHeight: 48, paddingHorizontal: spacing.md }}
          />
        ) : null}
      </View>
      {children}
    </View>
    </MGCard>
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
