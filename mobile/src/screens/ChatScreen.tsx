import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import api from '../services/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  '계약서에서 자동갱신 조항이란?',
  '손해배상 한도 조항 설명해줘',
  '부당한 위약금 조항을 찾는 법',
  '계약 해지 절차가 궁금해요',
]

export default function ChatScreen() {
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: '안녕하세요! 계약서 관련 궁금한 점을 물어보세요.\n\n계약 조항 해석, 위험 조항 설명, 법적 의미 등 AI가 도와드립니다.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const flatRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/chat', {
        message: msg,
        history,
      })
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response ?? data.message ?? '응답을 받지 못했습니다.',
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.bubbleInner, isUser ? styles.bubbleInnerUser : styles.bubbleInnerAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View style={styles.headerAI}>
          <Text style={styles.headerAIText}>AI</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>AI 챗봇</Text>
          <Text style={styles.headerSub}>계약서 질문 · 조항 해석</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={loading ? (
          <View style={styles.typingRow}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>AI</Text>
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>답변 생성 중...</Text>
            </View>
          </View>
        ) : null}
      />

      {/* 빠른 질문 */}
      {messages.length === 1 && (
        <View style={styles.quickWrap}>
          <Text style={styles.quickTitle}>빠른 질문</Text>
          <View style={styles.quickChips}>
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => sendMessage(q)}>
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="계약서 관련 질문을 입력하세요"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.navBg,
  },
  headerAI: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerAIText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  bubbleUser: { flexDirection: 'row-reverse' },
  bubbleAI: { alignItems: 'flex-start' },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bubbleInner: {
    maxWidth: '78%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
  },
  bubbleInnerUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleInnerAI: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  typingText: { color: colors.textMuted, fontSize: 13 },
  quickWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  quickTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  quickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderAccent,
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
  },
  quickChipText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.navBg,
  },
  textInput: {
    flex: 1, backgroundColor: colors.bgInput, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 16,
    color: colors.text, fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
