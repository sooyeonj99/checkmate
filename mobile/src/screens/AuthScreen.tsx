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
      const { data } = await api.post('/auth/login', { email, password })
      await onLogin(data.access_token, data.user)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? '로그인에 실패했습니다.'
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
  const [step, setStep] = useState<'type' | 'info'>('type')
  const [userType, setUserType] = useState<'personal' | 'enterprise'>('personal')
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
      await api.post('/auth/register', { username, email, password, user_type: userType })
      const { data } = await api.post('/auth/login', { email, password })
      await onLogin(data.access_token, data.user)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? '회원가입에 실패했습니다.'
      Alert.alert('회원가입 실패', msg)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'type') {
    return (
      <View style={styles.form}>
        <Text style={styles.typeTitle}>계정 유형을 선택하세요</Text>
        <Text style={styles.typeSub}>서비스 이용 목적에 맞는 유형을 선택해주세요</Text>

        <TouchableOpacity
          style={[styles.typeCard, userType === 'personal' && styles.typeCardActive]}
          onPress={() => setUserType('personal')}
        >
          <Text style={styles.typeCardIcon}>👤</Text>
          <View style={styles.typeCardContent}>
            <Text style={[styles.typeCardTitle, userType === 'personal' && styles.typeCardTitleActive]}>개인 사용자</Text>
            <Text style={styles.typeCardDesc}>계약서 분석 · 저장 관리 · AI 챗봇</Text>
          </View>
          <View style={[styles.typeRadio, userType === 'personal' && styles.typeRadioActive]}>
            {userType === 'personal' && <View style={styles.typeRadioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeCard, userType === 'enterprise' && styles.typeCardActive]}
          onPress={() => setUserType('enterprise')}
        >
          <Text style={styles.typeCardIcon}>🏢</Text>
          <View style={styles.typeCardContent}>
            <Text style={[styles.typeCardTitle, userType === 'enterprise' && styles.typeCardTitleActive]}>기업/법인</Text>
            <Text style={styles.typeCardDesc}>팀 관리 · 대량 분석 · 리포트 다운로드</Text>
          </View>
          <View style={[styles.typeRadio, userType === 'enterprise' && styles.typeRadioActive]}>
            {userType === 'enterprise' && <View style={styles.typeRadioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={() => setStep('info')}>
          <Text style={styles.submitText}>다음 →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <TouchableOpacity onPress={() => setStep('type')} style={styles.backTypeBtn}>
        <Text style={styles.backTypeText}>← 유형 변경</Text>
      </TouchableOpacity>
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
  typeTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  typeSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border,
    padding: 16, marginBottom: 10, gap: 12,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.04)' },
  typeCardIcon: { fontSize: 28 },
  typeCardContent: { flex: 1 },
  typeCardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  typeCardTitleActive: { color: colors.primary },
  typeCardDesc: { color: colors.textMuted, fontSize: 12 },
  typeRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  typeRadioActive: { borderColor: colors.primary },
  typeRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  backTypeBtn: { marginBottom: 12 },
  backTypeText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
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
