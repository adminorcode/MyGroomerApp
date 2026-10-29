import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/core'
import { useTheme } from '../../context/ThemeContext'
import { useSocket } from '../../context/SocketContext'
import { useAuthStore } from '../../store/authStore'
import { useUnreadStore } from '../../store/unreadStore'
import { fonts, layout, spacing, typography } from '../../constants/theme'
import { useGetConversationMessages, useGetConversations, useMarkConversationRead } from '../../hooks/useConversations'
import { Message } from '../../types/conversation.types'
import { RootParamList } from '../../navigation/types'
import ChatHeader from '../../components/chat/ChatHeader'
import ChatInputBar from '../../components/chat/ChatInputBar'
import MessageBubble from '../../components/chat/MessageBubble'
import ChatDateSeparator, { formatDateLabel } from '../../components/chat/ChatDateSeparator'

type ChatScreenNavigationProp = StackNavigationProp<RootParamList, 'Chat'>
type ChatScreenRouteProp = RouteProp<RootParamList, 'Chat'>

type Props = {
  navigation: ChatScreenNavigationProp
  route: ChatScreenRouteProp
}

type ListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message }

function buildListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = []
  let lastDate = ''
  const oldestFirst = [...messages].reverse()

  for (const message of oldestFirst) {
    const dateKey = new Date(message.created_at).toDateString()
    if (dateKey !== lastDate) {
      lastDate = dateKey
      items.push({ type: 'date', id: `date-${dateKey}`, label: formatDateLabel(message.created_at) })
    }
    items.push({ type: 'message', id: message.id, message })
  }

  return items.reverse()
}

const ChatScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme()
  const { socket, isConnected } = useSocket()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { otherName, conversationId } = route.params
  
  const { data: conversationMessages, isLoading, isError, hasNextPage, fetchNextPage } = useGetConversationMessages(conversationId)
  const [draft, setDraft] = useState('')
  const conversationClient = useGetConversations()

  const { mutate: markRead } = useMarkConversationRead()

  const historyMessages = conversationMessages ?? [] // server message history

  const [liveMessages, setLiveMessages] = useState<Message[]>([]) // socket messages

  useEffect(() => { setLiveMessages([]); setDraft('') }, [conversationId])

  useFocusEffect(
    useCallback(() => {
      const { setActiveConversationId, setHasUnreadMessages } = useUnreadStore.getState()
      setActiveConversationId(conversationId)
      setHasUnreadMessages(false)
      markRead(conversationId)
      return () => setActiveConversationId(null)
    }, [conversationId])
  )

  const messages = useMemo(()=>{
    const combined = [...liveMessages, ...historyMessages]
    const seen = new Set<string>()
    return combined.filter((m)=>{
      if(seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  }, [liveMessages, historyMessages])

  useEffect(() => {
    if (!socket || !conversationId) return

    socket.emit('join_conversation', {conversation_id:conversationId})

    const handleNewMessage = (message: Message) => {
      if (message.conversation_id !== conversationId) return
      setLiveMessages((prev) => [message, ...prev])
    }

    socket.on('new_message', handleNewMessage)
    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [socket, conversationId])

  const handleSend = () => {
    const content = draft.trim()
    if (!content || !socket || !isConnected) return

    socket.emit('send_message', { conversation_id: conversationId, content })
    // refetch conversation this message was sent in.
    conversationClient.refetch()
    setDraft('')
  }

  const listItems = useMemo(()=> buildListItems(messages), [messages])

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return <ChatDateSeparator label={item.label} />
    }
    const isOwn = item.message.sender_id === currentUserId
    return (
      <MessageBubble
        content={item.message.content}
        timestamp={item.message.created_at}
        isOwn={isOwn}
        isSeen={item.message.is_seen}
        isEdited={item.message.is_edited}
      />
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.headerWrapper}>
        <ChatHeader
          name={otherName ?? 'Chat'}
          onBack={() => navigation.goBack()}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior='padding'
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.sm : 0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={[styles.message, { color: colors.error }]}>
              Something went wrong while loading this conversation
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={listItems}
            onEndReached={() => { if (hasNextPage) fetchNextPage() }}
            onEndReachedThreshold={0.5}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.type === 'date' ? item.id : item.message.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.inputWrapper}>
          {!isConnected && <Text style={{ color: colors.textSecondary }}>Conectando ao chat...</Text>}
          <ChatInputBar value={draft} onChangeText={setDraft} onSend={handleSend} disabled={!isConnected} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: layout.screenPadding,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding - spacing.xs,
    paddingVertical: spacing.md,
  },
  inputWrapper: {
    paddingHorizontal: layout.screenPadding,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  message: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
})

export default ChatScreen
