import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { CompositeNavigationProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { MGAvatar, MGCard, MGErrorState, MGScreen, MGText } from '../../design-system/components'
import MGArtwork from '../../design-system/components/MGArtwork'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { radius, spacing } from '../../design-system/tokens'
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
  const { colors } = useMGTheme()
  const { user } = useAuthStore()
  const { data: conversations, isLoading, isError, refetch } = useGetConversations()
  const description = user?.role === 'provider' ? 'Converse com os tutores' : 'Converse com os profissionais'

  const renderConversation = ({ item }: { item: ConversationListItem }) => {
    const isCustomer = item.customer_id === user?.id
    const otherName = (isCustomer ? item.provider_name : item.customer_name) ?? 'Desconhecido'
    const otherProfile = isCustomer ? item.provider_profile : item.customer_profile

    return (
      <MGCard
        accessibilityLabel={`Conversa com ${otherName}`}
        onPress={() => navigation.navigate('Chat', { conversationId: item.id, otherName })}
        style={styles.row}
      >
        {/* R8: o interlocutor profissional usa avatar teal; o tutor, rosa. */}
        <MGAvatar name={otherName} uri={otherProfile} size={48} tone={isCustomer ? 'teal' : 'pink'} />

        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <MGText variant="title" numberOfLines={1} style={styles.name}>
              {otherName}
            </MGText>
            <MGText variant="caption" color="secondary">
              {formatTime(item.last_message_at)}
            </MGText>
          </View>

          <View style={styles.previewContainer}>
            <MGText variant="bodySmall" color="secondary" numberOfLines={1} style={styles.preview}>
              {item.last_message ?? 'Nenhuma mensagem ainda'}
            </MGText>
            {item.unread_count > 0 && (
              <View style={[styles.unread, { backgroundColor: colors.action.primary }]}>
                <MGText variant="label" color="inverse">
                  {item.unread_count}
                </MGText>
              </View>
            )}
          </View>
        </View>
      </MGCard>
    )
  }

  return (
    <MGScreen
      header="teal"
      headerSlot={
        <View style={styles.headerSlot}>
          <MGText variant="heading2" color="inverse" accessibilityRole="header">
            Mensagens
          </MGText>
          <MGText variant="bodySmall" color="inverse">
            {description}
          </MGText>
        </View>
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator accessibilityLabel="Carregando conversas" size="large" color={colors.action.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MGErrorState message="Não foi possível carregar as conversas." onRetry={() => refetch()} />
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
              <MGText variant="body" color="secondary" style={styles.message}>
                Nenhuma conversa ainda. Comece pelo agendamento.
              </MGText>
            </View>
          }
          ListFooterComponent={user?.role === 'provider' && (conversations?.length ?? 0) <= 3 ? <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.base }}><MGArtwork name="puppy" width={112} /><MGArtwork name="cat" width={100} /></View> : null}
          keyExtractor={(item) => item.id}
        />
      )}
    </MGScreen>
  )
}

const styles = StyleSheet.create({
  headerSlot: {
    gap: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    minWidth: 0,
  },
  unread: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  message: {
    textAlign: 'center',
  },
})
