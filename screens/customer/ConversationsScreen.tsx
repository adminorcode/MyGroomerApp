import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, Image } from 'react-native'
import { CompositeNavigationProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { borderRadius, fonts, spacing, typography } from '../../constants/theme'
import ScreenContainer from '../../components/shared/ScreenContainer'
import ScreenHeader from '../../components/shared/ScreenHeader'
import { useTheme } from '../../context/ThemeContext'
import { useGetConversations } from '../../hooks/useConversations'
import { useAuthStore } from '../../store/authStore'
import { ConversationListItem } from '../../types/conversation.types'
import { MessagesStackParamList, RootParamList } from '../../navigation/types'

type ConversationsScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MessagesStackParamList, 'Conversations'>,
  StackNavigationProp<RootParamList>
>

type Props = {
  navigation: ConversationsScreenNavigationProp
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isSameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ConversationsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const {user} = useAuthStore()
  const { data: conversations, isLoading, isError } = useGetConversations()

  const renderConversation = ({ item }: { item: ConversationListItem }) => {
    const isCustomer = item.customer_id === user?.id
    const otherName = (isCustomer ? item.provider_name : item.customer_name) ?? 'Desconhecido'
    const otherProfile = isCustomer ? item.provider_profile : item.customer_profile

    return (
      <Pressable
        onPress={() => navigation.navigate('Chat', { conversationId: item.id, otherName })}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {otherProfile ? (
          <Image source={{ uri: otherProfile }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.selectionSoft }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {otherName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          <View style={[styles.previewContainer]}>
            <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.last_message ?? 'Nenhuma mensagem ainda'}
            </Text>
            
              { item.unread_count > 0 &&
                (<Text style={{color:'white', backgroundColor:colors.primary, paddingHorizontal:6, borderRadius:999}}>
                {item.unread_count}
                </Text>)
              }
          </View>
        </View>
      </Pressable>
    )
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Mensagens" description={user?.role === 'provider' ? 'Converse com tutores e groomers' : 'Converse com os groomers'} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: colors.error }]}>
            Não foi possível carregar as conversas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderConversation}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Nenhuma conversa ainda. Comece pelo agendamento.
              </Text>
            </View>
          }
          keyExtractor={(item) => item.id}
        />
      )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
  },
  time: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.regular,
  },
  preview: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    width:200
  },
  previewContainer:{
    flexDirection:'row',
    display:'flex',
    justifyContent:'space-between'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  message: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
})
