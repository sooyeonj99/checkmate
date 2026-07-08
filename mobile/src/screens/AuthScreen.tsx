import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { colors } from '../theme/colors'

type FieldStatus = 'idle' | 'checking' | 'available' | 'taken'

function StatusMsg({ status, takenMsg = '이미 사용 중입니다' }: { status: FieldStatus; takenMsg?: string }) {
  if (status === 'idle') return null
  const map: Record<Exclude<FieldStatus, 'idle'>, { color: string; text: string }> = {
    checking: { color: colors.textMuted, text: '확인 중...' },
    available: { color: '#16a34a', text: '사용 가능합니다' },
    taken: { color: '#dc2626', text: takenMsg },
  }
  const { color, text } = map[status]
  return <Text style={{ fontSize: 12, color, marginTop: 4, fontWeight: '700' }}>{text}</Text>
}

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
  const [forgotVisible, setForgotVisible] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

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

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { Alert.alert('오류', '이메일을 입력해주세요.'); return }
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() })
      setForgotVisible(false)
      Alert.alert('발송 완료', '비밀번호 재설정 링크를 이메일로 보냈습니다.\n이메일을 확인해주세요.')
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '이메일 발송에 실패했습니다.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <Modal visible={forgotVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>비밀번호 찾기</Text>
            <Text style={styles.modalSub}>가입한 이메일로 재설정 링크를 보내드립니다</Text>
            <TextInput
              style={styles.input}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="이메일 주소"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setForgotVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleForgotPassword} disabled={forgotLoading}>
                {forgotLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>발송</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
      <TouchableOpacity
        style={styles.forgotBtn}
        onPress={() => { setForgotEmail(''); setForgotVisible(true) }}
      >
        <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>로그인</Text>
        }
      </TouchableOpacity>
      <SocialButtons />
    </View>
  )
}

