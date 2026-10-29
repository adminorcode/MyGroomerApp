import { AppAlert } from '../../utils/alert'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, LogOut, Store } from 'lucide-react-native'
import { StackNavigationProp } from '@react-navigation/stack'
import { CustomerTabParamList, ProfileStackParamList } from '../../navigation/types'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'

type ProfileScreenNavigationProps = StackNavigationProp<ProfileStackParamList, 'Profile'>

type Props = {
  navigation: ProfileScreenNavigationProps
}

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { logout, user } = useAuthStore()

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

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <ScreenContainer>
      <ScreenHeader title='Perfil' description='Gerencie sua conta' />

      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: colors.selectionSoft }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
        </View>

        <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? 'Usuário desconhecido'}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>

        {user?.role && (
          <View style={[styles.rolePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.roleText, { color: colors.textSecondary }]}>{user.role === 'provider' ? 'Groomer' : user.role === 'customer' ? 'Tutor' : 'Administrador'}</Text>
          </View>
        )}
      </View>

      {user?.role !== 'provider' && (
        <Pressable
          onPress={() => navigation.navigate('BecomeAProvider')}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.selectionSoft }]}>
            <Store size={20} color={colors.primary} />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Quero ser groomer</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Ofereça seus serviços e acompanhe os rendimentos
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </Pressable>
      )}

      <View style={styles.spacer} />

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: colors.error },
          pressed && styles.pressed,
        ]}
      >
        <LogOut size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Sair</Text>
      </Pressable>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.xxl,
    fontFamily: fonts.semibold,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
  },
  email: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  rolePill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
    textTransform: 'capitalize',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
  },
  actionSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
})

