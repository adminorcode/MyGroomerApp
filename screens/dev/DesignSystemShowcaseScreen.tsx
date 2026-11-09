import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import {
  MGAvatar,
  MGBadge,
  MGButton,
  MGCard,
  MGChip,
  MGDivider,
  MGEmptyState,
  MGErrorState,
  MGIcon,
  MGIconButton,
  MGScreen,
  MGText,
  MGTextField,
} from '../../design-system/components'
import {
  AgendaAppointmentCard,
  BookingStatusBadge,
  BookingSummary,
  GroomerSearchCard,
  OnboardingStepper,
  PetCard,
  ServiceEditorCard,
  TimeSlotPicker,
} from '../../design-system/patterns'
import { BookingStatus } from '../../types/booking.types'
import { Pet } from '../../types/pet.types'
import { ProfileStackParamList } from '../../navigation/types'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import MGArtwork from '../../design-system/components/MGArtwork'

const SAMPLE_PET: Pet = {
  id: 'showcase-pet',
  owner_id: 'showcase',
  name: 'Luna',
  species: 'dog',
  breed: 'SRD',
  size: 'medium',
  age_years: 3,
  notes: null,
  photo_url: null,
  allergies: null,
  medications: null,
  health_conditions: null,
  vaccination_up_to_date: null,
  behavior: null,
  special_care: null,
}

const SAMPLE_ROWS = [
  { label: 'Pet', value: 'Luna' },
  { label: 'Serviço', value: 'Banho e tosa' },
  { label: 'Groomer', value: 'Marina' },
]

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'DesignSystemShowcase'>
}

