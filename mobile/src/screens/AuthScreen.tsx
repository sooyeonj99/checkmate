import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { colors } from '../theme/colors'

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const { login } = useAuth()

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoCheck}>✓</Text>
          </View>
          <Text style={styles.logoText}>CHECKMATE</Text>
        </View>
        <Text style={styles.subtitle}>AI 계약서 분석 서비스</Text>

        {/* Tab */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
            onPress={() => setTab('login')}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'signup' && styles.tabBtnActive]}
            onPress={() => setTab('signup')}
          >
            <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>회원가입</Text>
          </TouchableOpacity>
        </View>

        {tab === 'login'
          ? <LoginForm onLogin={login} />
          : <SignupForm onLogin={login} />
        }
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function LoginForm({ onLogin }: { onLogin: (token: string, user: any) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      await onLogin(data.access_token, data.user)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '로그인에 실패했습니다.'
      Alert.alert('로그인 실패', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>이메일</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일 주소"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>비밀번호</Text>
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>로그인</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function SignupForm({ onLogin }: { onLogin: (token: string, user: any) => Promise<void> }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!username || !email || !password) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.')
      return
    }
    if (password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/signup', { username, email, password })
      // 가입 후 자동 로그인
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      await onLogin(data.access_token, data.user)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '회원가입에 실패했습니다.'
      Alert.alert('회원가입 실패', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>사용자 이름</Text>
      <TextInput
        style={styles.input}
        placeholder="사용자 이름"
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Text style={styles.label}>이메일</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일 주소"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>비밀번호</Text>
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (8자 이상)"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>회원가입</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  logoCheck: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  subtitle: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginBottom: 36 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  form: {},
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