function SignupForm({ onLogin }: { onLogin: (token: string, user: any) => Promise<void> }) {
  const [step, setStep] = useState<'type' | 'info'>('type')
  const [userType, setUserType] = useState<'personal' | 'enterprise'>('personal')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [bizStatus, setBizStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [loading, setLoading] = useState(false)

  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle')
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle')
  const [phoneStatus, setPhoneStatus] = useState<FieldStatus>('idle')

  useEffect(() => {
    if (!username || username.length < 2) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username?value=${encodeURIComponent(username)}`)
        setUsernameStatus(res.data.available ? 'available' : 'taken')
      } catch { setUsernameStatus('idle') }
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  useEffect(() => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRe.test(email)) { setEmailStatus('idle'); return }
    setEmailStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-email?value=${encodeURIComponent(email)}`)
        setEmailStatus(res.data.available ? 'available' : 'taken')
      } catch { setEmailStatus('idle') }
    }, 500)
    return () => clearTimeout(timer)
  }, [email])

  useEffect(() => {
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 10) { setPhoneStatus('idle'); return }
    setPhoneStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-phone?value=${encodeURIComponent(digits)}`)
        setPhoneStatus(res.data.available ? 'available' : 'taken')
      } catch { setPhoneStatus('idle') }
    }, 500)
    return () => clearTimeout(timer)
  }, [phoneNumber])

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }

  const formatBizNum = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
  }

  const handleBizChange = async (val: string) => {
    const formatted = formatBizNum(val)
    setBusinessNumber(formatted)
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 10) {
      setBizStatus('checking')
      try {
        const res = await api.post('/business/check', { business_number: digits })
        const ok = ['active', 'checksum_only'].includes(res.data.status)
        setBizStatus(ok ? 'valid' : 'invalid')
      } catch {
        setBizStatus('invalid')
      }
    } else {
      setBizStatus('idle')
    }
  }

  const handleSubmit = async () => {
    if (!username || !email || !password) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.')
      return
    }
    if (password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (usernameStatus === 'taken') {
      Alert.alert('입력 오류', '이미 사용 중인 닉네임입니다.')
      return
    }
    if (emailStatus === 'taken') {
      Alert.alert('입력 오류', '이미 가입된 이메일입니다.')
      return
    }
    if (phoneStatus === 'taken') {
      Alert.alert('입력 오류', '이미 가입된 전화번호입니다.')
      return
    }
    if (userType === 'enterprise' && bizStatus !== 'valid') {
      Alert.alert('입력 오류', '유효한 사업자등록번호를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const phoneDigits = phoneNumber.replace(/\D/g, '')
      await api.post('/auth/register', {
        username, email, password, user_type: userType,
        business_number: userType === 'enterprise' ? businessNumber.replace(/\D/g, '') : undefined,
        phone_number: phoneDigits.length >= 10 ? phoneDigits : undefined,
      })
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
        style={[styles.input, usernameStatus === 'taken' && { borderColor: '#dc2626' }]}
        placeholder="사용자 이름"
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <StatusMsg status={usernameStatus} takenMsg="이미 사용 중인 닉네임입니다" />
      <Text style={styles.label}>이메일</Text>
      <TextInput
        style={[styles.input, emailStatus === 'taken' && { borderColor: '#dc2626' }]}
        placeholder="이메일 주소"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <StatusMsg status={emailStatus} takenMsg="이미 가입된 이메일입니다" />
      <Text style={styles.label}>전화번호 <Text style={{ fontSize: 12, color: colors.textMuted }}>(선택)</Text></Text>
      <TextInput
        style={[styles.input, phoneStatus === 'taken' && { borderColor: '#dc2626' }]}
        placeholder="010-0000-0000"
        placeholderTextColor={colors.textMuted}
        value={phoneNumber}
        onChangeText={(v) => setPhoneNumber(formatPhone(v))}
        keyboardType="phone-pad"
        maxLength={13}
      />
      <StatusMsg status={phoneStatus} takenMsg="이미 가입된 전화번호입니다" />
      <Text style={styles.label}>비밀번호</Text>
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (8자 이상)"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {userType === 'enterprise' && (
        <>
          <Text style={styles.label}>사업자등록번호 *</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[styles.input, {
                borderColor: bizStatus === 'valid' ? '#16a34a' : bizStatus === 'invalid' ? '#dc2626' : colors.border,
                paddingRight: 90,
              }]}
              placeholder="000-00-00000"
              placeholderTextColor={colors.textMuted}
              value={businessNumber}
              onChangeText={handleBizChange}
              keyboardType="numeric"
            />
            {bizStatus !== 'idle' && (
              <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                {bizStatus === 'checking'
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={{ fontSize: 12, fontWeight: '700', color: bizStatus === 'valid' ? '#16a34a' : '#dc2626' }}>
                      {bizStatus === 'valid' ? '✓ 확인됨' : '✗ 미확인'}
                    </Text>
                }
              </View>
            )}
          </View>
        </>
      )}
      <TouchableOpacity style={[styles.submitBtn, {
        opacity: (loading || usernameStatus === 'taken' || usernameStatus === 'checking'
          || emailStatus === 'taken' || emailStatus === 'checking'
          || phoneStatus === 'taken' || phoneStatus === 'checking'
          || (userType === 'enterprise' && bizStatus !== 'valid')) ? 0.5 : 1,
      }]} onPress={handleSubmit} disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'
        || emailStatus === 'taken' || emailStatus === 'checking'
        || phoneStatus === 'taken' || phoneStatus === 'checking'
        || (userType === 'enterprise' && bizStatus !== 'valid')}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>회원가입</Text>
        }
      </TouchableOpacity>
      <SocialButtons label="또는 소셜 계정으로 시작하기" />
    </View>
  )
}

/* ── 소셜 로그인 버튼 (준비중) ── */
function SocialButtons({ label = '또는 소셜 계정으로 계속하기' }: { label?: string }) {
  const handlePress = (service: string) => {
    Alert.alert(
      '준비중',
      `${service} 로그인은 현재 준비중입니다.\n빠른 시일 내에 제공될 예정입니다.`,
      [{ text: '확인', style: 'default' }]
    )
  }

  return (
    <View style={styles.socialWrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{label}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* 카카오 */}
      <TouchableOpacity
        style={styles.kakaoBtn}
        onPress={() => handlePress('카카오')}
        activeOpacity={0.85}
      >
        <View style={styles.socialBtnIcon}>
          {/* 카카오 말풍선 아이콘 */}
          <Text style={styles.kakaoBtnIcon}>💬</Text>
        </View>
        <Text style={styles.kakaoBtnText}>카카오로 계속하기</Text>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonPillText}>준비중</Text>
        </View>
      </TouchableOpacity>

      {/* 구글 */}
      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() => handlePress('Google')}
        activeOpacity={0.85}
      >
        <View style={styles.socialBtnIcon}>
          <Text style={styles.googleBtnIcon}>G</Text>
        </View>
        <Text style={styles.googleBtnText}>Google로 계속하기</Text>
        <View style={[styles.comingSoonPill, styles.comingSoonPillGoogle]}>
          <Text style={[styles.comingSoonPillText, styles.comingSoonPillTextGoogle]}>준비중</Text>
        </View>
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

  /* 소셜 버튼 */
  socialWrap: { marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, flexShrink: 0 },

  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 10, gap: 10,
  },
  socialBtnIcon: { width: 24, alignItems: 'center' },
  kakaoBtnIcon: { fontSize: 16 },
  kakaoBtnText: { flex: 1, color: '#3C1E1E', fontSize: 14, fontWeight: '700' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    gap: 10,
  },
  googleBtnIcon: { fontSize: 15, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },

  comingSoonPill: {
    backgroundColor: 'rgba(60,30,30,0.12)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  comingSoonPillText: { color: '#3C1E1E', fontSize: 10, fontWeight: '700' },
  comingSoonPillGoogle: { backgroundColor: 'rgba(37,99,235,0.1)' },
  comingSoonPillTextGoogle: { color: colors.primary },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  modalSaveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
