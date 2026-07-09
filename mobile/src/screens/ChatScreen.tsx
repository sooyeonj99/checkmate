import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { lightColors, darkColors } from '../theme/colors'
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
  const { isDark } = useTheme()
  const c = isDark ? darkColors : lightColors
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
        content: data.reply ?? data.response ?? data.message ?? '응답을 받지 못했습니다.',
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.navBg }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>AI</Text>
        </View>
        <View>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>AI 챗봇</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>계약서 질문 · 조항 해석</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isUser = item.role === 'user'
          return (
            <View style={{ flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: 12, gap: 8, alignItems: 'flex-start' }}>
              {!isUser && (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>AI</Text>
                </View>
              )}
              <View style={{ maxWidth: '78%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, ...(isUser ? { backgroundColor: c.primary, borderBottomRightRadius: 4 } : { backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 }) }}>
                <Text style={{ color: isUser ? '#fff' : c.text, fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
              </View>
            </View>
          )
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListFooterComponent={loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>AI</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14 }}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={{ color: c.textMuted, fontSize: 13 }}>답변 생성 중...</Text>
            </View>
          </View>
        ) : null}
      />

      {/* 빠른 질문 */}
      {messages.length === 1 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>빠른 질문</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity key={q} style={{ backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.borderAccent, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }} onPress={() => sendMessage(q)}>
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 입력창 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom > 0 ? insets.bottom : 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.navBg }}>
        <TextInput
          style={{ flex: 1, backgroundColor: c.bgInput, borderRadius: 20, borderWidth: 1, borderColor: c.border, paddingVertical: 10, paddingHorizontal: 16, color: c.text, fontSize: 14, maxHeight: 100 }}
          value={input}
          onChangeText={setInput}
          placeholder="계약서 관련 질문을 입력하세요"
          placeholderTextColor={c.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={{ backgroundColor: !input.trim() || loading ? c.border : c.primary, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 }}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
