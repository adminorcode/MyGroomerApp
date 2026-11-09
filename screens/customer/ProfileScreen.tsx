import { AppAlert } from '../../utils/alert'
import { Pressable, StyleSheet, View } from 'react-native'
import { ChevronRight, IdCard, LogOut, LucideIcon, MapPin, PawPrint, Store } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { ProfileStackParamList } from '../../navigation/types'
import { useAuthStore } from '../../store/authStore'
import { MGAvatar, MGCard, MGScreen, MGText } from '../../design-system/components'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { radius, spacing } from '../../design-system/tokens'

type ProfileScreenNavigationProps = StackNavigationProp<ProfileStackParamList, 'Profile'>

type Props = {
  navigation: ProfileScreenNavigationProps
}

type MenuItemProps = {
  label: string
  description?: string
  icon?: LucideIcon
  iconBackground?: string
  iconColor?: string
  onPress: () => void
}

function MenuItem({ label, description, icon: Icon, iconBackground, iconColor, onPress }: MenuItemProps) {
  const { colors } = useMGTheme()

  return (
    <MGCard onPress={onPress} accessibilityLabel={label} style={styles.menuCard}>
      <View style={styles.menuRow}>
        {Icon ? (
          <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
            <Icon size={20} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.menuText}>
          <MGText variant="title">{label}</MGText>
          {description ? (
            <MGText variant="bodySmall" color="secondary">
              {description}
            </MGText>
          ) : null}
        </View>
        <ChevronRight size={20} color={colors.text.secondary} />
      </View>
    </MGCard>
  )
}

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useMGTheme()
  const { logout, user } = useAuthStore()

  // R8 + R2/R3: o papel autenticado define a cor do avatar, da etiqueta e dos ícones do menu.
  const isProvider = user?.role === 'provider'
  const roleTone = isProvider ? 'teal' : 'pink'
  const roleSurface = isProvider ? colors.surface.tealSubtle : colors.surface.pinkSubtle
  const roleIconBackground = isProvider ? colors.surface.tealSubtle : colors.surface.pinkSubtle
  const roleIconColor = isProvider ? colors.brand.teal : colors.action.primaryText

  const handleLogout = () => {
    AppAlert.alert(
      'Sair',
      'Tem certeza de que quer sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ],
    )
  }

  return (
    <MGScreen scrollable contentStyle={{ paddingBottom: spacing.lg }}>
      <View style={styles.header}>
        <MGText variant="heading2" accessibilityRole="header">
          Perfil
        </MGText>
        <MGText variant="bodySmall" color="secondary">
          Gerencie sua conta
        </MGText>
      </View>

      <View style={styles.profileSection}>
        <MGAvatar name={user?.name ?? '?'} size={88} tone={roleTone} />

        <MGText variant="heading3" style={styles.centerText}>
          {user?.name ?? 'Usuário desconhecido'}
        </MGText>
        <MGText variant="bodySmall" color="secondary" style={styles.centerText}>
          {user?.email}
        </MGText>

        {user?.role && (
          <View style={[styles.rolePill, { backgroundColor: roleSurface }]}>
            <MGText variant="label" style={styles.centerText}>
              {user.role === 'provider' ? 'Profissional' : user.role === 'customer' ? 'Tutor' : 'Administrador'}
            </MGText>
          </View>
        )}
      </View>

      {user?.role === 'provider' && (
        <MenuItem
          label="Perfil público"
          description="Veja e edite o que o tutor encontra na busca"
          icon={IdCard}
          iconBackground={roleIconBackground}
          iconColor={roleIconColor}
          onPress={() => navigation.navigate('PublicProfile')}
        />
      )}

      {user?.role === 'customer' && (
        <MenuItem
          label="Meus pets"
          description="Cadastre e reutilize os pets nos agendamentos"
          icon={PawPrint}
          iconBackground={roleIconBackground}
          iconColor={roleIconColor}
          onPress={() => navigation.navigate('Pets')}
        />
      )}

      {user?.role === 'customer' && (
        <MenuItem
          label="Endereços"
          description="Casa, trabalho e outros locais de atendimento"
          icon={MapPin}
          iconBackground={roleIconBackground}
          iconColor={roleIconColor}
          onPress={() => navigation.navigate('Addresses')}
        />
      )}

      {user?.role !== 'provider' && (
        <MenuItem
          label="Quero ser groomer"
          description="Ofereça seus serviços e acompanhe os rendimentos"
          icon={Store}
          iconBackground={colors.surface.pinkSubtle}
          iconColor={colors.action.primaryText}
          onPress={() => navigation.navigate('BecomeAProvider')}
        />
      )}

      {__DEV__ ? (
        <MenuItem
          label="Design System"
          description="Showcase de componentes (somente desenvolvimento)"
          onPress={() => navigation.navigate('DesignSystemShowcase')}
        />
      ) : null}

      <View style={styles.spacer} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sair"
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: colors.feedback.error, backgroundColor: colors.surface.default },
          pressed && styles.pressed,
        ]}
      >
        <LogOut size={20} color={colors.feedback.error} />
        <MGText variant="button" color="error">
          Sair
        </MGText>
      </Pressable>
    </MGScreen>
  )
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  rolePill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  menuCard: {
    marginTop: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: spacing.xs,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 52,
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
})