export default function DesignSystemShowcaseScreen({ navigation }: Props) {
  const { spacing, colors, radius } = useMGTheme()
  const [chipOn, setChipOn] = useState(true)
  const [field, setField] = useState('')

  return (
    <MGScreen scrollable>
      <View style={{ paddingTop: spacing.base, gap: spacing.base, paddingBottom: spacing.xxxl }}>
        <MGIconButton
          accessibilityLabel="Voltar"
          icon={<MGIcon name="arrow-left" />}
          onPress={() => navigation.goBack()}
          style={{ alignSelf: 'flex-start' }}
        />

        <MGText variant="heading1">Design System</MGText>
        <MGText variant="body" color="secondary">
          Showcase de desenvolvimento — componentes fundamentais v1.0
        </MGText>

        <MGDivider />

        <MGText variant="heading3">Tipografia</MGText>
        <MGText variant="display">Display</MGText>
        <MGText variant="heading2">Heading 2</MGText>
        <MGText variant="body">Corpo de texto padrão</MGText>
        <MGText variant="label">Rótulo</MGText>
        <MGText variant="numeric">R$ 120</MGText>
        {/* CMP-01: eyebrow (caixa-alta, teal sobre canvas) e preço em destaque (priceLarge, teal sobre canvas). */}
        <MGText variant="eyebrow" color="teal">Exemplo</MGText>
        <MGText variant="priceLarge" color="teal">R$ 89</MGText>
        <MGText variant="caption" color="secondary">
          Caption secundário
        </MGText>

        <MGDivider />

        <MGText variant="heading3">Botões</MGText>
        <MGButton label="Primário" onPress={() => undefined} />
        <MGButton label="Secundário" variant="secondary" onPress={() => undefined} />
        <MGButton label="Terciário" variant="tertiary" onPress={() => undefined} />
        <MGButton label="Teal" variant="teal" onPress={() => undefined} />
        <MGButton label="Destrutivo" variant="destructive" onPress={() => undefined} />
        <MGButton label="Carregando" loading onPress={() => undefined} />
        <MGButton label="Desabilitado" disabled onPress={() => undefined} />

        <MGDivider />

        <MGText variant="heading3">Campo</MGText>
        <MGTextField
          label="Nome do pet"
          value={field}
          onChangeText={setField}
          placeholder="Ex.: Luna"
          helperText="Use o nome pelo qual o groomer deve chamar o pet"
        />
        <MGTextField label="Com erro" value="" error="Informe um valor válido" onChangeText={() => undefined} />

        <MGDivider />

        <MGText variant="heading3">Card, badge e chip</MGText>
        <MGCard>
          <MGText variant="title">Card padrão</MGText>
          <MGText variant="bodySmall" color="secondary">
            Superfície branca com raio lg
          </MGText>
        </MGCard>
        {/* CMP-04: destaque rosa (raio 20) e teal (tonalidade tealSubtle, texto text.primary). */}
        <MGCard variant="pink">
          <MGText variant="title">Card destaque</MGText>
        </MGCard>
        <MGCard variant="teal">
          <MGText variant="title">Card destaque</MGText>
        </MGCard>
        <View style={styles.row}>
          <MGBadge label="Pendente" tone="pending" />
          <MGBadge label="Confirmado" tone="confirmed" />
          <MGBadge label="Erro" tone="error" />
        </View>
        <View style={styles.row}>
          <MGChip label="Filtro" selected={chipOn} onPress={() => setChipOn((v) => !v)} />
          <MGChip label="Desligado" selected={false} onPress={() => undefined} />
          <MGChip label="Desabilitado" disabled />
        </View>

        <MGDivider />

        <MGText variant="heading3">Avatar e ícone</MGText>
        <View style={styles.row}>
          <MGAvatar name="Ana Tutor" kind="person" />
          <MGAvatar name="Luna" kind="pet" />
          {/* CMP-11: profissional em avatar teal sólido com texto inverso. */}
          <MGAvatar name="Marina" kind="person" tone="teal" />
          <MGIcon name="scissors" />
          <MGIcon name="paw-print" />
        </View>

        <MGDivider />

        <MGText variant="heading3">Estados</MGText>
        <MGEmptyState
          title="Nenhum agendamento"
          illustration={<MGArtwork name="professional" width={96} />}
          description="Quando houver pedidos, eles aparecem aqui."
          actionLabel="Buscar groomer"
          onAction={() => undefined}
        />
        <MGErrorState message="Não foi possível carregar os dados." onRetry={() => undefined} />

        <MGText variant="heading3">Cores e superfícies</MGText>
        <View style={styles.row}>
          {[
            { name: 'Rosa', color: colors.brand.pink },
            { name: 'Teal', color: colors.brand.teal },
            { name: 'Ação', color: colors.action.primary },
            { name: 'Fundo', color: colors.surface.canvas },
          ].map(({ name, color }) => <View key={name} style={{ gap: spacing.xs }}><View style={{ width: 56, height: 40, backgroundColor: color, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default }} /><MGText variant="caption">{name}</MGText></View>)}
        </View>

        <MGDivider />

        <MGText variant="heading3">Padrões de domínio</MGText>
        <OnboardingStepper
          currentStepId="services"
          steps={[
            { id: 'profile', label: 'Cadastro' },
            { id: 'services', label: 'Serviços' },
            { id: 'area', label: 'Local' },
            { id: 'availability', label: 'Agenda' },
            { id: 'review', label: 'Revisão' },
          ]}
        />
        <PetCard pet={SAMPLE_PET} selected onEdit={() => undefined} />
        <GroomerSearchCard
          name="Marina Groomer"
          priceLabel="A partir de R$ 89"
          coverageLabel="Até 8 km"
          ratingLabel="4,8"
          onPress={() => undefined}
        />
        <TimeSlotPicker
          dateTimeLabel="qui., 30 de out. · 14:30"
          onPressDateTime={() => undefined}
          helperText="Slots da API entram aqui quando disponíveis"
        />
        <BookingSummary
          rows={SAMPLE_ROWS}
          totalLabel="Total estimado"
          totalValue="R$ 120,00"
        />
        {/* CMP-08 / R7: bilhete em dois blocos com recorte; total em priceLarge. */}
        <BookingSummary
          ticket
          rows={SAMPLE_ROWS}
          totalLabel="Total estimado"
          totalValue="R$ 120,00"
        />
        <View style={styles.row}>
          <BookingStatusBadge status={BookingStatus.PENDING_CONFIRMATION} />
          <BookingStatusBadge status={BookingStatus.CONFIRMED} />
        </View>
        <AgendaAppointmentCard
          service_name="Banho e tosa"
          provider_name="Marina"
          scheduled_at={new Date().toISOString()}
          customer_location="Av. Paulista, 1000"
          booking_status={BookingStatus.CONFIRMED}
          price={120}
          showChevron
          onPress={() => undefined}
        />
        <ServiceEditorCard
          name="Banho completo"
          durationLabel="90 min"
          prices={{ small: 'R$ 80', medium: 'R$ 100', large: 'R$ 130' }}
          onEdit={() => undefined}
        />
      </View>
    </MGScreen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
})
